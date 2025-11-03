import cv2
import time

# --- CONFIGURATION ---
OUTPUT_VIDEO_PATH = "liveness_video.webm"
VIDEO_WIDTH = 640
VIDEO_HEIGHT = 480
VIDEO_FPS = 20.0

# Sequence of challenges to display to the user
CHALLENGES = [
    ("Look STRAIGHT at the camera", 4),
    ("Turn your head to the LEFT", 3),
    ("Turn your head to the RIGHT", 3),
    ("Look STRAIGHT again", 2),
    ("Blink your eyes slowly 3 times", 4),
]

# --- SCRIPT ---

def main():
    """Opens the camera, guides the user through liveness challenges, and records a video."""
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Error: Could not open camera. Please check if it is connected and not in use.")
        return

    # Define the codec and create VideoWriter object
    # Using VP80 codec for .webm format
    fourcc = cv2.VideoWriter_fourcc(*'VP80')
    out = cv2.VideoWriter(OUTPUT_VIDEO_PATH, fourcc, VIDEO_FPS, (VIDEO_WIDTH, VIDEO_HEIGHT))

    print("="*50)
    print("📷 Liveness Video Capture Tool")
    print("="*50)
    print("INSTRUCTIONS:")
    print("- A window will open showing your camera feed.")
    print("- Follow the instructions displayed on the screen.")
    print("- Press 'S' to START recording when ready.")
    print("- The script will guide you through the challenges.")
    print("- Recording will STOP automatically.")
    print("- Press 'Q' at any time to quit.")
    print("-"*50)

    recording = False
    start_time = 0
    challenge_index = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Error: Can't receive frame (stream end?). Exiting ...")
            break

        frame = cv2.resize(frame, (VIDEO_WIDTH, VIDEO_HEIGHT))
        display_frame = frame.copy()

        key = cv2.waitKey(1) & 0xFF

        if key == ord('q'):
            print("Quitting...")
            break

        if not recording:
            if key == ord('s'):
                print("\n▶️ Recording started! Get ready for the first challenge...")
                recording = True
                start_time = time.time()
                challenge_index = 0
            else:
                cv2.putText(display_frame, "Press 'S' to Start Recording", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        else: # If recording
            elapsed_time = time.time() - start_time
            
            if challenge_index < len(CHALLENGES):
                challenge_text, challenge_duration = CHALLENGES[challenge_index]
                
                # Display current challenge
                cv2.putText(display_frame, f"Challenge: {challenge_text}", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                
                # Write frame to video file
                out.write(frame)

                # Check if it's time to move to the next challenge
                if elapsed_time > challenge_duration:
                    start_time = time.time() # Reset timer for next challenge
                    challenge_index += 1
                    if challenge_index < len(CHALLENGES):
                        print(f"Next challenge: {CHALLENGES[challenge_index][0]}")
            else:
                print("\n⏹️ All challenges completed. Stopping recording.")
                break # Exit loop to stop recording

        cv2.imshow('Liveness Capture - Press Q to Quit', display_frame)

    # Release everything when done
    cap.release()
    out.release()
    cv2.destroyAllWindows()

    if recording:
        print("\n" + "-"*50)
        print(f"✅ Video saved successfully to: {OUTPUT_VIDEO_PATH}")
        print("You can now re-run the E2E test.")
        print("-"*50)
    else:
        print("\nNo video was recorded.")

if __name__ == "__main__":
    main()
