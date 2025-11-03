# flask_frontend/app.py

import requests
from flask import Flask, render_template, request, redirect, url_for, session, flash, send_file
from flask_session import Session # Import thư viện quản lý session phía server
import os
import base64
import json
import io # Import thư viện để làm việc với dữ liệu bytes trong bộ nhớ

app = Flask(__name__)

# --- CẤU HÌNH SERVER-SIDE SESSION (RẤT QUAN TRỌNG) ---
# Bước này giải quyết lỗi "cookie is too large".
# Thay vì lưu tất cả dữ liệu vào cookie, chúng ta chỉ lưu 1 ID nhỏ,
# còn toàn bộ dữ liệu sẽ được lưu vào một file trên server.

# Khóa bí mật để ký (mã hóa) ID session gửi cho trình duyệt.
app.config['SECRET_KEY'] = os.urandom(24) 
# Sử dụng hệ thống file ('filesystem') để lưu trữ dữ liệu session.
app.config['SESSION_TYPE'] = 'filesystem'
# Không làm cho session tồn tại vĩnh viễn khi đóng trình duyệt.
app.config['SESSION_PERMANENT'] = False
# Áp dụng cấu hình trên cho ứng dụng Flask.
Session(app)
# ----------------------------------------------------

ORCHESTRATOR_API_URL = os.getenv('ORCHESTRATOR_API_URL', "http://localhost:8002")

@app.route('/')
def index():
    """Route chính, hiển thị giao diện người dùng."""
    kyc_session = session.get('kyc_session', {})
    return render_template('index.html', kyc_session=kyc_session)

@app.route('/image/<side>')
def get_session_image(side):
    """
    Route chuyên dụng chỉ để phục vụ việc hiển thị ảnh đã được lưu trong session.
    Thẻ <img> trong HTML sẽ gọi đến đây.
    """
    kyc_session = session.get('kyc_session', {})
    # Lấy dữ liệu bytes của ảnh từ session
    image_bytes = kyc_session.get('data', {}).get(f'{side}_image_bytes')
    
    if not image_bytes:
        return "Không tìm thấy ảnh trong session", 404
    
    # Sử dụng send_file để trả về ảnh cho trình duyệt một cách an toàn và hiệu quả
    return send_file(io.BytesIO(image_bytes), mimetype='image/jpeg')

@app.route('/start_kyc', methods=['POST'])
def start_kyc():
    """Bắt đầu một phiên KYC mới bằng cách gọi Orchestrator."""
    try:
        response = requests.post(f"{ORCHESTRATOR_API_URL}/kyc/session", timeout=10)
        response.raise_for_status() # Báo lỗi nếu status code là 4xx hoặc 5xx
        data = response.json()
        # Khởi tạo session mới (Flask-Session sẽ lưu nó trên server)
        session['kyc_session'] = {
            'session_id': data['session_id'],
            'status': data['status'],
            'data': {} # Khởi tạo dict để chứa dữ liệu các bước
        }
        flash("Tạo phiên KYC thành công!", "success")
    except requests.exceptions.RequestException as e:
        flash(f"LỖI KẾT NỐI: Không thể gọi đến Orchestrator. Chi tiết: {e}", "danger")
    return redirect(url_for('index'))

@app.route('/upload_id_card/<side>', methods=['POST'])
def upload_id_card(side):
    """Xử lý việc tải lên ảnh CCCD (mặt trước hoặc mặt sau)."""
    kyc_session = session.get('kyc_session')
    if not kyc_session:
        return redirect(url_for('index'))

    image_file = request.files.get(f'{side}_image')
    if not image_file or image_file.filename == '':
        flash("Vui lòng chọn một file ảnh.", "warning")
        return redirect(url_for('index'))
    
    image_bytes = image_file.read()

    session_id = kyc_session['session_id']
    url = f"{ORCHESTRATOR_API_URL}/kyc/session/{session_id}/{side}"
    files = {'image': (image_file.filename, image_bytes, image_file.mimetype)}

    try:
        response = requests.post(url, files=files, timeout=60)
        data = response.json()

        if response.ok:
            # Lưu dữ liệu OCR vào session
            kyc_session['data'][f'{side}_id_data'] = data.get('data', {})
            # Lưu thẳng dữ liệu bytes của ảnh vào session để hiển thị lại
            kyc_session['data'][f'{side}_image_bytes'] = image_bytes
            # Đặt cờ để giao diện biết đang ở bước xác nhận thông tin
            kyc_session['confirming_step'] = side 
            session['kyc_session'] = kyc_session # Cập nhật session trên server
            flash(f"Trích xuất thông tin mặt '{side}' thành công. Vui lòng kiểm tra.", "info")
        else:
            error_detail = data.get('error', data.get('detail', 'Lỗi không xác định từ backend.'))
            flash(f"Backend báo lỗi: {error_detail}", "danger")

    except requests.exceptions.RequestException as e:
        flash(f"LỖI KẾT NỐI: Không thể giao tiếp với backend. Chi tiết: {e}", "danger")
    except Exception as e:
        flash(f"Lỗi không xác định trong ứng dụng Flask: {e}", "danger")
    
    return redirect(url_for('index'))

