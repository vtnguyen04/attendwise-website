# face_service/main.py
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, Body
from typing import Dict
import numpy as np
import cv2
from fastapi.middleware.cors import CORSMiddleware 
import os
# Import các lớp xử lý từ file core.py
from .face_logic import FaceService, LivenessChallenge, random_challenge

app = FastAPI(
    title="Real Face Service",
    description="API cung cấp các tính năng Liveness (Passive & Active) và Face Verification."
)

origins_str = os.getenv('FACE_SERVICE_CORS_ORIGINS', "http://localhost:5000")
origins = [o.strip() for o in origins_str.split(',')]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Cho phép các origin trong danh sách
    allow_credentials=True,      # Cho phép gửi cookie (nếu có)
    allow_methods=["*"],         # Cho phép tất cả các phương thức (GET, POST, OPTIONS, v.v.)
    allow_headers=["*"],         # Cho phép tất cả các header
)

face_service_handler = FaceService()
active_challenges: Dict[str, LivenessChallenge] = {}


# === CÁC ENDPOINT CHO PASSIVE CHECK VÀ VERIFICATION ===

@app.post("/liveness/passive-check")
async def passive_liveness_check(image: UploadFile = File(...)):
    image_bytes = await image.read()
    result = face_service_handler.check_liveness_passive(image_bytes)
    result['is_live'] = result.pop('live', False) 
    
    if not result['is_live']:
        raise HTTPException(status_code=400, detail=result)
        
    return result

@app.post("/verify-faces/")
async def verify_faces(image1: UploadFile = File(...), image2: UploadFile = File(...)):
    img1_bytes = await image1.read()
    img2_bytes = await image2.read()
    result = face_service_handler.verify_faces(img1_bytes, img2_bytes)
    return result

@app.post("/liveness/start-challenge")
def start_active_liveness_challenge(session_id: str = Body(..., embed=True)):
    if session_id in active_challenges:
        del active_challenges[session_id]

    challenge_sequence = ["front", random_challenge(), random_challenge()]
    challenge_instance = LivenessChallenge(challenge_sequence)
    
    active_challenges[session_id] = challenge_instance
    print(f"Bắt đầu thử thách cho session {session_id}: {challenge_sequence}")
    
    return {
        "status": "in_progress",
        "instruction": challenge_instance.instruction
    }

@app.post("/liveness/submit-frame/{session_id}")
async def submit_frame_for_challenge(session_id: str, image_file: UploadFile = File(...)):
    if session_id not in active_challenges:
        raise HTTPException(status_code=404, detail="Không tìm thấy thử thách cho session này.")
    
    challenge_instance = active_challenges[session_id]
    image_bytes = await image_file.read()
    nparr = np.frombuffer(image_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    result = challenge_instance.process_frame(frame)
    
    if result.get("status") in ["success", "failed"]:
        del active_challenges[session_id]

    return result
@app.post("/liveness/combined-check")
async def combined_liveness_and_verification(
    id_card_image: UploadFile = File(...),
    selfie_image: UploadFile = File(...)
):
    """
    Endpoint kết hợp:
    1. Kiểm tra Passive Liveness trên ảnh selfie.
    2. So khớp khuôn mặt giữa selfie và CCCD.
    """
    id_bytes = await id_card_image.read()
    selfie_bytes = await selfie_image.read()

    result = face_service_handler.check_liveness_and_verify(id_bytes, selfie_bytes)

    # Nếu quy trình tổng thể thất bại (do liveness hoặc verify), trả về lỗi 400
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result)
    
    # Nếu thành công, trả về kết quả 200 OK
    return result
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)