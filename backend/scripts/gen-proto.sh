#!/bin/bash

# Dừng script ngay lập tức nếu có bất kỳ lệnh nào thất bại
set -e

# --- Di chuyển đến thư mục gốc của `backend` ---
# Sử dụng dirname hai lần để đi từ scripts/gen-proto.sh -> scripts -> backend
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
cd "$BACKEND_DIR"

echo "Working directory: $(pwd)"

# --- Định nghĩa các biến đường dẫn ---
PROTO_SRC_DIR=proto
GO_OUT_DIR=generated/go
PYTHON_OUT_DIR=generated/py

# --- Xóa thư mục generated cũ để đảm bảo sạch sẽ ---
echo "Cleaning up old generated files..."
rm -rf "${GO_OUT_DIR}"
rm -rf "${PYTHON_OUT_DIR}"
mkdir -p "${GO_OUT_DIR}"
mkdir -p "${PYTHON_OUT_DIR}"

# --- Tìm tất cả các file .proto trong thư mục PROTO_SRC_DIR ---
PROTO_FILES=$(find "${PROTO_SRC_DIR}" -name '*.proto')

if [ -z "$PROTO_FILES" ]; then
    echo "No .proto files found. Exiting."
    exit 0
fi

echo "Found proto files:"
echo "$PROTO_FILES"
echo "-------------------------"


# --- Sinh mã cho GO ---
echo "Generating Go stubs..."
protoc --proto_path="${PROTO_SRC_DIR}" \
       --go_out="${GO_OUT_DIR}" --go_opt=paths=source_relative \
       --go-grpc_out="${GO_OUT_DIR}" --go-grpc_opt=paths=source_relative \
       ${PROTO_FILES}

# --- Sinh mã cho PYTHON ---
echo "Generating Python stubs..."
python3 -m grpc_tools.protoc \
       --proto_path="${PROTO_SRC_DIR}" \
       --python_out="${PYTHON_OUT_DIR}" \
       --grpc_python_out="${PYTHON_OUT_DIR}" \
       ${PROTO_FILES}

# --- Tạo các file __init__.py để Python nhận diện là package ---
echo "Creating Python packages..."
find "${PYTHON_OUT_DIR}" -type d -exec touch {}/__init__.py \;

echo "✅ Protobuf code generation complete for all services."