@app.route('/confirm_step/<side>', methods=['POST'])
def confirm_step(side):
    """Xử lý khi người dùng nhấn nút 'Thông tin chính xác'."""
    kyc_session = session.get('kyc_session')
    if not kyc_session: return redirect(url_for('index'))
    try:
        response = requests.get(f"{ORCHESTRATOR_API_URL}/kyc/session/{kyc_session['session_id']}")
        status_response = response.json()
        kyc_session['status'] = status_response.get('status')
        kyc_session.pop('confirming_step', None) # Xóa cờ xác nhận để chuyển sang bước tiếp theo
        session['kyc_session'] = kyc_session
        flash("Thông tin đã được xác nhận.", "success")
    except Exception as e:
        flash(f"Lỗi khi xác nhận bước: {e}", "danger")
    return redirect(url_for('index'))

@app.route('/retry_step/<side>', methods=['POST'])
def retry_step(side):
    """Xử lý khi người dùng nhấn nút 'Sai thông tin, Thử lại'."""
    kyc_session = session.get('kyc_session')
    if not kyc_session: return redirect(url_for('index'))
    
    # Xóa dữ liệu của bước hiện tại để thực hiện lại
    kyc_session['data'].pop(f'{side}_id_data', None)
    kyc_session['data'].pop(f'{side}_image_bytes', None) 
    kyc_session.pop('confirming_step', None)

    # Chuyển trạng thái về bước upload tương ứng
    if side == 'front': kyc_session['status'] = 'AWAITING_FRONT_ID'
    elif side == 'back': kyc_session['status'] = 'AWAITING_BACK_ID'
    
    session['kyc_session'] = kyc_session
    flash(f"Vui lòng tải lại ảnh mặt {side}.", "warning")
    return redirect(url_for('index'))

@app.route('/upload_selfie', methods=['POST'])
def upload_selfie():
    """Xử lý ảnh selfie chụp từ webcam cho bước Passive Liveness."""
    kyc_session = session.get('kyc_session')
    if not kyc_session: return redirect(url_for('index'))
    image_data_url = request.form.get('selfie_image_data')
    try:
        header, encoded = image_data_url.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        session_id = kyc_session['session_id']
        url = f"{ORCHESTRATOR_API_URL}/kyc/session/{session_id}/selfie-passive-check"
        files = {'image': ('selfie.jpg', image_bytes, 'image/jpeg')}
        response = requests.post(url, files=files, timeout=60)
        data = response.json()
        if response.ok:
            # Cập nhật trạng thái mới từ Orchestrator
            kyc_session['status'] = data.get('status')
            session['kyc_session'] = kyc_session
            flash("Kiểm tra Passive Liveness thành công!", "success")
        else:
            error_detail = data.get('error', data.get('detail', 'Lỗi không xác định.'))
            flash(f"Liveness không thành công: {error_detail}. Vui lòng thử lại.", "danger")
            kyc_session['status'] = 'AWAITING_SELFIE'
        session['kyc_session'] = kyc_session
    except Exception as e:
        flash(f"Lỗi khi xử lý selfie: {e}", "danger")
    return redirect(url_for('index'))
    
@app.route('/confirm_active_liveness_success', methods=['POST'])
def confirm_active_liveness_success():
    """
    Endpoint này được JS gọi sau khi Active Liveness thành công.
    Nó sẽ gọi đến Orchestrator để cập nhật trạng thái chính thức.
    """
    kyc_session = session.get('kyc_session')
    if not kyc_session: return {"error": "No session"}, 400
    try:
        session_id = kyc_session['session_id']
        url = f"{ORCHESTRATOR_API_URL}/kyc/session/{session_id}/confirm-active-liveness"
        response = requests.post(url)
        response.raise_for_status()
        
        data = response.json()
        kyc_session['status'] = data.get('status')
        session['kyc_session'] = kyc_session
        return {"status": "ok"}, 200
    except Exception as e:
        return {"error": str(e)}, 500
    
@app.route('/verify_final', methods=['POST'])
def verify_final():
    """Kích hoạt bước xác thực cuối cùng: so sánh khuôn mặt và hoàn tất."""
    kyc_session = session.get('kyc_session')
    if not kyc_session: return redirect(url_for('index'))
    try:
        session_id = kyc_session['session_id']
        url = f"{ORCHESTRATOR_API_URL}/kyc/session/{session_id}/verify-final"
        response = requests.post(url, timeout=60)
        data = response.json()

        if data.get("success"):
            kyc_session['status'] = data.get('final_status')
            flash(f"Xác thực hoàn tất! Kết quả: {kyc_session['status']}", "success")
        else:
            kyc_session['status'] = data.get('status', 'REJECTED')
            flash(f"Xác thực thất bại: {data.get('error', 'Lỗi không xác định')}", "danger")

        kyc_session['final_result'] = data
        session['kyc_session'] = kyc_session

    except Exception as e:
        flash(f"Lỗi khi xác thực cuối cùng: {e}", "danger")
    return redirect(url_for('index'))

@app.route('/reset')
def reset():
    """Xóa session hiện tại để bắt đầu lại từ đầu."""
    session.clear() # Xóa session trên server
    flash("Đã làm mới phiên. Bạn có thể bắt đầu lại.", "info")
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, port=5000)