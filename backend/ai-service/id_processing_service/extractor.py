import os
import re
import json
import cv2
import threading
import numpy as np
from PIL import Image, ImageEnhance
import torch

from ultralytics import YOLO  # Import YOLO
# from paddleocr import TextDetection # Removed, replaced by YOLO

from vietocr.tool.predictor import Predictor
from vietocr.tool.config import Cfg
from threading import Thread


class ThreadWithReturnValue(Thread):
    def __init__(
        self, group=None, target=None, name=None, args=(), kwargs={}, Verbose=None
    ):
        Thread.__init__(self, group, target, name, args, kwargs)
        self._return = None

    def run(self):
        if self._target is not None:
            self._return = self._target(*self._args, **self._kwargs)

    def join(self, *args):
        Thread.join(self, *args)
        return self._return


CURRENT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# Khởi tạo các biến global để tránh tải lại mô hình
yolo_detector = None  # New global for YOLO model
text_recognizer = None

# --- CẤU HÌNH CHO YOLO VÀ XỬ LÝ TEXT ---
# Ngưỡng độ tin cậy cho mỗi class. Đây là các ví dụ và cần được tinh chỉnh.
CLASS_CONFIDENCE_THRESHOLDS = {
    "current_place": 0.5,
    "dob": 0.6,
    "expire_date": 0.6,
    "features": 0.5,
    "finger_print": 0.7, 
    "gender": 0.6,
    "id": 0.7,
    "issue_date": 0.6,
    "name": 0.6,
    "nationality": 0.6,
    "origin_place": 0.5,
    "qr": 0.7,
}

# Các lớp có thể là đa dòng và cần nối chuỗi
MULTI_LINE_CLASSES = ["current_place", "origin_place", "features"]

# Các lớp đại diện cho vùng hình ảnh/khu vực, không phải văn bản để OCR
IMAGE_REGION_CLASSES = ["finger_print", "qr"]

# Ngưỡng độ tin cậy mặc định cho YOLO detections nếu không được chỉ định cụ thể cho mỗi class
DEFAULT_YOLO_CONF_THRESHOLD = 0.25

# --- DỮ LIỆU ĐỂ XÁC THỰC NÂNG CAO ---
VIETNAMESE_SURNAMES = {
    "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đoàn", "Đinh", "Lâm", "Trịnh", "Đào", "Mai", "Lương",
}

VIETNAMESE_PROVINCES = {
    "Hà Nội", "Hồ Chí Minh", "Hải Phòng", "Đà Nẵng", "Cần Thơ", "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước", "Bình Thuận", "Cà Mau", "Cao Bằng", "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Tĩnh", "Hải Dương", "Hậu Giang", "Hòa Bình", "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định", "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái",
}


