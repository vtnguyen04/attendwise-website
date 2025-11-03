import cv2 as cv
import numpy as np
import os
import torch
import math
import mediapipe as mp
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


class BlinkDetector:
    """A class for detecting eye blinking in facial images using MediaPipe"""

    def __init__(self, ear_threshold=0.25, consecutive_frames=3):
        # Khởi tạo MediaPipe Face Mesh
        self.mp_face_mesh = mp.solutions.face_mesh
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles

        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False,  # False để xử lý real-time
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

        # Cấu hình chớp mắt
        self.EYE_AR_THRESH = ear_threshold
        self.EYE_AR_CONSEC_FRAMES = consecutive_frames
        self.counter = 0
        self.total = 0
        self.ear_history = []
        self.max_history = 50  # Lưu trữ 50 giá trị EAR gần nhất

    def eye_blink(self, rgb_image: np.ndarray, draw_landmarks=False, total=None):
        """
        Detects eye blinking in a given face region of an input RGB image.

        Parameters:
        - rgb_image (np.ndarray): Input RGB image as a numpy array.
        - draw_landmarks (bool): Whether to draw facial landmarks on image.
        - bgr_image (np.ndarray): BGR image for drawing (if different from rgb_image).

        Returns:
        - is_blinking (bool): True if blinking detected.
        - ear (float): Current Eye Aspect Ratio.
        - total_blinks (int): Total blinks counted.
        """

        # Nếu cần vẽ và không có bgr_image, convert RGB sang BGR
        bgr_image = cv.cvtColor(rgb_image, cv.COLOR_RGB2BGR)

        # Phát hiện các điểm landmark trên khuôn mặt
        logging.info("BlinkDetector: Calling face_mesh.process...")
        results = self.face_mesh.process(rgb_image)
        logging.info("BlinkDetector: face_mesh.process finished.")

        ear = 0.0
        is_blinking = False

        if results.multi_face_landmarks:
            logging.info("BlinkDetector: Face landmarks detected.")
            # Lấy landmarks của khuôn mặt đầu tiên
            face_landmarks = results.multi_face_landmarks[0]

            # Vẽ landmarks nếu được yêu cầu
            if draw_landmarks and bgr_image is not None:
                self.draw_facial_landmarks(bgr_image, face_landmarks)

            # Trích xuất tọa độ các điểm mắt
            logging.info("BlinkDetector: Extracting eye points...")
            left_eye_points = self.get_eye_points(face_landmarks, "left")
            right_eye_points = self.get_eye_points(face_landmarks, "right")
            logging.info("BlinkDetector: Eye points extracted.")

            if len(left_eye_points) > 0 and len(right_eye_points) > 0:
                # Tính EAR cho cả hai mắt
                logging.info("BlinkDetector: Calculating EAR...")
                leftEAR = self.eye_aspect_ratio(left_eye_points)
                rightEAR = self.eye_aspect_ratio(right_eye_points)
                logging.info(f"BlinkDetector: EAR calculated - Left: {leftEAR:.2f}, Right: {rightEAR:.2f}")

                # Tính trung bình EAR
                ear = (leftEAR + rightEAR) / 2.0

                # Lưu lịch sử EAR
                self.ear_history.append(ear)
                if len(self.ear_history) > self.max_history:
                    self.ear_history.pop(0)

                # Vẽ EAR và số lần chớp mắt lên ảnh
                if draw_landmarks and bgr_image is not None:
                    self.draw_info(bgr_image, ear)

                # Kiểm tra chớp mắt
                if ear < self.EYE_AR_THRESH:
                    self.counter += 1
                else:
                    if self.counter >= self.EYE_AR_CONSEC_FRAMES:
                        self.total += 1
                        is_blinking = True
                    self.counter = 0

        return self.total == total, ear, self.total

    def get_eye_points(self, face_landmarks, eye_side):
        """Trích xuất các điểm landmark của mắt từ FaceMesh"""
        # Các chỉ số điểm landmark cho mắt trong MediaPipe FaceMesh
        if eye_side == "left":
            # Các điểm chính của mắt trái (6 điểm quan trọng để tính EAR)
            eye_indices = [33, 160, 158, 133, 153, 145]  # 6 điểm chính
        else:  # right eye
            # Các điểm chính của mắt phải
            eye_indices = [362, 385, 387, 263, 373, 380]  # 6 điểm chính

        eye_points = []
        for idx in eye_indices:
            landmark = face_landmarks.landmark[idx]
            # Convert normalized coordinates to pixel coordinates
            x = landmark.x
            y = landmark.y
            eye_points.append([x, y])

        return np.array(eye_points)

    def eye_aspect_ratio(self, eye):
        """Tính Eye Aspect Ratio (EAR)"""
        # eye là array các điểm [x, y] normalized (0-1)
        try:
            # Tính khoảng cách Euclidean giữa các cặp điểm dọc
            A = math.dist(eye[1], eye[5])  # Khoảng cách giữa điểm 1 và 5
            B = math.dist(eye[2], eye[4])  # Khoảng cách giữa điểm 2 và 4

            # Tính khoảng cách Euclidean giữa các điểm ngang
            C = math.dist(eye[0], eye[3])  # Khoảng cách giữa điểm 0 và 3

            # Tránh chia cho 0
            if C == 0:
                return 0.0

            # Tính EAR
            ear = (A + B) / (2.0 * C)
            return ear
        except:
            return 0.0

    def draw_facial_landmarks(self, image, face_landmarks):
        """Vẽ các điểm landmark lên ảnh"""
        # Vẽ mesh toàn bộ khuôn mặt
        self.mp_drawing.draw_landmarks(
            image=image,
            landmark_list=face_landmarks,
            connections=self.mp_face_mesh.FACEMESH_TESSELATION,
            landmark_drawing_spec=None,
            connection_drawing_spec=self.mp_drawing_styles.get_default_face_mesh_tesselation_style(),
        )

        # Vẽ contour khuôn mặt
        self.mp_drawing.draw_landmarks(
            image=image,
            landmark_list=face_landmarks,
            connections=self.mp_face_mesh.FACEMESH_CONTOURS,
            landmark_drawing_spec=None,
            connection_drawing_spec=self.mp_drawing_styles.get_default_face_mesh_contours_style(),
        )

    def draw_info(self, image, ear):
        """Vẽ thông tin EAR và số lần chớp mắt lên ảnh"""
        # Vẽ EAR
        cv.putText(
            image,
            f"EAR: {ear:.2f}",
            (10, 30),
            cv.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2,
        )

        # Vẽ số lần chớp mắt
        cv.putText(
            image,
            f"Blinks: {self.total}",
            (10, 60),
            cv.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2,
        )

        # Vẽ counter
        cv.putText(
            image,
            f"Counter: {self.counter}",
            (10, 90),
            cv.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2,
        )

        # Vẽ threshold
        cv.putText(
            image,
            f"Threshold: {self.EYE_AR_THRESH:.2f}",
            (10, 120),
            cv.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2,
        )

    def get_ear_history(self):
        """Lấy lịch sử EAR"""
        return self.ear_history.copy()

    def reset_counter(self):
        """Reset bộ đếm"""
        self.counter = 0
        self.total = 0
        self.ear_history = []

    def set_threshold(self, threshold):
        """Thiết lập ngưỡng EAR"""
        self.EYE_AR_THRESH = threshold

    def set_consecutive_frames(self, frames):
        """Thiết lập số frame liên tiếp để xác nhận chớp mắt"""
        self.EYE_AR_CONSEC_FRAMES = frames


