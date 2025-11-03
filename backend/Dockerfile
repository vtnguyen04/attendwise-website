# syntax=docker/dockerfile:1.7-labs

############################################
# Stage 1: Build the Go application
############################################
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Lưu ý: bạn nói go.mod có replace local -> cần COPY toàn bộ context trước để build được.
COPY go.mod go.sum ./
RUN go mod tidy && go mod vendor
COPY . .
COPY migrations ./migrations


# Tham số nhúng phiên bản (điền từ CI/CD)
ARG BUILD_VERSION=dev
ARG VCS_REF=local
ARG BUILD_DATE=unknown

# Build statically-linked binary, strip symbols để nhỏ
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux \
    go build -mod=vendor -trimpath \
      -ldflags="-s -w -X main.version=${BUILD_VERSION} -X main.commit=${VCS_REF} -X main.date=${BUILD_DATE}" \
      -o /bin/app ./cmd/api-gateway

############################################
# Stage 2: Minimal runtime image
############################################
FROM alpine:3.20

# Cài CA (HTTPS) + tzdata (nếu cần hiển thị giờ địa phương trong log)
RUN apk add --no-cache ca-certificates tzdata \
 && adduser -D -H -u 10001 appuser

WORKDIR /home/appuser

# Copy binary từ builder
COPY --from=builder /bin/app /home/appuser/app
COPY --from=builder /app/migrations ./migrations

# Quyền & non-root
RUN chown -R appuser:appuser /home/appuser
USER appuser:appuser

# Port service (điều chỉnh nếu khác)
EXPOSE 8080

# Healthcheck (chỉnh endpoint /health cho khớp service)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

# Metadata OCI (tùy chỉnh)
LABEL org.opencontainers.image.title="api-gateway" \
      org.opencontainers.image.description="Community & Learning Platform - API Gateway" \
      org.opencontainers.image.source="https://your.repo/url" \
      org.opencontainers.image.licenses="Proprietary"

# Chạy app
ENTRYPOINT ["./app"]
