# orchestrator_service/kyc_workflow.py

import httpx
import uuid
from typing import Dict, Union

# --- Cấu hình ---
# Đây là địa chỉ của các microservice khác mà Orchestrator sẽ gọi đến.
# Đảm bảo các cổng (port) này khớp với các service bạn đang chạy.
ID_SERVICE_URL = "http://127.0.0.1:8000"    # Dịch vụ xử lý CCCD
FACE_SERVICE_URL = "http://127.0.0.1:8001"  # Dịch vụ xử lý khuôn mặt (Liveness, Verify)


# --- Database Giả lập ---
# Trong một ứng dụng thực tế, bạn sẽ thay thế dictionary này bằng một
# kết nối đến database thực sự như PostgreSQL, MongoDB hoặc một cache như Redis
# để lưu trữ trạng thái của các phiên làm việc.
kyc_sessions: Dict[str, Dict] = {}


class KYCWorkflow:
    """
    Lớp điều phối chính, quản lý toàn bộ luồng nghiệp vụ E-KYC.
    Nó hoạt động như một "máy trạng thái" (state machine) cho mỗi phiên KYC,
    chuyển người dùng qua từng bước của quy trình.
    """
    def create_new_session(self) -> str:
        """
        Bắt đầu một quy trình E-KYC mới bằng cách tạo một session duy nhất.
        """
        session_id = str(uuid.uuid4())
        kyc_sessions[session_id] = {
            "session_id": session_id,
            "status": "AWAITING_FRONT_ID",
            "front_id_data": None,
            "back_id_data": None,
            "front_id_image": None,  # Sẽ lưu ảnh mặt trước dạng bytes để so sánh sau
            "selfie_image": None,    # Sẽ lưu ảnh selfie dạng bytes để so sánh sau
            "verification_result": None # Lưu kết quả so sánh khuôn mặt chi tiết
        }
        print(f">>> Orchestrator: Session mới được tạo: {session_id}")
        return session_id

    def get_session_status(self, session_id: str) -> Union[Dict, None]:
        """
        Lấy thông tin và trạng thái hiện tại của một phiên.
        """
        return kyc_sessions.get(session_id)

    async def process_front_side(self, session_id: str, image_bytes: bytes) -> Dict:
        """
        Gửi ảnh mặt trước đến ID Service, trích xuất thông tin và cập nhật phiên.
        """
        session = self.get_session_status(session_id)

        # Cho phép người dùng thử lại bước này, trừ khi phiên đã ở các trạng thái cuối cùng.
        if not session or session["status"] in ["VERIFYING", "APPROVED", "REJECTED", "MANUAL_REVIEW"]:
            error_msg = f"Không thể thực hiện lại bước này ở trạng thái '{session.get('status', 'Không xác định')}'."
            return {"success": False, "error": error_msg}

        print(f">>> Orchestrator (Session: {session_id}): Đang gửi ảnh mặt trước đến ID Service...")
        async with httpx.AsyncClient(timeout=60.0) as client:
            files = {'image': ('front.jpg', image_bytes, 'image/jpeg')}
            data = {'card_side': 'front'}
            try:
                response = await client.post(f"{ID_SERVICE_URL}/process-id-card/", files=files, data=data)
                response.raise_for_status()  # Báo lỗi nếu status code là 4xx hoặc 5xx

                session["front_id_data"] = response.json()
                session["front_id_image"] = image_bytes # Lưu lại ảnh để dùng cho Face Verification

                # [QUAN TRỌNG] Nếu người dùng quay lại bước này từ các bước sau,
                # chúng ta phải xóa dữ liệu của các bước đó đi để đảm bảo tính toàn vẹn.
                session["back_id_data"] = None
                session["selfie_image"] = None
                session["verification_result"] = None

                session["status"] = "AWAITING_BACK_ID"
                print(f">>> Orchestrator (Session: {session_id}): Xử lý mặt trước thành công.")
                return {"success": True, "data": session["front_id_data"]}
            except httpx.HTTPStatusError as e:
                error_detail = e.response.json().get("detail", e.response.text)
                print(f">>> Orchestrator (Session: {session_id}): Lỗi xử lý mặt trước - {error_detail}")
                return {"success": False, "error": f"Lỗi từ ID Service: {error_detail}"}
            except httpx.RequestError as e:
                print(f">>> Orchestrator (Session: {session_id}): Không thể kết nối đến ID Service - {e}")
                return {"success": False, "error": "Không thể kết nối đến Dịch vụ Xử lý Giấy tờ."}


    async def process_back_side(self, session_id: str, image_bytes: bytes) -> Dict:
        """
        Gửi ảnh mặt sau đến ID Service và cập nhật phiên.
        """
        session = self.get_session_status(session_id)
        if not session or session.get("front_id_data") is None:
            return {"success": False, "error": "Vui lòng hoàn thành bước xử lý mặt trước."}

        print(f">>> Orchestrator (Session: {session_id}): Đang gửi ảnh mặt sau đến ID Service...")
        async with httpx.AsyncClient(timeout=60.0) as client:
            files = {'image': ('back.jpg', image_bytes, 'image/jpeg')}
            data = {'card_side': 'back'}
            try:
                response = await client.post(f"{ID_SERVICE_URL}/process-id-card/", files=files, data=data)
                response.raise_for_status()

                session["back_id_data"] = response.json()
                session["status"] = "AWAITING_SELFIE" # Chuyển sang chờ selfie
                print(f">>> Orchestrator (Session: {session_id}): Xử lý mặt sau thành công.")
                return {"success": True, "data": session["back_id_data"]}
            except httpx.HTTPStatusError as e:
                error_detail = e.response.json().get("detail", e.response.text)
                print(f">>> Orchestrator (Session: {session_id}): Lỗi xử lý mặt sau - {error_detail}")
                return {"success": False, "error": f"Lỗi từ ID Service: {error_detail}"}
            except httpx.RequestError as e:
                print(f">>> Orchestrator (Session: {session_id}): Không thể kết nối đến ID Service - {e}")
                return {"success": False, "error": "Không thể kết nối đến Dịch vụ Xử lý Giấy tờ."}


    async def process_initial_selfie(self, session_id: str, image_bytes: bytes) -> Dict:
        """
        Thực hiện quy trình kiểm tra kết hợp: Passive Liveness và Face Verification.
        """
        session = self.get_session_status(session_id)
        if not session or session["status"] not in ["AWAITING_SELFIE", "AWAITING_ACTIVE_LIVENESS"]:
            return {"success": False, "error": "Phiên không hợp lệ hoặc không đúng trạng thái."}

        # Lấy ảnh CCCD mặt trước đã được lưu từ bước trước
        id_card_image = session.get("front_id_image")
        if not id_card_image:
            return {"success": False, "error": "Không tìm thấy ảnh CCCD trong phiên để so sánh."}

        # Ảnh được gửi lên từ hàm này chính là ảnh selfie
        selfie_image_bytes = image_bytes

        print(f">>> Orchestrator (Session: {session_id}): Đang gửi ảnh CCCD và Selfie đến Face Service để kiểm tra kết hợp...")
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                # Chuẩn bị payload với CẢ HAI ảnh
                files = {
                    "id_card_image": ('id_front.jpg', id_card_image, 'image/jpeg'),
                    "selfie_image": ('selfie.jpg', selfie_image_bytes, 'image/jpeg')
                }
                
                # Gọi đến endpoint API mới
                response = await client.post(f"{FACE_SERVICE_URL}/liveness/combined-check", files=files)
                response.raise_for_status() # Ném lỗi nếu Face Service trả về 4xx/5xx
                
                # Nếu không có lỗi, tức là cả liveness và verify đều thành công
                print(f">>> Orchestrator (Session: {session_id}): Kiểm tra kết hợp (Liveness + Verify) THÀNH CÔNG.")
                session["selfie_image"] = selfie_image_bytes # Lưu lại ảnh selfie
                session["status"] = "AWAITING_ACTIVE_LIVENESS"
                return {"success": True, "status": "AWAITING_ACTIVE_LIVENESS"}

            except httpx.HTTPStatusError as e:
                # Bắt lỗi 400 từ Face Service, nghĩa là liveness hoặc verify thất bại
                try:
                    # Lấy lý do chi tiết từ payload lỗi
                    reason = e.response.json().get("detail", {}).get("reason", "Lý do không xác định")
                except:
                    reason = e.response.text
                
                print(f">>> Orchestrator (Session: {session_id}): Kiểm tra kết hợp THẤT BẠI. Lý do: {reason}")
                return {"success": False, "status": "AWAITING_SELFIE", "error": f"Xác thực thất bại: {reason}"}
            
            except httpx.RequestError as e:
                # Bắt lỗi khi không kết nối được
                print(f">>> Orchestrator (Session: {session_id}): Không thể kết nối tới Face Service - {e}")
                return {"success": False, "status": "AWAITING_SELFIE", "error": "Không thể kết nối đến Dịch vụ Xử lý Khuôn mặt."}

    def confirm_active_liveness_passed(self, session_id: str) -> Dict:
        """
        Được gọi bởi Frontend để xác nhận người dùng đã hoàn thành luồng thử thách tương tác.
        Đây là một bước chuyển đổi trạng thái đơn giản.
        """
        session = self.get_session_status(session_id)
        if not session or session["status"] != "AWAITING_ACTIVE_LIVENESS":
             return {"success": False, "error": "Phiên không ở trạng thái chờ xác nhận active liveness."}

        session["status"] = "ACTIVE_LIVENESS_PASSED"
        print(f">>> Orchestrator (Session: {session_id}): Xác nhận hoàn thành Active Liveness Challenge.")
        return {"success": True, "status": "ACTIVE_LIVENESS_PASSED"}

    async def run_final_verification(self, session_id: str) -> Dict:
        """
        Thực hiện bước xác thực cuối cùng và quan trọng nhất:
        So sánh khuôn mặt trên CCCD và ảnh selfie.
        """
        session = self.get_session_status(session_id)
        if not session or session["status"] != "ACTIVE_LIVENESS_PASSED":
             return {"success": False, "error": "Chưa hoàn thành các bước liveness cần thiết."}

        # 1. Lấy ảnh đã lưu từ các bước trước.
        id_card_image = session.get("front_id_image")
        selfie_image = session.get("selfie_image")

        if not id_card_image or not selfie_image:
            return {"success": False, "error": "Thiếu ảnh CCCD hoặc ảnh selfie để so sánh."}

        session["status"] = "VERIFYING" # Chuyển trạng thái sang đang xác thực
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                # 2. Chuẩn bị payload dạng multipart/form-data.
                files = {
                    "image1": ('id_front.jpg', id_card_image, 'image/jpeg'),
                    "image2": ('selfie.jpg', selfie_image, 'image/jpeg')
                }
                
                print(f">>> Orchestrator (Session: {session_id}): Đang gửi ảnh CCCD và Selfie đến Face Service để xác minh...")
                
                # 3. GỌI ENDPOINT SO SÁNH KHUÔN MẶT CỐT LÕI.
                response = await client.post(f"{FACE_SERVICE_URL}/verify-faces/", files=files)
                response.raise_for_status()

                # 4. Diễn giải kết quả chi tiết từ Face Service.
                face_verification_result = response.json()
                session["verification_result"] = face_verification_result
                
                is_verified = face_verification_result.get("verified", False)
                error_message = face_verification_result.get("error")

                if error_message:
                    # Nếu Face Service trả về lỗi (ví dụ: không tìm thấy mặt trong ảnh)
                    session["status"] = "MANUAL_REVIEW"
                    print(f">>> Orchestrator (Session: {session_id}): Face Service trả về lỗi - {error_message}")
                    return {"success": False, "status": "MANUAL_REVIEW", "error": f"Lỗi xác thực khuôn mặt: {error_message}", "details": session}

                if not is_verified:
                    # Nếu hai khuôn mặt được xác định là KHÔNG KHỚP.
                    session["status"] = "REJECTED"
                    rejection_reason = f"Khuôn mặt không khớp."
                    print(f">>> Orchestrator (Session: {session_id}): Xác thực khuôn mặt THẤT BẠI. Lý do: {rejection_reason}")
                    # Trả về success=True vì quy trình chạy thành công, nhưng kết quả cuối cùng là REJECTED.
                    return {"success": True, "final_status": "REJECTED", "details": session}
                
                print(f">>> Orchestrator (Session: {session_id}): Xác minh khuôn mặt THÀNH CÔNG.")
                
                # 5. Tại đây, bạn có thể thêm các bước kiểm tra logic nghiệp vụ khác nếu cần.
                # Ví dụ: kiểm tra thông tin với cơ sở dữ liệu có sẵn, kiểm tra blacklist...

            except httpx.RequestError as e:
                # Bắt lỗi kết nối hoặc các lỗi mạng khác
                session["status"] = "MANUAL_REVIEW" # Chuyển sang review thủ công khi có lỗi hệ thống
                print(f">>> Orchestrator (Session: {session_id}): Lỗi khi gọi API xác thực cuối cùng - {e}")
                return {"success": False, "status": "MANUAL_REVIEW", "error": f"Lỗi giao tiếp với Face Service: {e}", "details": session}
        
        # Nếu tất cả các bước trên đều thành công
        session["status"] = "APPROVED"
        print(f">>> Orchestrator (Session: {session_id}): Quy trình KYC hoàn tất và được CHẤP THUẬN.")
        return {"success": True, "final_status": "APPROVED", "details": session}