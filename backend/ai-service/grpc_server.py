# eKYC/grpc_server.py
import cv2
import numpy as np
import grpc
import time
import logging
import sys
import os
from concurrent import futures
import uuid

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))      # .../project/ai-service
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)                   # .../project
GENERATED_DIR = os.path.join(PROJECT_ROOT, "generated", "py")
print("Generated dir:", GENERATED_DIR)
sys.path.insert(0, GENERATED_DIR)  # ưu tiên module local

import ai.ai_pb2 as ai_pb2
import ai.ai_pb2_grpc as ai_pb2_grpc    
# --- AI Logic Imports ---
from face_service.face_logic import FaceService, LivenessChallenge, random_challenge

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- AI Service Implementation ---
class AIService(ai_pb2_grpc.AIServiceServicer):
    def __init__(self):
        logging.info("Initializing AI models...")
        self.face_service = FaceService()
        self.active_challenges = {}
        logging.info("AI models initialized successfully.")

    def RecognizeFace(self, request, context):
        verification_result = self.face_service.verify_faces_with_embedding(request.image_data, request.stored_face_embedding)
        logging.info(f"RecognizeFace: Verification result: {verification_result}")
        return ai_pb2.RecognizeFaceResponse(
            success=verification_result["verified"],
            confidence=1.0 - verification_result["distance"], # Convert distance to confidence
            failure_reason=verification_result.get("reason", "")
        )

    def StartLivenessChallenge(self, request, context):
        session_id = str(uuid.uuid4())
        logging.info(f"StartLivenessChallenge called. New session ID: {session_id}")
        
        challenge_sequence = ["front", "smile", "right"]
        self.active_challenges[session_id] = LivenessChallenge(challenge_sequence) 
        
        logging.info(f"Session {session_id} created with challenges: {challenge_sequence}")
        
        return ai_pb2.StartLivenessChallengeResponse(
            session_id=session_id,
            challenges=challenge_sequence
        )

    def SubmitLivenessVideo(self, request, context):
        session_id = request.session_id
        logging.info(f"SubmitLivenessVideo called for session: {session_id}")

        challenge_processor = self.active_challenges.get(session_id)

        if challenge_processor: # If a session_id is provided and valid, use the challenge flow
            image_bytes = request.video_data
            nparr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is None:
                return ai_pb2.SubmitLivenessVideoResponse(success=False, failure_reason="INVALID_FRAME_DATA")

            logging.info(f"Processing frame for session {session_id}, challenge: '{challenge_processor.challenge}'")
            result = challenge_processor.process_frame(frame)
            logging.info(f"Frame processing result for session {session_id}: {result}")

            if result["status"] == "success":
                logging.info(f"Liveness check SUCCESS for session {session_id}")
                del self.active_challenges[session_id]
                
                if challenge_processor.frontal_frame is None:
                    return ai_pb2.SubmitLivenessVideoResponse(success=False, failure_reason="FRONTAL_FRAME_NOT_CAPTURED")
                
                _, frame_bytes = cv2.imencode('.jpg', challenge_processor.frontal_frame)
                face_embedding = self.face_service.extract_face(frame_bytes.tobytes())

                if face_embedding is None:
                    return ai_pb2.SubmitLivenessVideoResponse(success=False, failure_reason="FACE_EXTRACTION_FAILED")
                
                return ai_pb2.SubmitLivenessVideoResponse(success=True, face_embedding=face_embedding, failure_reason=result.get("reason"))
            
            elif result["status"] == "failed":
                logging.error(f"Liveness check FAILED for session {session_id}: {result.get('reason')}")
                del self.active_challenges[session_id]
                return ai_pb2.SubmitLivenessVideoResponse(success=False, failure_reason=result.get("reason", "CHALLENGE_FAILED"))
            
            else: # status == "in_progress" and correct == True
                return ai_pb2.SubmitLivenessVideoResponse(success=False, failure_reason="CHALLENGE_PASSED_CONTINUE")
        else: # No session_id or invalid session_id, perform simple liveness check for check-in
            logging.info(f"No active liveness challenge found for session_id {session_id}. Performing simple liveness check.")
            image_bytes = request.video_data
            nparr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is None:
                return ai_pb2.SubmitLivenessVideoResponse(success=False, failure_reason="INVALID_FRAME_DATA")
            
            # Perform a simple liveness check (e.g., check for single face, basic movement if video)
            # For now, we'll just assume success if a frame is provided and no session is active.
            # In a real scenario, this would call a dedicated liveness detection model.
            logging.info("Simple liveness check assumed success for check-in.")
            return ai_pb2.SubmitLivenessVideoResponse(success=True, failure_reason="")

def serve():
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10),
        options=[
            ('grpc.max_receive_message_length', 20 * 1024 * 1024),
            ('grpc.max_send_message_length', 20 * 1024 * 1024)
        ]
    )
    ai_pb2_grpc.add_AIServiceServicer_to_server(AIService(), server)
    
    port = "50051"
    server.add_insecure_port(f'[::]:{port}')
    server.start()
    logging.info(f"AI gRPC Service server started, listening on {port}")
    server.wait_for_termination()

if __name__ == '__main__':
    serve()