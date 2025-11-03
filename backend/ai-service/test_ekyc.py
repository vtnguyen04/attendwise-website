#%%
from vietocr.tool.predictor import Predictor
from vietocr.tool.config import Cfg
from ultralytics import YOLO
import cv2
from PIL import Image
import matplotlib.pyplot as plt
import torch
import csv
import pandas as pd
import os
from IPython.display import display

config = Cfg.load_config_from_name('vgg_seq2seq')
config["weights"] = "weights/seq2seqocr.pth"
config['cnn']['pretrained'] = False
config['device'] = 'cuda:0'
#%%
recognitor = Predictor(config)
detector = YOLO("weights/best.pt")

#%%
def select_box(class_names, boxes, confs):
    attributes = {}
    count = 0
    for i, class_name in enumerate(class_names):
        if class_name in ['cccd', 'bhyt', 'gplx']:
            if 'type' not in attributes or confs[i] > confs[attributes['type'][1]]:
                attributes['type'] = (class_name, i)
        else:
    
            if class_name == "current_place":
                count += 1
                attributes[f'{class_name}{count}'] = (boxes[i], i)
            elif class_name not in attributes or confs[i] > confs[attributes[class_name][1]]:
                attributes[class_name] = (boxes[i], i)
    return attributes

def crop_img(img, attributes, padding):
    
    imgs = {}

    for class_name, value in attributes.items():
        if class_name == 'type':
            imgs['type'] = value[0]
        else:
            box = value[0]
        
            box[0] = box[0] - padding
            box[1] = box[1] - padding
            box[2] = box[2] + padding
            box[3] = box[3] + padding   
        
            x1, y1, x2, y2 = box
    
            crop_img = img[int(y1):int(y2), int(x1):int(x2)]
            crop_img_rgb = Image.fromarray(crop_img)
    
            imgs[class_name] = crop_img_rgb
        
    return imgs


def word_detection(img, detector, padding):
    
    detection = detector(img)
    
    class_indexes = detection[0].boxes.cls.cpu().numpy()
    class_names = [detector.names[int(class_index)] for class_index in class_indexes]
    boxes = detection[0].boxes.xyxy.cpu().numpy()
    confs = detection[0].boxes.conf.cpu().numpy()

    if len(boxes) > 0:
        y_coords = [box[1] for box in boxes]
        sorted_indices = sorted(range(len(y_coords)), key=lambda i: y_coords[i])
        boxes = [boxes[i] for i in sorted_indices]
        class_names = [class_names[i] for i in sorted_indices]
        confs = [confs[i] for i in sorted_indices]
    
    attributes = select_box(class_names, boxes, confs)
    
    imgs = crop_img(img, attributes, padding)

    return imgs, attributes


def word_recognition(imgs, recognitor):
    
    texts = {}
    
    for class_name, value in imgs.items():
        if class_name == 'type':
            texts[class_name] = value
        else:
            text = recognitor.predict(value)
            texts[class_name] = text
        
    return texts

