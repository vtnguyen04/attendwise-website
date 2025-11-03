document.addEventListener('DOMContentLoaded', () => {

    // --- Cấu hình API Endpoints ---
    const ORCHESTRATOR_URL = "http://127.0.0.1:8002";
    const FACE_SERVICE_URL = "http://127.0.0.1:8001";

    // --- Lấy các phần tử trên trang (lấy một lần khi DOMContentLoaded) ---
    const startKycButton = document.getElementById('startKycButton');
    const kycSteps = document.getElementById('kyc-steps');
    const statusLog = document.getElementById('status-log');
    
    // Các container chính cho từng bước
    const frontIdCardDiv = document.getElementById('front-id-card');
    const backIdCardDiv = document.getElementById('back-id-card');
    const selfieCardDiv = document.getElementById('selfie-card');
    const activeLivenessCard = document.getElementById('active-liveness-card');
    const finalResultCard = document.getElementById('final-result-card'); // Đảm bảo đã có trong HTML

    // Input file cho từng bước
    const frontIdInput = document.getElementById('frontIdInput');
    const backIdInput = document.getElementById('backIdInput');
    const selfieInput = document.getElementById('selfieInput');
    
    // Các phần tử cho hiển thị dữ liệu trích xuất
    const frontIdDataDisplay = document.getElementById('front-id-data-display'); // Đảm bảo đã có trong HTML
    const backIdDataDisplay = document.getElementById('back-id-data-display');   // Đảm bảo đã có trong HTML
    const finalResultDisplay = document.getElementById('final-result-display'); // Đảm bảo đã có trong HTML

    // Các phần tử liên quan đến Active Liveness Camera (chúng là con của activeLivenessCard)
    let webcamElem = document.getElementById('webcam'); // Gán ban đầu, có thể cần lấy lại nếu innerHTML bị ghi đè
    let canvasElem = document.getElementById('canvas');   // Gán ban đầu
    let livenessInstructionElem = document.getElementById('liveness-instruction'); // Gán ban đầu
    let retryContainerElem = null; // Sẽ được gán khi startActiveLiveness chạy

    const resetKycButton = document.getElementById('resetKycButton'); // Đảm bảo đã có trong HTML

    // --- Biến toàn cục để lưu trạng thái ---
    let kycSessionId = null;
    let livenessInterval = null;
    let currentVideoStream = null; // Lưu trữ stream để dễ dàng tắt

    // --- Các hàm tiện ích ---
    function logStatus(message, isError = false) {
        console.log(message); // Ghi log vào console để debug
        const p = document.createElement('p');
        p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        p.className = isError ? 'text-danger' : 'text-success'; // Sử dụng class của Bootstrap
        statusLog.appendChild(p);
        statusLog.scrollTop = statusLog.scrollHeight; // Tự động cuộn xuống
    }

    // Hàm tiện ích: Hiển thị dữ liệu trích xuất từ JSON
    function displayExtractedData(element, data, title) {
        if (!element) {
            console.error(`Target element for displayExtractedData is null for title: ${title}`);
            return;
        }
        if (!data || Object.keys(data).length === 0) {
            element.innerHTML = `<p class="text-muted">Chưa có dữ liệu trích xuất.</p>`;
            return;
        }

        let html = title ? `<h6>${title}</h6>` : '';
        html += '<ul class="list-unstyled mb-0">';
        for (const key in data) {
            // Loại trừ các trường ảnh base64 nếu có để tránh chuỗi quá dài
            if (data.hasOwnProperty(key) && !key.toLowerCase().includes('image_b64') && !key.toLowerCase().includes('face_b64')) {
                let displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); // Format key đẹp hơn
                html += `<li><strong>${displayKey}:</strong> ${data[key]}</li>`;
            }
        }
        html += '</ul>';
        element.innerHTML = html;
        element.style.display = 'block'; // Đảm bảo div hiển thị
    }

    // Hàm chung để xử lý tải file lên Orchestrator
    async function handleFileUpload(endpoint, inputElement) {
        const file = inputElement.files[0];
        if (!file) {
            logStatus("Vui lòng chọn một file.", true);
            return null;
        }

        const formData = new FormData();
        formData.append('image', file);
        
        logStatus(`Đang tải lên: ${file.name}...`);
        inputElement.disabled = true;

        try {
            const response = await fetch(`${ORCHESTRATOR_URL}${endpoint}`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                // Xử lý lỗi từ server: server có thể trả về { "detail": "..." } hoặc { "error": "..." }
                const errorMessage = result.detail ? (typeof result.detail === 'string' ? result.detail : JSON.stringify(result.detail)) : (result.error || "Có lỗi xảy ra");
                throw new Error(errorMessage);
            }

            logStatus(`Tải lên thành công! Trạng thái mới: ${result.status || 'OK'}.`);
            return result; // Trả về toàn bộ kết quả để hàm gọi có thể dùng
        } catch (error) {
            logStatus(`Lỗi tải lên: ${error.message}. Vui lòng thử lại.`, true);
            inputElement.value = ''; // Xóa file đã chọn
            inputElement.disabled = false; // Bật lại để người dùng thử lại
            return null;
        }
    }
    
    // --- Logic Chính: Cập nhật UI dựa trên trạng thái KYC ---
    function updateUI(status, sessionData = null) {
        // Ẩn tất cả các bước và input trước
        [frontIdCardDiv, backIdCardDiv, selfieCardDiv, activeLivenessCard, finalResultCard].forEach(div => {
            if (div) div.style.display = 'none'; // Kiểm tra null
        });

        [frontIdInput, backIdInput, selfieInput].forEach(input => {
            if (input) input.disabled = true; // Kiểm tra null
        });

        // Đảm bảo tắt mọi stream camera nếu có
        if (currentVideoStream) {
            currentVideoStream.getTracks().forEach(track => track.stop());
            currentVideoStream = null;
        }
        if (livenessInterval) {
            clearInterval(livenessInterval);
            livenessInterval = null;
        }
        
        // Hiển thị và kích hoạt bước hiện tại
        switch(status) {
            case 'AWAITING_FRONT_ID':
                if (frontIdCardDiv) frontIdCardDiv.style.display = 'block';
                if (frontIdInput) frontIdInput.disabled = false;
                break;
            case 'AWAITING_BACK_ID':
                if (frontIdCardDiv) frontIdCardDiv.style.display = 'block';
                if (sessionData && sessionData.front_id_data) {
                    displayExtractedData(frontIdDataDisplay, sessionData.front_id_data, "Thông tin mặt trước:");
                } else {
                    displayExtractedData(frontIdDataDisplay, {}, "Thông tin mặt trước:"); // Xóa nếu không có dữ liệu
                }
                if (backIdCardDiv) backIdCardDiv.style.display = 'block';
                if (backIdInput) backIdInput.disabled = false;
                break;
            case 'AWAITING_SELFIE':
                if (frontIdCardDiv) frontIdCardDiv.style.display = 'block';
                if (sessionData && sessionData.front_id_data) {
                    displayExtractedData(frontIdDataDisplay, sessionData.front_id_data, "Thông tin mặt trước:");
                }
                if (backIdCardDiv) backIdCardDiv.style.display = 'block';
                if (sessionData && sessionData.back_id_data) {
                    displayExtractedData(backIdDataDisplay, sessionData.back_id_data, "Thông tin mặt sau:");
                } else {
                    displayExtractedData(backIdDataDisplay, {}, "Thông tin mặt sau:"); // Xóa nếu không có dữ liệu
                }
                if (selfieCardDiv) selfieCardDiv.style.display = 'block';
                if (selfieInput) selfieInput.disabled = false;
                break;
            case 'AWAITING_ACTIVE_LIVENESS':
                // Đảm bảo các bước trước đó vẫn hiển thị dữ liệu
                if (frontIdCardDiv) frontIdCardDiv.style.display = 'block';
                if (sessionData && sessionData.front_id_data) {
                    displayExtractedData(frontIdDataDisplay, sessionData.front_id_data, "Thông tin mặt trước:");
                }
                if (backIdCardDiv) backIdCardDiv.style.display = 'block';
                if (sessionData && sessionData.back_id_data) {
                    displayExtractedData(backIdDataDisplay, sessionData.back_id_data, "Thông tin mặt sau:");
                }
                if (selfieCardDiv) selfieCardDiv.style.display = 'block'; // Giữ lại selfie card

                logStatus("Đang khởi động thử thách tương tác...");
                if (activeLivenessCard) activeLivenessCard.style.display = 'block';
                startActiveLiveness(); // Bắt đầu logic camera
                break;
            case 'APPROVED':
            case 'REJECTED':
            case 'MANUAL_REVIEW':
                // Hiển thị tất cả các bước đã hoàn thành
                if (frontIdCardDiv) frontIdCardDiv.style.display = 'block';
                if (sessionData && sessionData.details && sessionData.details.front_id_data) {
                    displayExtractedData(frontIdDataDisplay, sessionData.details.front_id_data, "Thông tin mặt trước:");
                }
                if (backIdCardDiv) backIdCardDiv.style.display = 'block';
                if (sessionData && sessionData.details && sessionData.details.back_id_data) {
                    displayExtractedData(backIdDataDisplay, sessionData.details.back_id_data, "Thông tin mặt sau:");
                }
                if (selfieCardDiv) selfieCardDiv.style.display = 'block';
                
                if (activeLivenessCard) activeLivenessCard.style.display = 'none'; // Ẩn camera

                // Hiển thị thẻ kết quả cuối cùng
                if (finalResultCard) finalResultCard.style.display = 'block';
                logStatus(`Quy trình đã kết thúc với trạng thái: ${status}`, status !== 'APPROVED');
                
                // Hiển thị chi tiết kết quả cuối cùng
                let finalStatusMsg = `<p><strong>Trạng thái cuối cùng:</strong> <span class="${status === 'APPROVED' ? 'text-success' : 'text-danger'}">${status}</span></p>`;
                if (sessionData && sessionData.details) {
                    const verificationResult = sessionData.details.verification_result;
                    if (verificationResult) {
                        finalStatusMsg += `<p><strong>Xác thực khuôn mặt:</strong> ${verificationResult.verified ? 'Thành công' : 'Thất bại'}`;
                        if (verificationResult.distance !== undefined) {
                            finalStatusMsg += ` (Khoảng cách: ${verificationResult.distance.toFixed(4)}, Ngưỡng: ${verificationResult.threshold.toFixed(4)})`;
                        }
                        finalStatusMsg += `</p>`;
                        if (verificationResult.error) {
                             finalStatusMsg += `<p class="text-danger"><strong>Lỗi xác thực:</strong> ${verificationResult.error}</p>`;
                        }
                    }
                    if (sessionData.error) { // Nếu có lỗi từ server, nó sẽ nằm ở đây
                        finalStatusMsg += `<p class="text-danger"><strong>Lý do từ chối:</strong> ${sessionData.error}</p>`;
                    }
                }
                if (finalResultDisplay) finalResultDisplay.innerHTML = finalStatusMsg;

                if (startKycButton) startKycButton.style.display = 'none'; // Ẩn nút bắt đầu mới
                if (resetKycButton) resetKycButton.style.display = 'block'; // Hiện nút bắt đầu lại
                break;
        }
    }
    
    // --- Các sự kiện chính ---

    // 1. Bắt đầu phiên KYC
    startKycButton.addEventListener('click', async () => {
        logStatus("Đang tạo phiên KYC mới...");
        // Xóa dữ liệu cũ khi bắt đầu phiên mới
        if (frontIdDataDisplay) frontIdDataDisplay.innerHTML = '';
        if (backIdDataDisplay) backIdDataDisplay.innerHTML = '';
        if (finalResultDisplay) finalResultDisplay.innerHTML = '';
        if (finalResultCard) finalResultCard.style.display = 'none';

        try {
            const response = await fetch(`${ORCHESTRATOR_URL}/kyc/session`, { method: 'POST' });
            const data = await response.json();
            
            if (!response.ok) throw new Error(data.detail);

            kycSessionId = data.session_id;
            localStorage.setItem('kycSessionId', kycSessionId); // Lưu session vào trình duyệt

            logStatus(`Tạo phiên thành công! Session ID: ${kycSessionId}`);
            
            if (kycSteps) kycSteps.classList.remove('d-none');
            updateUI(data.status); // Cập nhật UI theo trạng thái đầu tiên
        } catch (error) {
            logStatus(`Không thể tạo phiên: ${error.message}`, true);
        }
    });

    // 2. Upload mặt trước
    frontIdInput.addEventListener('change', async () => {
        const result = await handleFileUpload(`/kyc/session/${kycSessionId}/front`, frontIdInput);
        if (result) {
            // Orchestrator trả về status và data của bước đó
            updateUI(result.status, {front_id_data: result.data}); // Gửi dữ liệu để hiển thị
        }
    });

    // 3. Upload mặt sau
    backIdInput.addEventListener('change', async () => {
        const result = await handleFileUpload(`/kyc/session/${kycSessionId}/back`, backIdInput);
        if (result) {
            // Lấy lại trạng thái phiên đầy đủ để đảm bảo hiển thị cả dữ liệu mặt trước
            try {
                const sessionResponse = await fetch(`${ORCHESTRATOR_URL}/kyc/session/${kycSessionId}`);
                const sessionData = await sessionResponse.json();
                if (!sessionResponse.ok) throw new Error(sessionData.detail || "Không thể lấy trạng thái phiên.");
                updateUI(result.status, sessionData); // Cập nhật UI với toàn bộ dữ liệu phiên
            } catch (error) {
                logStatus(`Lỗi khi cập nhật trạng thái sau tải mặt sau: ${error.message}`, true);
                updateUI(result.status); // Vẫn cố gắng chuyển bước mà không có dữ liệu cũ
            }
        }
    });

    // 4. Upload selfie (Passive check)
    selfieInput.addEventListener('change', async () => {
        const result = await handleFileUpload(`/kyc/session/${kycSessionId}/selfie-passive-check`, selfieInput);
        if (result && result.success) { // `result.success` thay vì `result.status`
            // Lấy lại trạng thái phiên đầy đủ để đảm bảo hiển thị cả dữ liệu cũ
            try {
                const sessionResponse = await fetch(`${ORCHESTRATOR_URL}/kyc/session/${kycSessionId}`);
                const sessionData = await sessionResponse.json();
                if (!sessionResponse.ok) throw new Error(sessionData.detail || "Không thể lấy trạng thái phiên.");
                updateUI(sessionData.status, sessionData); // Cập nhật UI với toàn bộ dữ liệu phiên
            } catch (error) {
                logStatus(`Lỗi khi cập nhật trạng thái sau tải selfie: ${error.message}`, true);
                updateUI('AWAITING_ACTIVE_LIVENESS'); // Vẫn cố gắng chuyển bước mà không có dữ liệu cũ
            }
        }
    });

    // 5. Active Liveness Challenge
    async function startActiveLiveness() {
        if (activeLivenessCard) activeLivenessCard.style.display = 'block';
        
        // Cần đảm bảo các phần tử webcam, canvas, livenessInstruction, retryContainerElem được lấy lại
        // hoặc không bị ghi đè innerHTML của activeLivenessCard
        // Hiện tại bạn đã khai báo chúng ở trên, vậy nên tôi sẽ sử dụng chúng trực tiếp
        // và giả định HTML không bị overwrite.
        // Tuy nhiên, nếu bạn có logic reset innerHTML của activeLivenessCard,
        // thì bạn cần lấy lại các tham chiếu DOM sau khi reset.
        // Nếu không, hãy đảm bảo các phần tử này luôn tồn tại trong HTML tĩnh của bạn.
        
        // Đối với nút retry, có thể cần tạo động nếu bạn muốn nó chỉ hiện khi có lỗi
        if (!retryContainerElem) {
            retryContainerElem = document.createElement('div');
            retryContainerElem.id = 'retry-container';
            // Append nó vào đâu đó trong activeLivenessCard, ví dụ:
            activeLivenessCard.querySelector('.card-body').appendChild(retryContainerElem);
        }
        retryContainerElem.innerHTML = ''; // Xóa nút retry cũ nếu có

        logStatus("Đang truy cập camera...");
        
        // Đảm bảo tắt mọi stream cũ nếu có
        if (currentVideoStream) {
            currentVideoStream.getTracks().forEach(track => track.stop());
            currentVideoStream = null;
        }

        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            currentVideoStream = stream; // Lưu stream lại
            if (webcamElem) {
                webcamElem.srcObject = stream;
                webcamElem.play(); // Thêm lệnh play() để đảm bảo video chạy
                // Chờ video sẵn sàng trước khi tiếp tục
                await new Promise(resolve => {
                    webcamElem.onloadedmetadata = () => {
                        logStatus("Metadata video đã được tải. Camera sẵn sàng.");
                        resolve();
                    };
                });
            } else {
                throw new Error("Webcam element not found.");
            }

        } catch (err) {
            logStatus(`Lỗi camera: ${err.name} - ${err.message}. Vui lòng cấp quyền và tải lại trang.`, true);
            if (livenessInstructionElem) livenessInstructionElem.textContent = "Không thể truy cập camera!";
            if (retryContainerElem) {
                retryContainerElem.innerHTML = `<button id="retryLivenessButton" class="btn btn-warning mt-3">Thử lại thử thách</button>`;
                document.getElementById('retryLivenessButton').addEventListener('click', startActiveLiveness);
            }
            return;
        }

        logStatus("Camera đã được kích hoạt. Đang tạo phiên liveness...");
        
        let livenessSessionId;
        try {
            const response = await fetch(`${FACE_SERVICE_URL}/liveness/session`, { method: 'POST' });
            const data = await response.json();
            livenessSessionId = data.liveness_session_id;
            if (livenessInstructionElem) livenessInstructionElem.textContent = data.instruction;
            logStatus(`Đã tạo phiên liveness: ${livenessSessionId}. Bắt đầu gửi frame...`);
        } catch (err) {
            logStatus("Không thể tạo phiên liveness với server.", true);
            if (currentVideoStream) {
                currentVideoStream.getTracks().forEach(track => track.stop());
                currentVideoStream = null;
            }
            if (retryContainerElem) {
                retryContainerElem.innerHTML = `<button id="retryLivenessButton" class="btn btn-warning mt-3">Thử lại thử thách</button>`;
                document.getElementById('retryLivenessButton').addEventListener('click', startActiveLiveness);
            }
            return;
        }

        // Dọn dẹp interval cũ nếu có
        if (livenessInterval) {
            clearInterval(livenessInterval);
        }

        livenessInterval = setInterval(async () => {
            if (!webcamElem || webcamElem.readyState < 3 || webcamElem.videoWidth === 0) {
                console.log("Video not ready or has zero width/height, skipping frame.");
                return; 
            }
            if (!canvasElem) {
                console.error("Canvas element not found, stopping liveness interval.");
                clearInterval(livenessInterval);
                return;
            }

            canvasElem.width = webcamElem.videoWidth;
            canvasElem.height = webcamElem.videoHeight;
            canvasElem.getContext('2d').drawImage(webcamElem, 0, 0, webcamElem.videoWidth, webcamElem.videoHeight); // Vẽ với kích thước đầy đủ

            canvasElem.toBlob(async (blob) => {
                const formData = new FormData();
                formData.append('image', blob, 'frame.jpg');

                try {
                    const response = await fetch(`${FACE_SERVICE_URL}/liveness/session/${livenessSessionId}/frame`, {
                        method: 'POST',
                        body: formData
                    });
                    const result = await response.json();

                    if (livenessInstructionElem) livenessInstructionElem.textContent = result.instruction || "Làm theo hướng dẫn";

                    if (result.status === 'success') {
                        clearInterval(livenessInterval);
                        if (currentVideoStream) {
                            currentVideoStream.getTracks().forEach(track => track.stop());
                            currentVideoStream = null;
                        }
                        logStatus("Thử thách tương tác thành công!");
                        if (activeLivenessCard) activeLivenessCard.style.display = 'none';
                        confirmAndFinalize(); // Chuyển sang bước xác thực cuối cùng
                    } else if (result.status === 'failed') {
                        clearInterval(livenessInterval);
                        if (currentVideoStream) {
                            currentVideoStream.getTracks().forEach(track => track.stop());
                            currentVideoStream = null;
                        }
                        logStatus(`Thử thách thất bại: ${result.reason}. Vui lòng thử lại.`, true);
                        if (retryContainerElem) {
                            retryContainerElem.innerHTML = `<button id="retryLivenessButton" class="btn btn-warning mt-3">Thử lại thử thách</button>`;
                            document.getElementById('retryLivenessButton').addEventListener('click', startActiveLiveness);
                        }
                    }
                } catch (error) {
                    logStatus("Lỗi kết nối khi gửi frame liveness. " + error.message, true);
                    clearInterval(livenessInterval);
                    if (currentVideoStream) {
                        currentVideoStream.getTracks().forEach(track => track.stop());
                        currentVideoStream = null;
                    }
                    if (retryContainerElem) {
                        retryContainerElem.innerHTML = `<button id="retryLivenessButton" class="btn btn-warning mt-3">Thử lại thử thách</button>`;
                        document.getElementById('retryLivenessButton').addEventListener('click', startActiveLiveness);
                    }
                }
            }, 'image/jpeg', 0.8); // Chất lượng JPEG 80%
        }, 800); // Gửi frame mỗi 800ms
    }

    // 6. & 7. Xác nhận và Hoàn tất
    async function confirmAndFinalize() {
        try {
            logStatus("Đang xác nhận hoàn thành active liveness...");
            const confirmResponse = await fetch(`${ORCHESTRATOR_URL}/kyc/session/${kycSessionId}/confirm-active-liveness`, { method: 'POST' });
            if (!confirmResponse.ok) {
                const errorData = await confirmResponse.json();
                throw new Error(errorData.detail || errorData.error || "Không thể xác nhận active liveness.");
            }
            
            logStatus("Đang chạy xác thực cuối cùng...");
            const finalResponse = await fetch(`${ORCHESTRATOR_URL}/kyc/session/${kycSessionId}/verify-final`, { method: 'POST' });
            const finalResult = await finalResponse.json();

            if (!finalResponse.ok) {
                const errorMessage = finalResult.error ? (finalResult.error.error || finalResult.error) : (finalResult.detail || "Lỗi xác thực cuối cùng không xác định");
                throw new Error(errorMessage);
            }

            // Gọi updateUI với kết quả cuối cùng để hiển thị trạng thái và chi tiết
            updateUI(finalResult.final_status, finalResult);

        } catch (error) {
            logStatus(`Lỗi ở bước cuối cùng: ${error.message}`, true);
            // Trong trường hợp lỗi, có thể muốn hiển thị thẻ kết quả cuối cùng với trạng thái lỗi
            updateUI('MANUAL_REVIEW', { error: error.message }); // Chuyển sang MANUAL_REVIEW nếu có lỗi bất ngờ
        }
    }

    // --- Khởi tạo và Tiếp tục phiên cũ ---
    if (resetKycButton) { // Chỉ gắn event listener nếu nút reset tồn tại
        resetKycButton.addEventListener('click', () => {
            localStorage.removeItem('kycSessionId'); // Xóa session ID
            kycSessionId = null;
            logStatus("Quy trình đã được reset. Nhấn 'Bắt đầu KYC' để bắt đầu phiên mới.");
            if (kycSteps) kycSteps.classList.add('d-none'); // Ẩn các bước
            if (finalResultCard) finalResultCard.style.display = 'none'; // Ẩn kết quả cuối cùng
            if (startKycButton) startKycButton.style.display = 'block'; // Hiện nút bắt đầu KYC
            if (statusLog) statusLog.innerHTML = 'Nhấn "Bắt đầu KYC" để khởi tạo quy trình.'; // Reset log
            
            // Vô hiệu hóa và xóa file đã chọn
            [frontIdInput, backIdInput, selfieInput].forEach(input => {
                if (input) {
                    input.disabled = true;
                    input.value = '';
                }
            });
            // Clear hiển thị dữ liệu
            if (frontIdDataDisplay) frontIdDataDisplay.innerHTML = '';
            if (backIdDataDisplay) backIdDataDisplay.innerHTML = '';
            if (finalResultDisplay) finalResultDisplay.innerHTML = '';

            // Đảm bảo tắt camera nếu nó đang hoạt động
            if (currentVideoStream) {
                currentVideoStream.getTracks().forEach(track => track.stop());
                currentVideoStream = null;
            }
            if (livenessInterval) {
                clearInterval(livenessInterval);
                livenessInterval = null;
            }
        });
    }


    function initialize() {
        const savedSessionId = localStorage.getItem('kycSessionId');
        if (savedSessionId) {
            logStatus(`Tìm thấy phiên làm việc cũ: ${savedSessionId}. Đang kiểm tra trạng thái...`);
            kycSessionId = savedSessionId;
            fetch(`${ORCHESTRATOR_URL}/kyc/session/${kycSessionId}`)
                .then(res => res.json())
                .then(data => {
                    // Kiểm tra nếu session không tồn tại hoặc lỗi khác từ server
                    if (!data || data.detail === 'Phiên không tồn tại.') {
                        localStorage.removeItem('kycSessionId');
                        logStatus("Phiên cũ đã hết hạn hoặc không tồn tại. Vui lòng bắt đầu lại.", true);
                        // Reset UI về trạng thái ban đầu
                        if (kycSteps) kycSteps.classList.add('d-none');
                        if (startKycButton) startKycButton.style.display = 'block';
                        if (statusLog) statusLog.innerHTML = 'Nhấn "Bắt đầu KYC" để khởi tạo quy trình.';
                        return;
                    }
                    logStatus(`Tiếp tục quy trình ở trạng thái: ${data.status}`);
                    if (startKycButton) startKycButton.style.display = 'none';
                    if (kycSteps) kycSteps.classList.remove('d-none');
                    
                    // Cập nhật UI với toàn bộ dữ liệu phiên đã có, bao gồm extractedData và status
                    updateUI(data.status, data); 
                })
                .catch(err => {
                     logStatus("Không thể kết nối đến server để lấy trạng thái phiên." + err.message, true);
                     // Nếu không kết nối được, reset về trạng thái ban đầu
                     localStorage.removeItem('kycSessionId');
                     if (kycSteps) kycSteps.classList.add('d-none');
                     if (startKycButton) startKycButton.style.display = 'block';
                     if (statusLog) statusLog.innerHTML = 'Nhấn "Bắt đầu KYC" để khởi tạo quy trình.';
                });
        }
    }

    // Gọi hàm khởi tạo khi trang được tải
    initialize();
});