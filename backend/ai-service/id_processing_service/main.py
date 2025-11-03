# id_processing_service/main.py
import cv2
import numpy as np
import uvicorn
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from typing import Literal

from .extractor import idcard_extractor, ThreadWithReturnValue  # Import từ file cục bộ

app = FastAPI(
    title="ID Card Processing Service",
    description="Một API để trích xuất thông tin từ CCCD Việt Nam sử dụng OCR và AI.",
)

# KHỞI TẠO MÔ HÌNH MỘT LẦN KHI STARTUP
# Điều này giúp tránh việc tải lại mô hình trong mỗi lần gọi API
print(">>> Chuẩn bị khởi tạo các mô hình cho service...")
print("✅ Service đã sẵn sàng nhận yêu cầu!")


@app.post("/process-id-card/")
async def process_id_card(
    card_side: Literal["front", "back"] = Form(
        ..., description="Chỉ định mặt của thẻ: 'front' hoặc 'back'."
    ),
    image: UploadFile = File(..., description="File ảnh của mặt thẻ tương ứng."),
):
    """
    Endpoint chính để xử lý ảnh CCCD.
    Nhận một file ảnh và loại mặt thẻ, trả về dữ liệu JSON đã trích xuất.
    """
    # 1. Đọc file ảnh từ request
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    original_frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if original_frame is None:
        raise HTTPException(
            status_code=400,
            detail="Không thể đọc file ảnh. Định dạng có thể không được hỗ trợ.",
        )

    try:
        # 2. Kiểm tra chất lượng ảnh
        is_ok, message = idcard_extractor.check_image_quality(original_frame)
        print("is ok: ", is_ok)
        if not is_ok:
            raise HTTPException(status_code=400, detail=message)

        # 3. Tìm và cắt khung thẻ
        frame = idcard_extractor.find_and_crop_id_card(original_frame)
        if frame is None:
            raise HTTPException(
                status_code=400,
                detail="Không tìm thấy khung thẻ trong ảnh. Vui lòng đảm bảo toàn bộ thẻ nằm trong khung hình.",
            )

        # 4. Phát hiện và nhận dạng văn bản
        dt_polys = idcard_extractor.Detection(frame)
        if len(dt_polys) == 0:
            raise HTTPException(
                status_code=400,
                detail="Không phát hiện được văn bản nào trên thẻ. Chất lượng ảnh có thể kém.",
            )

        threads = [
            ThreadWithReturnValue(target=idcard_extractor.WarpAndRec, args=(frame, box))
            for box in dt_polys
        ]
        for t in threads:
            t.start()
        extracted_results = [t.join() for t in threads]

        # 5. Tái cấu trúc và gọi AI để trích xuất
        reconstructed_text = idcard_extractor._reconstruct_text_from_ocr(extracted_results)
        print("text:", reconstructed_text)
        if not reconstructed_text.strip():
            raise HTTPException(
                status_code=500,
                detail="Văn bản OCR rỗng, không thể trích xuất thông tin.",
            )

        extracted_data = idcard_extractor._extract_with_ai(reconstructed_text, card_side)
        if not extracted_data:
            raise HTTPException(
                status_code=500,
                detail="AI không thể trích xuất thông tin. Văn bản nhận dạng có thể quá nhiễu.",
            )

        # 6. (Tùy chọn) Chạy các bước xác thực và trả về kết quả
        if card_side == "front":
            validated_data = idcard_extractor._perform_cross_validation(extracted_data)
            final_data = idcard_extractor._perform_advanced_validation(validated_data)
            return final_data
        else:
            return extracted_data

    except Exception as e:
        # Bắt các lỗi không lường trước
        print(f"Lỗi không xác định: {e}")
        raise HTTPException(status_code=500, detail=f"Đã xảy ra lỗi nội bộ: {e}")


# Chạy app (chỉ để debug trực tiếp)
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