def text_manipulation(raw_texts):
    import re

    # Danh sách các từ đúng chính tả cho origin_place và current_place
    origin_place_keywords = [
        "tỉnh", "thành phố", "huyện", "quận", "thị xã", "xã", "phường", "thị trấn"
    ]
    current_place_keywords = [
        "thôn", "ấp", "bản", "số nhà", "ngõ", "đường", "xóm", "tổ", "khu phố", "phố", "làng"
    ]

    def clean_place(text, keywords):
        # Chuẩn hóa chữ thường, loại bỏ dấu chấm dư thừa, strip khoảng trắng
        text = text.replace('.', '').strip()
        # Tách các từ, giữ lại các từ khóa đúng chính tả
        result = []
        for kw in keywords:
            # Tìm từ khóa đúng chính tả trong text (không phân biệt hoa thường)
            pattern = re.compile(r'\b' + re.escape(kw) + r'\b', re.IGNORECASE)
            if pattern.search(text):
                # Đảm bảo từ khóa đúng chính tả, viết đúng kiểu
                idx = pattern.search(text).start()
                # Lấy phần từ khóa và phần phía sau
                after_kw = text[idx:]
                # Cắt đến hết từ khóa + phần phía sau
                result.append(after_kw)
                break
        if result:
            return ', '.join(result)
        else:
            # Nếu không có từ khóa nào, trả về text đã loại dấu chấm
            return text

    texts = {}

    # Copy các trường không cần xử lý đặc biệt
    for class_name, text in raw_texts.items():
        if class_name not in [
            'current_place1', 'current_place2', 'origin_place1', 'origin_place2', 'iday', 'imonth', 'iyear', 'features', 'issue_date' 
        ]:
            texts[class_name] = text

    # Xử lý origin_place
    origin_place = ""
    if 'origin_place1' in raw_texts and 'origin_place2' in raw_texts:
        origin_place = f"{raw_texts['origin_place1']}, {raw_texts['origin_place2']}"
    elif 'origin_place1' in raw_texts:
        origin_place = raw_texts['origin_place1']
    elif 'origin_place2' in raw_texts:
        origin_place = raw_texts['origin_place2']
    if origin_place:
        # Loại bỏ dấu chấm, chuẩn hóa chính tả, lọc từ khóa
        origin_place = clean_place(origin_place, origin_place_keywords)
        texts['origin_place'] = origin_place

    # Xử lý current_place
    current_place = ""
    if 'current_place1' in raw_texts and 'current_place2' in raw_texts:
        current_place = f"{raw_texts['current_place1']} {raw_texts['current_place2']}"
    elif 'current_place1' in raw_texts:
        current_place = raw_texts['current_place1']
    elif 'current_place2' in raw_texts:
        current_place = raw_texts['current_place2']
    if current_place:
        # Loại bỏ dấu chấm, chuẩn hóa chính tả, lọc từ khóa
        current_place = clean_place(current_place, current_place_keywords)
        texts['current_place'] = current_place

    # Xử lý ngày cấp
    if 'iday' in raw_texts and 'imonth' in raw_texts and 'iyear' in raw_texts:
        texts['issue_date'] = f"{raw_texts['iday']}/{raw_texts['imonth']}/{raw_texts['iyear']}"

    # Đảm bảo expire_date, dob không có dấu chấm
    for date_field in ['expire_date', 'dob']:
        if date_field in texts:
            texts[date_field] = texts[date_field].replace('.', '').strip()

    # Đảm bảo id là 12 chữ số
    if 'id' in texts:
        id_value = re.sub(r'\D', '', texts['id'])  # chỉ lấy số
        if len(id_value) == 12:
            texts['id'] = id_value
        else:
            # Nếu không đủ 12 số, trả về chuỗi rỗng hoặc giữ nguyên (tùy yêu cầu)
            texts['id'] = id_value if len(id_value) == 12 else ""

    # Đảm bảo nationality là "Việt Nam"
    texts['nationality'] = "Việt Nam"

    return texts

def plot_result(img, attributes, padding):

    for class_name, value in attributes.items():
        if class_name != 'type':
            box = value[0]
            
            box[0] = box[0] - padding
            box[1] = box[1] - padding
            box[2] = box[2] + padding
            box[3] = box[3] + padding   
    
            x1, y1, x2, y2 = box
            x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
    
            img = cv2.rectangle(img, (x1, y1), (x2, y2), color=(255,0,0), thickness=2)
            (w, h), _ = cv2.getTextSize(class_name, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
            img = cv2.rectangle(img, (x1, y1 - 20), (x1 + w, y1), (255,255,0), -1)
            img = cv2.putText(img, class_name, (x1, y1 - 5),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,0,0), 1)

    plt.imshow(img)



def predict(recognitor, detector, input_path, plot=False, padding=2):

    img = cv2.cvtColor(cv2.imread(input_path), cv2.COLOR_BGR2RGB)

    imgs, attributes = word_detection(img, detector, padding)

    raw_texts = word_recognition(imgs, recognitor)

    texts = text_manipulation(raw_texts)

    if plot == True:
        plot_result(img, attributes, padding)

    return texts
#%%

test_img_paths = [os.path.join('image', name) for name in os.listdir('image')]
input_path = test_img_paths[0]

texts = predict(recognitor, detector, input_path, True)
texts
# %%

# %%

# %%
