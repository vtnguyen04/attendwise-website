
import cv2
import base64
import numpy as np
import mediapipe as mp
import random
from typing import Union, Dict, List
from facenet.models.mtcnn import MTCNN
from utils.functions import extract_face
from .liveness_detection.blink_detection import *
from .liveness_detection.emotion_prediction import *
from .liveness_detection.face_orientation import *
import torch
from deepface import DeepFace


DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MTCNN_MODEL = MTCNN(device=DEVICE)
BLINK_MODEL = BlinkDetector()
EMOTION_MODEL = EmotionPredictor(device=DEVICE)
ORIENTATION_MODEL = FaceOrientationDetector()
ALL_MODELS = [BLINK_MODEL, ORIENTATION_MODEL, EMOTION_MODEL]
print("✅ Các model Liveness tùy chỉnh đã sẵn sàng.")

def random_challenge():
    return random.choice(["smile", "surprise", "blink eyes", "right", "left"])


def get_question(challenge):
    if challenge in ["smile", "surprise"]:
        
        return "Vui long the hien bieu cam: {}".format(challenge)
    elif challenge in ["right", "left"]:
        c = "trái" if challenge == "left" else "phai"
        return "Vui long quay mat ve phia: {}".format(c)
    elif challenge == "front":
        return "Vui long nhin thang"
    elif challenge == "blink eyes":
        num = random.randint(2, 4)
        return ["Vui long nhay mat {} lan".format(num), num]
    return "Thu thach khong hop le"

def result_challenge_response(frame: np.ndarray, challenge: str, question, models: list, mtcnn_model: MTCNN):
    face, box, landmarks = extract_face(frame, mtcnn_model, padding=10)
    if box is not None:
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        if challenge in ["smile", "surprise"]:
            return models[2].predict(face) == challenge
        elif challenge in ["right", "left", "front"]:
            return models[1].detect(landmarks) == challenge
        elif challenge == "blink eyes":
            # The BlinkDetector is stateful. It must be called on each frame.
            # The while loop was a bug that blocked processing.
            is_blink_complete, _, _ = models[0].eye_blink(rgb_image=rgb_frame, total=question[1])
            return is_blink_complete
    return False


class LivenessChallenge:
    def __init__(self, challenge_sequence: List[str]):
        self.TIMEOUT_PER_CHALLENGE = 30.0
        self.challenges = challenge_sequence
        self.current_challenge_index = 0
        self.start_time = cv2.getTickCount()
        self.challenge, self.question = self.get_next_challenge_and_question()
        self.instruction = self.get_instruction_text()
        self.frontal_frame = None # To store the best, front-facing frame for embedding

    def get_next_challenge_and_question(self):
        challenge = self.challenges[self.current_challenge_index]
        question = get_question(challenge)
        return challenge, question

    def get_instruction_text(self):
        return self.question[0] if isinstance(self.question, list) else self.question

    def advance_challenge(self):
        self.current_challenge_index += 1
        if self.current_challenge_index < len(self.challenges):
            self.challenge, self.question = self.get_next_challenge_and_question()
            self.instruction = self.get_instruction_text()
            self.start_time = cv2.getTickCount()
        else:
            self.challenge = "DONE"

    def check_timeout(self) -> bool:
        elapsed = (cv2.getTickCount() - self.start_time) / cv2.getTickFrequency()
        return elapsed > self.TIMEOUT_PER_CHALLENGE

    def process_frame(self, image: np.ndarray) -> Dict:
        if self.challenge == "front" and self.frontal_frame is None:
            self.frontal_frame = image
            print("📸 Khung hình chính diện đã được lưu.")

        if self.check_timeout():
            return {"status": "failed", "reason": f"Thu thach '{self.challenge}' da het han."}

        challenge_is_correct = result_challenge_response(
            image, self.challenge, self.question, ALL_MODELS, MTCNN_MODEL
        )

        if not challenge_is_correct:
            return {"status": "in_progress", "correct": False, "instruction": self.instruction}

        # If we reach here, the current challenge was passed.
        print(f"✅ Thử thách '{self.challenge}' thành công!")
        self.advance_challenge() # Move to the next state

        if self.challenge == "DONE":
            # The sequence is complete
            return {"status": "success", "correct": True}
        else:
            # The sequence is still in progress, return instruction for the *new* challenge
            return {"status": "in_progress", "correct": True, "instruction": self.instruction}