# Hàm tiện ích để test real-time
def test_realtime():
    """Test real-time eye blink detection"""
    # Cài đặt cần thiết:
    # pip install mediapipe opencv-python

    blink_detector = BlinkDetector(ear_threshold=0.25, consecutive_frames=3)

    # Mở camera
    cap = cv.VideoCapture(0)

    # Kiểm tra camera
    if not cap.isOpened():
        print("Không thể mở camera")
        return

    print("Nhấn 'q' để thoát")
    print("Nhấn 'r' để reset bộ đếm")
    print("Nhấn '+'/'-' để điều chỉnh ngưỡng EAR")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Không thể đọc frame từ camera")
            break

        # Convert BGR sang RGB (MediaPipe yêu cầu RGB)
        rgb_frame = cv.cvtColor(frame, cv.COLOR_BGR2RGB)

        # Phát hiện chớp mắt và vẽ landmarks
        is_blinking, ear, total_blinks = blink_detector.eye_blink(
            rgb_frame, draw_landmarks=True, bgr_image=frame
        )

        # Hiển thị thông báo chớp mắt
        if is_blinking:
            cv.putText(
                frame,
                "BLINK DETECTED!",
                (200, 50),
                cv.FONT_HERSHEY_SIMPLEX,
                1,
                (0, 0, 255),
                3,
            )

        # Hiển thị frame
        cv.imshow("Eye Blink Detection", frame)

        # Xử lý phím nhấn
        key = cv.waitKey(1) & 0xFF
        if key == ord("q"):
            break
        elif key == ord("r"):
            blink_detector.reset_counter()
            print("Bộ đếm đã được reset")
        elif key == ord("+"):
            new_thresh = min(0.5, blink_detector.EYE_AR_THRESH + 0.05)
            blink_detector.set_threshold(new_thresh)
            print(f"Ngưỡng EAR: {new_thresh:.2f}")
        elif key == ord("-"):
            new_thresh = max(0.1, blink_detector.EYE_AR_THRESH - 0.05)
            blink_detector.set_threshold(new_thresh)
            print(f"Ngưỡng EAR: {new_thresh:.2f}")

    # Giải phóng tài nguyên
    cap.release()
    cv.destroyAllWindows()
    print(f"Tổng số lần chớp mắt phát hiện: {blink_detector.total}")


# Hàm test với ảnh tĩnh
def test_static_image(image_path):
    """Test với ảnh tĩnh"""
    blink_detector = BlinkDetector()

    # Đọc ảnh
    image = cv.imread(image_path)
    if image is None:
        print(f"Không thể đọc ảnh từ {image_path}")
        return

    # Convert BGR sang RGB
    rgb_image = cv.cvtColor(image, cv.COLOR_BGR2RGB)

    # Phát hiện chớp mắt
    is_blinking, ear, total_blinks = blink_detector.eye_blink(
        rgb_image, draw_landmarks=True, bgr_image=image
    )

    print(f"Chớp mắt: {is_blinking}")
    print(f"EAR: {ear:.2f}")
    print(f"Tổng số lần chớp: {total_blinks}")

    # Hiển thị kết quả
    cv.imshow("Static Image Result", image)
    cv.waitKey(0)
    cv.destroyAllWindows()


if __name__ == "__main__":
    # Chạy test real-time
    test_realtime()

    # Hoặc test với ảnh tĩnh (bỏ comment dòng dưới và cung cấp đường dẫn ảnh)
    # test_static_image('path_to_your_image.jpg')