class Extractor:
    def __init__(self):
        global yolo_detector, text_recognizer

        # --- 1. KHỞI TẠO CÁC MÔ HÌNH OCR & YOLO ---
        if text_recognizer is None:
            print(">>> Đang khởi tạo mô hình VietOCR (Text Recognition)...")
            config = Cfg.load_config_from_name("vgg_seq2seq")
            weights_path = os.path.join(CURRENT_DIR, "weights", "seq1seq.pth")
            if not os.path.exists(weights_path):
                raise FileNotFoundError(
                    f"Không tìm thấy file weights VietOCR tại: {weights_path}"
                )
            config["weights"] = weights_path
            config["cnn"]["pretrained"] = False
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            config["device"] = self.device
            text_recognizer = Predictor(config)
            print(f"✅ VietOCR đã sẵn sàng trên thiết bị {self.device}.")
        self.text_recognizer = text_recognizer

        if yolo_detector is None:
            print(">>> Đang khởi tạo mô hình YOLO (Object Detection)...")
            yolo_weights_path = os.path.join(CURRENT_DIR, "weights", "best.pt")
            if not os.path.exists(yolo_weights_path):
                raise FileNotFoundError(
                    f"Không tìm thấy file YOLO weights tại: {yolo_weights_path}"
                )
            yolo_detector = YOLO(yolo_weights_path)
            print("✅ YOLO (Object Detection) đã sẵn sàng.")
        self.yolo_detector = yolo_detector

    def check_image_quality(self, image):
        """Kiểm tra các vấn đề cơ bản về chất lượng ảnh trước khi xử lý."""
        # 1. Kiểm tra độ mờ (blur)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if laplacian_var < 60.0:  # Ngưỡng này có thể cần tinh chỉnh
            return (
                False,
                f"Ảnh có thể bị mờ (độ nét: {laplacian_var:.2f}). Vui lòng chụp lại.",
            )

        # 2. Kiểm tra độ lóa (glare)
        _, thresh = cv2.threshold(gray, 245, 255, cv2.THRESH_BINARY)
        glare_pixels = cv2.countNonZero(thresh)
        total_pixels = image.shape[0] * image.shape[1]
        glare_percentage = (glare_pixels / total_pixels) * 100
        if glare_percentage > 1:  # Nếu hơn 1% ảnh bị trắng xóa
            return (
                False,
                f"Ảnh bị lóa sáng ({glare_percentage:.2f}%). Vui lòng tránh nguồn sáng mạnh.",
            )

        return True, "Chất lượng ảnh tốt."

    def find_and_crop_id_card(self, image):
        print("\n>>> Bắt đầu tìm khung thẻ trong ảnh...")
        orig_image = image.copy()
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edged = cv2.Canny(blurred, 50, 150)
        contours, _ = cv2.findContours(
            edged.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE
        )
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]
        screen_contour = None
        for c in contours:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if len(approx) == 4:
                screen_contour = approx
                break
        if screen_contour is None:
            print(
                "❌ CẢNH BÁO: Không tìm thấy đường viền 4 cạnh. Sẽ xử lý toàn bộ ảnh."
            )
            return orig_image
        print("✅ Đã tìm thấy khung thẻ! Đang xoay và cắt...")
        points = screen_contour.reshape(4, 2)
        rect = np.zeros((4, 2), dtype="float32")
        s = points.sum(axis=1)
        rect[0] = points[np.argmin(s)]
        rect[2] = points[np.argmax(s)]
        diff = np.diff(points, axis=1)
        rect[1] = points[np.argmin(diff)]
        rect[3] = points[np.argmax(diff)]
        (tl, tr, br, bl) = rect
        widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
        widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
        maxWidth = max(int(widthA), int(widthB))
        heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
        heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[0]) ** 2))
        maxHeight = max(int(heightA), int(heightB))
        dst = np.array(
            [
                [0, 0],
                [maxWidth - 1, 0],
                [maxWidth - 1, maxHeight - 1],
                [0, maxHeight - 1],
            ],
            dtype="float32",
        )
        M = cv2.getPerspectiveTransform(rect, dst)
        warped = cv2.warpPerspective(orig_image, M, (maxWidth, maxHeight))
        return warped

    def Detection(self, frame):
        print(f"\n>>> Bắt đầu phát hiện các trường thông tin trên ảnh bằng YOLO...")
        
        # Chạy YOLO model
        results = self.yolo_detector.predict(source=frame, conf=DEFAULT_YOLO_CONF_THRESHOLD, verbose=False)
        
        detected_items_raw = []
        for r in results:
            boxes = r.boxes.cpu().numpy()
            for i, box in enumerate(boxes):
                conf = box.conf[0]
                cls = int(box.cls[0])
                class_name = self.yolo_detector.names[cls]
                xyxy = box.xyxy[0] # [x1, y1, x2, y2]
                
                # Chuyển đổi xyxy sang định dạng polygon 4 điểm (top-left, top-right, bottom-right, bottom-left)
                box_points = [
                    [xyxy[0], xyxy[1]], # Top-left
                    [xyxy[2], xyxy[1]], # Top-right
                    [xyxy[2], xyxy[3]], # Bottom-right
                    [xyxy[0], xyxy[3]]  # Bottom-left
                ]
                
                # Áp dụng ngưỡng độ tin cậy riêng cho từng class
                if conf >= CLASS_CONFIDENCE_THRESHOLDS.get(class_name, DEFAULT_YOLO_CONF_THRESHOLD):
                    detected_items_raw.append({
                        "box_points": box_points, 
                        "class_name": class_name, 
                        "confidence": conf
                    })
        
        # Nhóm các detections theo class name
        # Sử dụng dict để dễ dàng quản lý các detections cho mỗi class
        detections_by_class = {cls_name: [] for cls_name in self.yolo_detector.names.values()}
        for item in detected_items_raw:
            detections_by_class[item["class_name"]].append(item)

        final_detections_for_ocr = []
        
        for class_name, items in detections_by_class.items():
            if not items:
                continue

            if class_name in MULTI_LINE_CLASSES:
                # Đối với các class đa dòng, giữ lại tất cả các detections đã vượt qua kiểm tra độ tin cậy ban đầu
                # và sắp xếp chúng theo tọa độ Y của điểm trên cùng bên trái để nối chuỗi sau này
                sorted_items = sorted(items, key=lambda x: x["box_points"][0][1]) # Sắp xếp theo y của điểm top-left
                final_detections_for_ocr.extend(sorted_items)
            elif class_name in IMAGE_REGION_CLASSES:
                # Đối với các class hình ảnh, giữ lại tất cả các box đã phát hiện
                # (có thể có nhiều vân tay/mã QR nếu mô hình phát hiện thế)
                final_detections_for_ocr.extend(items)
            else:
                # Đối với các class chỉ nên xuất hiện một lần, chọn cái có độ tin cậy cao nhất
                best_item = max(items, key=lambda x: x["confidence"])
                final_detections_for_ocr.append(best_item)

        if final_detections_for_ocr:
            print(f"✅ Phát hiện được {len(final_detections_for_ocr)} trường thông tin hợp lệ.")
            # Debugging: In ra các class được phát hiện
            for det in final_detections_for_ocr:
               print(f"  - Class: {det['class_name']}, Conf: {det['confidence']:.2f}")
        else:
            print("❌ CẢNH BÁO: Không tìm thấy trường thông tin nào.")
            
        # Trả về danh sách các dictionary: {"box_points": ..., "class_name": ..., "confidence": ...}
        return final_detections_for_ocr


    def expand_box(self, box_points, frame_shape, expansion_factor=0.05):
        points = np.array(box_points, dtype=np.float32)
        center_x = np.mean(points[:, 0])
        center_y = np.mean(points[:, 1])
        expanded_points = []
        for point in points:
            dx = point[0] - center_x
            dy = point[1] - center_y
            new_x = center_x + dx * (1 + expansion_factor)
            new_y = center_y + dy * (1 + expansion_factor)
            new_x = max(0, min(frame_shape[1] - 1, new_x))
            new_y = max(0, min(frame_shape[0] - 1, new_y))
            expanded_points.append([new_x, new_y])
        return np.array(expanded_points, dtype=np.float32)

    def preprocess_image_for_rec(self, image_np):
        img_pil = Image.fromarray(cv2.cvtColor(image_np, cv2.COLOR_BGR2RGB))
        enhancer = ImageEnhance.Contrast(img_pil)
        img_pil = enhancer.enhance(1.2)
        enhancer = ImageEnhance.Sharpness(img_pil)
        img_pil = enhancer.enhance(1.4)
        return cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)

    def WarpAndRec(self, frame, detection_info): # Đã cập nhật signature
        box_points = detection_info["box_points"]
        class_name = detection_info["class_name"]

        if class_name in IMAGE_REGION_CLASSES:
            # Đối với các vùng hình ảnh, không cần thực hiện nhận dạng văn bản
            print(f"🖼️ Bỏ qua nhận dạng văn bản cho lớp hình ảnh: '{class_name}'")
            return [None, box_points, class_name] # Văn bản là None cho các vùng hình ảnh

        expanded_box = box_points
        rect = np.array(expanded_box, dtype="float32")
        (tl, tr, br, bl) = rect
        widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
        widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
        maxWidth = max(int(widthA), int(widthB))
        heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
        heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
        maxHeight = max(int(heightA), int(heightB))
        if maxWidth == 0 or maxHeight == 0:
            print(f"❌ Kích thước vùng nhận dạng cho '{class_name}' là 0 hoặc âm. Bỏ qua.")
            return ["", box_points, class_name]
        dst = np.array(
            [
                [0, 0],
                [maxWidth - 1, 0],
                [maxWidth - 1, maxHeight - 1],
                [0, maxHeight - 1],
            ],
            dtype="float32",
        )
        M = cv2.getPerspectiveTransform(rect, dst)
        matWarped = cv2.warpPerspective(frame, M, (maxWidth, maxHeight))
        
        matWarped = self.preprocess_image_for_rec(matWarped)
        try:
            recognized_text = self.text_recognizer.predict(Image.fromarray(matWarped))
            print(f"📝 Nhận dạng được cho '{class_name}': '{recognized_text}'")
        except Exception as e:
            print(f"❌ Lỗi nhận dạng văn bản cho '{class_name}': {e}")
            recognized_text = ""
        return [recognized_text, box_points, class_name] # Trả về cả class_name

    def _reconstruct_text_from_ocr(self, raw_ocr_results):
        """
        Tái cấu trúc văn bản từ các kết quả OCR đã được gắn nhãn lớp.
        Xử lý các lớp đa dòng và tập hợp kết quả cho các lớp đơn hoặc hình ảnh.
        """
        structured_ocr_data = {}

        # Group raw results by class name
        temp_grouped_results = {}
        for text, box_points, class_name in raw_ocr_results:
            if class_name not in temp_grouped_results:
                temp_grouped_results[class_name] = []
            
            if class_name in IMAGE_REGION_CLASSES:
                # Đối với các vùng hình ảnh, chỉ lưu bounding box (dưới dạng list [x_min, y_min, x_max, y_max])
                x_coords = [p[0] for p in box_points]
                y_coords = [p[1] for p in box_points]
                temp_grouped_results[class_name].append({
                    "bbox": [min(x_coords), min(y_coords), max(x_coords), max(y_coords)]
                })
            else:
                # Đối với các vùng văn bản, lưu văn bản và tọa độ y của điểm trên cùng bên trái để sắp xếp
                if text and text.strip(): # Chỉ thêm nếu văn bản không rỗng hoặc chỉ toàn khoảng trắng
                    temp_grouped_results[class_name].append({
                        "text": text.strip(),
                        "y": min(p[1] for p in box_points),
                        "x": min(p[0] for p in box_points)
                    })
        
        for class_name, items in temp_grouped_results.items():
            if not items:
                structured_ocr_data[class_name] = None
                continue

            if class_name in MULTI_LINE_CLASSES:
                # Sắp xếp theo tọa độ y rồi x cho các trường đa dòng
                sorted_items = sorted(items, key=lambda n: (n["y"], n["x"]))
                # Nối chuỗi văn bản, thêm khoảng trắng giữa các dòng, sau đó làm sạch
                concatenated_text = " ".join([item["text"] for item in sorted_items if "text" in item]).strip()
                # Làm sạch đơn giản cho các lỗi OCR hoặc định dạng trong địa chỉ đa dòng
                concatenated_text = re.sub(r'\s{2,}', ' ', concatenated_text) # Thay thế nhiều khoảng trắng bằng một
                concatenated_text = re.sub(r'(\s*,\s*){2,}', ',', concatenated_text) # Thay thế nhiều dấu phẩy bằng một
                concatenated_text = concatenated_text.strip(',. ') # Loại bỏ các dấu phẩy/chấm/khoảng trắng thừa ở đầu/cuối
                structured_ocr_data[class_name] = concatenated_text if concatenated_text else None
            elif class_name in IMAGE_REGION_CLASSES:
                # Đối với các vùng hình ảnh, trả về danh sách các bounding box
                # (ví dụ, có thể có nhiều vân tay nếu detect nhiều lần)
                structured_ocr_data[class_name] = [item["bbox"] for item in items]
            else:
                # Đối với các trường đơn dòng, lấy văn bản của mục đầu tiên (hoặc duy nhất)
                # (Giả định rằng phương thức Detection đã lọc và chỉ trả về item tốt nhất)
                if items and "text" in items[0] and items[0]["text"].strip():
                    structured_ocr_data[class_name] = items[0]["text"].strip()
                else:
                    structured_ocr_data[class_name] = None
        
        print("\n>>> Dữ liệu OCR đã tái cấu trúc và phân loại theo nhãn YOLO:")
        for k, v in structured_ocr_data.items():
            if isinstance(v, str) and len(v) > 100:
                print(f"  - {k}: {v[:100]}...") # Cắt bớt chuỗi dài để hiển thị
            else:
                print(f"  - {k}: {v}")
        print("---\n")

        return structured_ocr_data

    def _extract_info_rule_based(self, structured_ocr_data, card_side):
        """
        Trích xuất thông tin từ structured_ocr_data bằng các quy tắc.
        Không sử dụng mô hình LLM.
        """
        extracted_data = {
            "ID_number": None,
            "Name": None,
            "Date_of_birth": None,
            "Gender": None,
            "Nationality": "Việt Nam",  # Quốc tịch mặc định là Việt Nam
            "Place_of_origin": None,
            "Place_of_residence": None,
            "Date_of_expiry": None,
            "Identifying_characteristics": None,
            "Date_of_issue": None,
            "Place_of_issue": None,
            "Finger_prints": [], # Để lưu trữ bounding box của vân tay
            "QR_code_bbox": None # Để lưu trữ bounding box của mã QR
        }

        # Xử lý các class vùng hình ảnh trước
        if "finger_print" in structured_ocr_data and structured_ocr_data["finger_print"]:
            extracted_data["Finger_prints"] = structured_ocr_data["finger_print"]
        if "qr" in structured_ocr_data and structured_ocr_data["qr"]:
            # Nếu có nhiều mã QR, lấy cái đầu tiên hoặc kết hợp tùy logic
            extracted_data["QR_code_bbox"] = structured_ocr_data["qr"][0] if structured_ocr_data["qr"] else None


        # --- TRÍCH XUẤT THÔNG TIN MẶT TRƯỚC ---
        if card_side == "front":
            extracted_data["ID_number"] = structured_ocr_data.get("id")
            
            name_raw = structured_ocr_data.get("name")
            if name_raw:
                # Chuẩn hóa tên: viết hoa chữ cái đầu, sửa lỗi phổ biến
                name_parts = [word.capitalize() if word.upper() not in ["VÀ", "THỊ"] else word for word in name_raw.split()]
                extracted_data["Name"] = " ".join(name_parts).replace('Vô', 'Võ').replace('vo', 'Võ').replace('Vo', 'Võ') # Sửa lỗi 'Võ'

            extracted_data["Date_of_birth"] = structured_ocr_data.get("dob")
            extracted_data["Gender"] = structured_ocr_data.get("gender")
            if extracted_data["Gender"]:
                extracted_data["Gender"] = extracted_data["Gender"].capitalize().replace("NAM", "Nam").replace("NỮ", "Nữ")
            
            # Quốc tịch đã mặc định "Việt Nam", nhưng có thể ghi đè nếu YOLO tìm thấy trường "nationality"
            yolo_nationality = structured_ocr_data.get("nationality")
            if yolo_nationality:
                extracted_data["Nationality"] = yolo_nationality
            
            extracted_data["Place_of_origin"] = structured_ocr_data.get("origin_place")
            extracted_data["Place_of_residence"] = structured_ocr_data.get("current_place")
            extracted_data["Date_of_expiry"] = structured_ocr_data.get("expire_date")
            
            # Chuẩn hóa/làm sạch cơ bản cho các trường ngày tháng
            if extracted_data["Date_of_birth"]:
                date_match_loose = re.search(r'(\d{1,2})[./\s-]?(\d{1,2})[./\s-]?(\d{4})', extracted_data["Date_of_birth"])
                if date_match_loose:
                    d, m, y = date_match_loose.groups()
                    extracted_data["Date_of_birth"] = f"{int(d):02d}/{int(m):02d}/{y}"
                else:
                    extracted_data["Date_of_birth"] = None 

            if extracted_data["Date_of_expiry"]:
                if "không thời hạn" in extracted_data["Date_of_expiry"].lower() or "not exp" in extracted_data["Date_of_expiry"].lower():
                    extracted_data["Date_of_expiry"] = "Không thời hạn"
                else:
                    date_match_loose = re.search(r'(\d{1,2})[./\s-]?(\d{1,2})[./\s-]?(\d{4})', extracted_data["Date_of_expiry"])
                    if date_match_loose:
                        d, m, y = date_match_loose.groups()
                        extracted_data["Date_of_expiry"] = f"{int(d):02d}/{int(m):02d}/{y}"
                    else:
                        extracted_data["Date_of_expiry"] = None


        # --- TRÍCH XUẤT THÔNG TIN MẶT SAU ---
        elif card_side == "back":
            extracted_data["Identifying_characteristics"] = structured_ocr_data.get("features")
            extracted_data["Date_of_issue"] = structured_ocr_data.get("issue_date")
            extracted_data["Place_of_issue"] = structured_ocr_data.get("issue_place") # Tên class trong YOLO có thể là 'issue_place' hoặc tương tự

            # Chuẩn hóa 'Place_of_issue' nếu nó chứa các mẫu chung
            if extracted_data["Place_of_issue"]:
                place_raw = extracted_data["Place_of_issue"].lower()
                if "cục trưởng" in place_raw or "cục cảnh sát" in place_raw or "cảnh sát quản lý hành chính" in place_raw or "qlhc về ttxh" in place_raw or "bộ công an" in place_raw:
                    extracted_data["Place_of_issue"] = "Cục trưởng Cục Cảnh sát quản lý hành chính về trật tự xã hội"
                extracted_data["Place_of_issue"] = extracted_data["Place_of_issue"].strip(',. ')
            
            if extracted_data["Date_of_issue"]:
                date_match_loose = re.search(r'(\d{1,2})[./\s-]?(\d{1,2})[./\s-]?(\d{4})', extracted_data["Date_of_issue"])
                if date_match_loose:
                    d, m, y = date_match_loose.groups()
                    extracted_data["Date_of_issue"] = f"{int(d):02d}/{int(m):02d}/{y}"
                else:
                    extracted_data["Date_of_issue"] = None

        return extracted_data

    def _perform_cross_validation(self, data):
        """
        Xác thực chéo dữ liệu, đặc biệt là CCCD ID với Ngày sinh và Giới tính.
        """
        print(">>> Bắt đầu xác thực chéo dữ liệu (ID và Ngày sinh/Giới tính)...")
        validation = {"passed": True, "errors": []}
        if not isinstance(data, dict):
            validation["passed"] = False
            validation["errors"].append("Dữ liệu đầu vào không hợp lệ.")
            return validation
        try:
            cccd_id = data.get("ID_number")
            dob_str = data.get("Date_of_birth")
            gender = data.get("Gender")

            if cccd_id:
                cccd_id_str = str(cccd_id).strip()
                if len(cccd_id_str) != 12 or not cccd_id_str.isdigit():
                    validation["passed"] = False
                    validation["errors"].append(
                        f"Số CCCD '{cccd_id_str}' không hợp lệ (phải là 12 chữ số)."
                    )
                else:
                    # Mã tỉnh/thành: 3 chữ số đầu tiên
                    province_code = cccd_id_str[0:3]
                    # Có thể thêm logic kiểm tra mã tỉnh/thành có hợp lệ không nếu có danh sách mã tỉnh/thành
                    
                    # Mã giới tính và thế kỷ sinh: chữ số thứ 4 (chỉ số 3 trong chuỗi)
                    gender_century_code = int(cccd_id_str[3])
                    
                    id_gender_from_code = None
                    expected_century_prefix = None

                    if gender_century_code == 0: id_gender_from_code = "Nam"; expected_century_prefix = "19" # Thế kỷ 20, nam
                    elif gender_century_code == 1: id_gender_from_code = "Nữ"; expected_century_prefix = "19"  # Thế kỷ 20, nữ
                    elif gender_century_code == 2: id_gender_from_code = "Nam"; expected_century_prefix = "20" # Thế kỷ 21, nam
                    elif gender_century_code == 3: id_gender_from_code = "Nữ"; expected_century_prefix = "20"  # Thế kỷ 21, nữ
                    elif gender_century_code == 4: id_gender_from_code = "Nam"; expected_century_prefix = "21" # Thế kỷ 22, nam
                    elif gender_century_code == 5: id_gender_from_code = "Nữ"; expected_century_prefix = "21"  # Thế kỷ 22, nữ
                    else: 
                         validation["passed"] = False
                         validation["errors"].append(f"Mã giới tính/thế kỷ '{gender_century_code}' trong CCCD không hợp lệ (ngoài 0-5).")

                    # Xác thực giới tính từ CCCD ID với Giới tính đã trích xuất
                    extracted_gender_norm = gender.lower() if gender else ''
                    if extracted_gender_norm and id_gender_from_code: # Chỉ so sánh nếu cả hai đều có giá trị
                        if extracted_gender_norm != id_gender_from_code.lower():
                            validation["passed"] = False
                            validation["errors"].append(f"Giới tính được trích xuất ('{extracted_gender_norm}') không khớp với mã giới tính trong CCCD ID ('{id_gender_from_code}').")
                    elif not gender:
                        validation["errors"].append("Thiếu thông tin Giới tính để xác thực chéo với CCCD ID.")


                    # Mã năm sinh: 2 chữ số cuối của năm sinh từ CCCD ID
                    id_year_code = cccd_id_str[4:6]
                    if dob_str:
                        try:
                            dob_parts = dob_str.split('/')
                            if len(dob_parts) == 3 and len(dob_parts[2]) == 4:
                                dob_year = dob_parts[2]
                                if expected_century_prefix and dob_year[0:2] != expected_century_prefix:
                                     validation["errors"].append(f"Thế kỷ sinh ({dob_year[0:2]}) không khớp với mã giới tính/thế kỷ trong CCCD ID (mã {gender_century_code} -> thế kỷ {expected_century_prefix}).")

                                if dob_year[2:] != id_year_code:
                                    validation["errors"].append(f"Hai chữ số cuối năm sinh ({dob_year[2:]}) không khớp với CCCD ID ({id_year_code}).")

                            else:
                                validation["passed"] = False
                                validation["errors"].append("Định dạng năm sinh không hợp lệ (phải là dd/mm/yyyy).")
                        except ValueError:
                            validation["passed"] = False
                            validation["errors"].append(f"Ngày sinh '{dob_str}' không ở định dạng dd/mm/yyyy hợp lệ.")
                    else:
                        validation["passed"] = False
                        validation["errors"].append("Thiếu thông tin Ngày sinh để xác thực chéo với CCCD.")
            else:
                validation["passed"] = False
                validation["errors"].append("Thiếu thông tin Số CCCD để xác thực chéo.")

        except Exception as e:
            validation["passed"] = False
            validation["errors"].append(f"Lỗi hệ thống khi xác thực chéo: {e}")

        if validation["passed"]:
            print("✅ Xác thực chéo thành công!")
        else:
            print(f"❌ CẢNH BÁO: Xác thực chéo thất bại! Lỗi: {validation['errors']}")
        data["cross_validation_status"] = validation
        return data

    def _perform_advanced_validation(self, data):
        """
        Xác thực nâng cao các trường thông tin như họ và địa danh.
        """
        print(">>> Bắt đầu xác thực nâng cao (họ, địa danh)...")
        if not isinstance(data, dict):
            data["advanced_validation_warnings"] = ["Dữ liệu đầu vào không phải dict."]
            return data

        warnings = []
        name = data.get("Name")
        if name and isinstance(name, str):
            # Tách tên thành các phần
            name_parts = name.strip().split(" ")

            if name_parts:
                # Lấy phần tử ĐẦU TIÊN (là một chuỗi), sau đó mới .capitalize()
                surname = name_parts[0].capitalize()

                # So sánh với danh sách họ phổ biến
                if surname not in VIETNAMESE_SURNAMES:
                    warnings.append(
                        f"Họ '{surname}' có vẻ không phổ biến hoặc không hợp lệ."
                    )
            else:
                warnings.append("Không tìm thấy Họ để xác thực.")

        # Phần kiểm tra địa danh
        origin = data.get("Place_of_origin", "")
        if origin and not any(province.lower() in origin.lower() for province in VIETNAMESE_PROVINCES):
            warnings.append(
                f"Quê quán '{origin}' không chứa tên tỉnh/thành phố hợp lệ của Việt Nam."
            )

        residence = data.get("Place_of_residence", "")
        if residence and not any(
            province.lower() in residence.lower() for province in VIETNAMESE_PROVINCES
        ):
            warnings.append(
                f"Nơi thường trú '{residence}' không chứa tên tỉnh/thành phố hợp lệ của Việt Nam."
            )

        if not warnings:
            print("✅ Xác thực nâng cao không có cảnh báo.")
        else:
            print(f"⚠️ Cảnh báo từ xác thực nâng cao: {warnings}")

        data["advanced_validation_warnings"] = warnings
        return data

    def GetInformationAndSave(self, extracted_results, card_side="front"): # Thêm tham số card_side
        print(f"\n--- Bắt đầu quy trình trích xuất và xác thực thông tin cho mặt {card_side} ---")
        # extracted_results ở đây là danh sách các [recognized_text, box_points, class_name]
        
        structured_ocr_data = self._reconstruct_text_from_ocr(extracted_results)
        
        if not structured_ocr_data:
            final_result = {"error": "Không có dữ liệu OCR nào được tái cấu trúc."}
        else:
            # Sử dụng phương pháp trích xuất dựa trên quy tắc
            extracted_data = self._extract_info_rule_based(structured_ocr_data, card_side)
            
            # Kiểm tra cơ bản nếu việc trích xuất thất bại hoàn toàn
            if card_side == "front" and (not extracted_data.get("ID_number") and not extracted_data.get("Name")):
                final_result = {
                    "error": "Không thể trích xuất thông tin cơ bản mặt trước (ID hoặc Tên) bằng quy tắc."
                }
            elif card_side == "back" and (not extracted_data.get("Identifying_characteristics") and not extracted_data.get("Date_of_issue")):
                 final_result = {
                    "error": "Không thể trích xuất thông tin cơ bản mặt sau (Đặc điểm nhận dạng hoặc Ngày cấp) bằng quy tắc."
                }
            else:
                # Thực hiện các bước xác thực
                if card_side == "front": # Chỉ xác thực chéo ID, Ngày sinh, Giới tính cho mặt trước
                    validated_data = self._perform_cross_validation(extracted_data)
                else:
                    validated_data = extracted_data # Không có xác thực chéo cụ thể cho các trường mặt sau
                
                final_result = self._perform_advanced_validation(validated_data)

        try:
            output_filename = f"extracted_information_rule_based_{card_side}.json"
            output_path = os.path.join(
                CURRENT_DIR, output_filename
            )
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(final_result, f, indent=4, ensure_ascii=False)
            print(f"\n✅ Đã lưu kết quả vào file: {output_path}")
        except Exception as e:
            print(f"❌ Lỗi khi lưu file: {e}")
        return final_result


