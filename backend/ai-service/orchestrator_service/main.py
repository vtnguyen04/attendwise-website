# orchestrator_service/main.py
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, Path
from fastapi.middleware.cors import CORSMiddleware
from .kyc_workflow import KYCWorkflow
import base64 # Import base64 để mã hóa binary data
import os

app = FastAPI(
    title="KYC Orchestrator Service",
    description="API chính để quản lý quy trình E-KYC theo luồng phòng thủ đa lớp.",
    version="2.0.0"
)
origins_str = os.getenv('ORCHESTRATOR_CORS_ORIGINS', "http://localhost:5000")
origins = [o.strip() for o in origins_str.split(',')]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Cho phép tất cả các phương thức (GET, POST, etc.)
    allow_headers=["*"],  # Cho phép tất cả các header
)
# Khởi tạo một instance duy nhất của KYCWorkflow để quản lý tất cả các phiên
workflow = KYCWorkflow()

# Helper function để chuyển đổi bytes thành base64 string
def sanitize_session_data_for_json(data):
    """
    Đệ quy chuyển đổi các đối tượng bytes trong từ điển/danh sách thành chuỗi Base64.
    """
    if isinstance(data, dict):
        return {k: sanitize_session_data_for_json(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_session_data_for_json(elem) for elem in data]
    elif isinstance(data, bytes):
        # Nếu là bytes, giả định đó là dữ liệu nhị phân và mã hóa Base64
        return base64.b64encode(data).decode('ascii')
    else:
        return data


@app.post("/kyc/session", status_code=201, summary="Bước 1: Tạo phiên KYC")
def create_session():
    """
    Bắt đầu một quy trình E-KYC mới bằng cách tạo một session duy nhất.
    Trả về một `session_id` để sử dụng trong tất cả các lệnh gọi tiếp theo.
    """
    session_id = workflow.create_new_session()
    return {
        "session_id": session_id,
        "status": "AWAITING_FRONT_ID",
        "next_step": "Upload ảnh mặt trước CCCD qua endpoint /kyc/session/{session_id}/front"
    }


@app.get("/kyc/session/{session_id}", summary="Kiểm tra trạng thái phiên")
def get_session(session_id: str = Path(..., description="ID của phiên KYC cần kiểm tra.")):
    """
    Lấy trạng thái và dữ liệu hiện tại của một phiên KYC đang diễn ra.
    Hữu ích để debug hoặc tiếp tục một quy trình bị gián đoạn.
    """
    session = workflow.get_session_status(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Phiên không tồn tại.")
    
    # Áp dụng hàm làm sạch dữ liệu trước khi trả về
    sanitized_session = sanitize_session_data_for_json(session)
    return sanitized_session


@app.post("/kyc/session/{session_id}/front", summary="Bước 2: Upload mặt trước CCCD")
async def upload_front_id(
    session_id: str = Path(..., description="ID của phiên KYC."),
    image: UploadFile = File(..., description="File ảnh mặt trước CCCD.")
):
    """
    Upload và xử lý ảnh mặt trước. Hệ thống sẽ kiểm tra chất lượng ảnh,
    sau đó trích xuất thông tin bằng OCR và AI.
    """
    image_bytes = await image.read()
    result = await workflow.process_front_side(session_id, image_bytes)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return {
        "status": "AWAITING_BACK_ID",
        "next_step": "Upload ảnh mặt sau CCCD qua endpoint /kyc/session/{session_id}/back",
        "data": result["data"]
    }


@app.post("/kyc/session/{session_id}/back", summary="Bước 3: Upload mặt sau CCCD")
async def upload_back_id(
    session_id: str = Path(..., description="ID của phiên KYC."),
    image: UploadFile = File(..., description="File ảnh mặt sau CCCD.")
):
    """
    Upload và xử lý ảnh mặt sau.
    """
    image_bytes = await image.read()
    result = await workflow.process_back_side(session_id, image_bytes)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return {
        "status": "AWAITING_SELFIE",
        "next_step": "Chụp ảnh selfie qua endpoint /kyc/session/{session_id}/selfie-passive-check",
        "data": result["data"]
    }


@app.post("/kyc/session/{session_id}/selfie-passive-check", summary="Bước 4: Kiểm tra Liveness Bị động")
async def upload_initial_selfie(
    session_id: str = Path(..., description="ID của phiên KYC."),
    image: UploadFile = File(..., description="Ảnh selfie của người dùng.")
):
    """
    Thực hiện lớp phòng thủ đầu tiên: Kiểm tra liveness bị động trên một ảnh selfie.
    Nếu thành công, hệ thống sẽ yêu cầu client bắt đầu các thử thách tương tác.
    """
    image_bytes = await image.read()
    result = await workflow.process_initial_selfie(session_id, image_bytes)
    if not result["success"]:
        # Khi lỗi, result đã là một dict chứa thông tin lỗi hợp lệ
        raise HTTPException(status_code=400, detail=result)
    return result


@app.post("/kyc/session/{session_id}/confirm-active-liveness", summary="Bước 5: Xác nhận hoàn thành Liveness Chủ động")
def confirm_active_liveness(session_id: str = Path(..., description="ID của phiên KYC.")):
    """
    Client gọi endpoint này sau khi đã hoàn thành thành công luồng thử thách
    tương tác (active liveness) với Face Service.
    """
    result = workflow.confirm_active_liveness_passed(session_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return {
        "status": "ACTIVE_LIVENESS_PASSED",
        "next_step": "Kích hoạt xác thực cuối cùng qua endpoint /kyc/session/{session_id}/verify-final"
    }


@app.post("/kyc/session/{session_id}/verify-final", summary="Bước 6: Kích hoạt Xác thực Cuối cùng")
async def final_verification(session_id: str = Path(..., description="ID của phiên KYC.")):
    """
    Kích hoạt bước cuối cùng của quy trình: so sánh khuôn mặt trên CCCD và selfie,
    và các quy tắc nghiệp vụ khác để phê duyệt hoặc từ chối phiên KYC.
    """
    result = await workflow.run_final_verification(session_id)
    if not result["success"]:
        # Khi lỗi, result đã là một dict chứa thông tin lỗi hợp lệ
        raise HTTPException(status_code=400, detail=result)
    
    # Áp dụng hàm làm sạch dữ liệu cho 'details' trong 'result' trước khi trả về
    # Đảm bảo rằng bất kỳ dữ liệu nhị phân nào trong 'session' (nếu 'details' là 'session')
    # cũng được chuyển đổi thành Base64.
    if "details" in result and isinstance(result["details"], dict):
        result["details"] = sanitize_session_data_for_json(result["details"])

    return result


if __name__ == "__main__":
    # Chạy trên port 8002 để không xung đột với các service khác
    uvicorn.run(app, host="0.0.0.0", port=8002)