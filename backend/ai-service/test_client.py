
import grpc
import logging
import sys
import os

# --- Path setup ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(CURRENT_DIR, 'generated'))

import generated.ai.ai_pb2 as ai_pb2
import generated.ai.ai_pb2_grpc as ai_pb2_grpc

logging.basicConfig(level=logging.INFO)

def run():
    # NOTE: The channel must be insecure because we are not using TLS
    channel = grpc.insecure_channel(os.getenv('GRPC_AI_SERVICE_ADDR', 'localhost:50051'))
    stub = ai_pb2_grpc.AIServiceStub(channel)

    try:
        # Create a request for PerformLivenessCheck
        request = ai_pb2.LivenessCheckRequest(
            image_data=b'test',
            challenge_type='blink'
        )

        # Call the gRPC method
        logging.info("--- Calling PerformLivenessCheck ---")
        response = stub.PerformLivenessCheck(request)

        # Print the response
        logging.info(f"Liveness check response: is_live={response.is_live}, liveness_score={response.liveness_score}")
        if response.is_live:
            logging.info("✅ Direct gRPC call to PerformLivenessCheck was successful!")
        else:
            logging.error("❌ Direct gRPC call to PerformLivenessCheck failed.")

    except grpc.RpcError as e:
        logging.error(f"gRPC call failed: {e.code()} - {e.details()}")
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")

if __name__ == '__main__':
    run()