class FaceService:
    def __init__(self):
        print("✅ FaceService (Verify/Extract/Passive) đã sẵn sàng.")
        self.face_model = "ArcFace"
        self.detector_backend = "opencv"

    def extract_face(self, image_bytes: bytes) -> Union[bytes, None]:
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                print("Error: Could not decode image_bytes in extract_face.")
                return None

            embeddings = DeepFace.represent(img_path=img, model_name=self.face_model, detector_backend=self.detector_backend, enforce_detection=True)
            if embeddings and len(embeddings) > 0:
                return np.array(embeddings[0]["embedding"]).astype(np.float32).tobytes()
            
            # If we reach here, face extraction failed. Save the image for debugging.
            print("Error: DeepFace.represent failed to find a face or create an embedding.")
            cv2.imwrite("failed_extraction.jpg", img)
            print("Debug: Saved failing image to failed_extraction.jpg")
            return None
        except Exception as e:
            # Also save the image if an exception occurs
            print(f"Error in FaceService.extract_face: {e}")
            if 'img' in locals() and img is not None:
                cv2.imwrite("failed_extraction.jpg", img)
                print("Debug: Saved failing image to failed_extraction.jpg due to exception.")
            return None

    def verify_faces(self, image1_bytes: bytes, image2_bytes: bytes) -> dict:
        try:
            nparr1 = np.frombuffer(image1_bytes, np.uint8)
            img1 = cv2.imdecode(nparr1, cv2.IMREAD_COLOR)
            if img1 is None:
                return {"verified": False, "reason": "Could not decode image1_bytes.", "distance": 1.0}

            nparr2 = np.frombuffer(image2_bytes, np.uint8)
            img2 = cv2.imdecode(nparr2, cv2.IMREAD_COLOR)
            if img2 is None:
                return {"verified": False, "reason": "Could not decode image2_bytes.", "distance": 1.0}

            result = DeepFace.verify(img1_path=img1, img2_path=img2, model_name=self.face_model, detector_backend=self.detector_backend)
            return {"verified": result["verified"], "distance": result["distance"], "reason": ""}
        except Exception as e:
            print(f"Error in FaceService.verify_faces: {e}")
            return {"verified": False, "reason": f"Face verification failed: {e}", "distance": 1.0}

    def verify_faces_with_embedding(self, image_bytes: bytes, stored_embedding_bytes: bytes) -> dict:
        try:
            # Extract embedding from the provided image
            current_embedding_bytes = self.extract_face(image_bytes)
            if current_embedding_bytes is None:
                return {"verified": False, "reason": "Could not extract face from current image.", "distance": 1.0}

            # Convert embeddings from bytes to numpy arrays
            current_embedding = np.frombuffer(current_embedding_bytes, dtype=np.float32)
            stored_embedding = np.frombuffer(stored_embedding_bytes, dtype=np.float32)

            # Perform cosine similarity or other comparison
            # Ensure embeddings are normalized for cosine similarity
            current_embedding = current_embedding / np.linalg.norm(current_embedding)
            stored_embedding = stored_embedding / np.linalg.norm(stored_embedding)

            distance = np.arccos(np.dot(current_embedding, stored_embedding)) / np.pi # Cosine distance
            
            # Define a threshold for verification (this needs to be tuned)
            threshold = 0.6 # Example threshold for cosine distance

            verified = distance < threshold

            return {"verified": verified, "distance": distance, "reason": ""}
        except Exception as e:
            print(f"Error in FaceService.verify_faces_with_embedding: {e}")
            return {"verified": False, "reason": f"Embedding verification failed: {e}", "distance": 1.0}

    def check_liveness_passive(self, image_bytes: bytes) -> Dict:
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return {"live": False, "score": 0.0, "reason": "Could not decode image_bytes for passive liveness.", "details": ""}

            # Simplified passive liveness: if a face is detected, consider it live.
            # A real implementation would use a dedicated passive liveness model.
            faces = DeepFace.extract_faces(img_path=img, detector_backend=self.detector_backend, enforce_detection=False)
            if faces and len(faces) > 0:
                return {"live": True, "score": 0.99, "reason": "Face detected (mocked passive liveness).", "details": ""}
            return {"live": False, "score": 0.0, "reason": "No face detected (mocked passive liveness).", "details": ""}
        except Exception as e:
            print(f"Error in FaceService.check_liveness_passive: {e}")
            return {"live": False, "score": 0.0, "reason": f"Passive liveness check failed: {e}", "details": ""}

    def check_liveness_and_verify(self, id_card_bytes: bytes, selfie_bytes: bytes) -> Dict:
        print(">>> Face Service: Bắt đầu quy trình kiểm tra kết hợp (Liveness + Verify)...")
        liveness_result = self.check_liveness_passive(selfie_bytes)
        is_live = liveness_result.get("live", False)
        if not is_live:
            return {"success": False, "liveness_passed": False, "face_verified": None, "reason": liveness_result.get("reason", "Ảnh không phải người thật."), "details": liveness_result}
        print(">>> Face Service: Liveness thành công. Tiếp tục so khớp khuôn mặt...")
        verification_result = self.verify_faces(id_card_bytes, selfie_bytes)
        is_verified = verification_result.get("verified", False)
        if not is_verified:
            return {"success": False, "liveness_passed": True, "face_verified": False, "reason": verification_result.get("reason", "Khuôn mặt không khớp."), "details": verification_result}
        print(">>> Face Service: Cả Liveness và So khớp đều thành công!")
        return {"success": True, "liveness_passed": True, "face_verified": True, "reason": "Passive Liveness và Face Verification đều thành công.", "details": verification_result}