idcard_extractor = Extractor()
if __name__ == "__main__":

    # Đảm bảo đường dẫn ảnh đúng với môi trường của bạn
    # Ví dụ cho mặt trước
    img_path_front = os.path.join(CURRENT_DIR, "image/cccd1.jpg") 
    # Ví dụ cho mặt sau (nếu có, bạn có thể bỏ comment và cung cấp đường dẫn)
    # img_path_back = os.path.join(CURRENT_DIR, "path/to/your/back_of_id_card.jpg") 

    # --- XỬ LÝ MẶT TRƯỚC CĂN CƯỚC CÔNG DÂN ---
    print("\n--- BẮT ĐẦU XỬ LÝ MẶT TRƯỚC CĂN CƯỚC CÔNG DÂN ---")
    original_frame_front = cv2.imread(img_path_front)
    if original_frame_front is None:
        raise FileNotFoundError(f"Không thể đọc ảnh mặt trước từ đường dẫn: {img_path_front}")
    
    isok_front, mss_front = idcard_extractor.check_image_quality(original_frame_front)
    print(f"Chất lượng ảnh mặt trước: {isok_front}, {mss_front}")
    
    if isok_front:
        frame_front = idcard_extractor.find_and_crop_id_card(original_frame_front)
        cv2.imwrite(os.path.join(CURRENT_DIR, "debug_01_cropped_card_front.jpg"), frame_front)

        # dt_polys_front bây giờ là danh sách các dictionary: {"box_points": ..., "class_name": ..., "confidence": ...}
        dt_polys_front = idcard_extractor.Detection(frame_front)

        print("\n>>> Bắt đầu nhận dạng văn bản mặt trước đa luồng...")
        extracted_results_front = []
        threads_front = []
        for detection_info in dt_polys_front: # Lặp qua các dictionary detection_info
            t = ThreadWithReturnValue(
                target=idcard_extractor.WarpAndRec,
                args=(frame_front, detection_info), # Truyền toàn bộ dictionary detection_info
            )
            threads_front.append(t)
            t.start()

        for t in threads_front:
            extracted_results_front.append(t.join())

        # Truyền "front" vào GetInformationAndSave
        info_front = idcard_extractor.GetInformationAndSave(extracted_results_front, card_side="front")

        print("\n--- KẾT QUẢ CUỐI CÙNG MẶT TRƯỚC ---")
        print(json.dumps(info_front, indent=2, ensure_ascii=False))
    else:
        print(f"❌ Không xử lý mặt trước do chất lượng ảnh kém: {mss_front}")

    # --- XỬ LÝ MẶT SAU (Tùy chọn, nếu bạn bỏ comment img_path_back) ---
    # print("\n--- BẮT ĐẦU XỬ LÝ MẶT SAU CĂN CƯỚC CÔNG DÂN ---")
    # try:
    #     original_frame_back = cv2.imread(img_path_back)
    #     if original_frame_back is None:
    #         print(f"Cảnh báo: Không thể đọc ảnh mặt sau từ đường dẫn: {img_path_back}")
    #     else:
    #         isok_back, mss_back = idcard_extractor.check_image_quality(original_frame_back)
    #         print(f"Chất lượng ảnh mặt sau: {isok_back}, {mss_back}")
            
    #         if isok_back:
    #             frame_back = idcard_extractor.find_and_crop_id_card(original_frame_back)
    #             cv2.imwrite(os.path.join(CURRENT_DIR, "debug_01_cropped_card_back.jpg"), frame_back)

    #             dt_polys_back = idcard_extractor.Detection(frame_back)

    #             print("\n>>> Bắt đầu nhận dạng văn bản mặt sau đa luồng...")
    #             extracted_results_back = []
    #             threads_back = []
    #             for detection_info in dt_polys_back:
    #                 t = ThreadWithReturnValue(
    #                     target=idcard_extractor.WarpAndRec,
    #                     args=(frame_back, detection_info),
    #                 )
    #                 threads_back.append(t)
    #                 t.start()

    #             for t in threads_back:
    #                 extracted_results_back.append(t.join())

    #             # Truyền "back" vào GetInformationAndSave
    #             info_back = idcard_extractor.GetInformationAndSave(extracted_results_back, card_side="back")

    #             print("\n--- KẾT QUẢ CUỐI CÙNG MẶT SAU ---")
    #             print(json.dumps(info_back, indent=2, ensure_ascii=False))
    #         else:
    #             print(f"❌ Không xử lý mặt sau do chất lượng ảnh kém: {mss_back}")
    # except FileNotFoundError:
    #     print("Bỏ qua xử lý mặt sau vì đường dẫn ảnh không hợp lệ hoặc không được cung cấp.")