# Deployment Instructions for Project

This document outlines the steps to deploy the project (backend and frontend services) to a Virtual Private Server (VPS) using Docker and Docker Compose.

## Table of Contents
1.  [Prerequisites](#1-prerequisites)
2.  [VPS Setup](#2-vps-setup)
    *   [Connect to VPS](#connect-to-vps)
    *   [Install Docker](#install-docker)
    *   [Install Docker Compose](#install-docker-compose)
3.  [Transfer Project Files](#3-transfer-project-files)
4.  [Deploy the Application](#4-deploy-the-application)
5.  [Verification](#5-verification)
6.  [Accessing the Application](#6-accessing-the-application)
7.  [Troubleshooting / Next Steps](#7-troubleshooting--next-steps)
8.  [Replacing MinIO with a Cloud Object Storage Service](#8-replacing-minio-with-a-cloud-object-storage-service)

---

## 1. Prerequisites

Before you begin, ensure you have:

*   A running VPS (e.g., Ubuntu, Debian, CentOS).
*   SSH access to your VPS.
*   `sudo` privileges on your VPS.
*   Your local project directory (`/home/quynhthu/Documents/internship`) ready to be transferred.

## 2. VPS Setup

### Connect to VPS

Open your local terminal and connect to your VPS via SSH. Replace `your_username` with your actual SSH username and `your_vps_ip` with the IP address of your VPS.

```bash
ssh your_username@your_vps_ip
```

### Install Docker

Once connected, install Docker on your VPS. The following commands are for Ubuntu/Debian-based systems. Adjust if you are using a different operating system.

1.  **Update package index and install dependencies:**
    ```bash
    sudo apt update
    sudo apt install apt-transport-https ca-certificates curl software-properties-common -y
    ```
2.  **Add Docker's official GPG key:**
    ```bash
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    ```
3.  **Set up the stable Docker repository:**
    ```bash
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    ```
4.  **Install Docker Engine:**
    ```bash
    sudo apt update
    sudo apt install docker-ce docker-ce-cli containerd.io -y
    ```
5.  **Add your user to the `docker` group** (to run Docker commands without `sudo`):
    ```bash
    sudo usermod -aG docker your_username
    ```
    *   You will need to log out and log back into your SSH session for this change to take effect, or run `newgrp docker`.

### Install Docker Compose

Install Docker Compose, which is used to define and run multi-container Docker applications.

1.  **Download the current stable release of Docker Compose:**
    ```bash
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    ```
2.  **Apply executable permissions to the binary:**
    ```bash
    sudo chmod +x /usr/local/bin/docker-compose
    ```
3.  **Verify the installation:**
    ```bash
    docker-compose --version
    ```

## 3. Transfer Project Files

From your **local machine**, use `scp` to securely copy your entire project directory to your VPS. Replace `your_username`, `your_vps_ip`, and `/path/on/vps/` with your desired destination path on the VPS (e.g., `/home/your_username/`).

```bash
scp -r /home/quynhthu/Documents/internship your_username@your_vps_ip:/home/your_username/
```

## 4. Deploy the Application

Now, switch back to your **VPS terminal session**.

1.  **Navigate to your project directory** on the VPS:
    ```bash
    cd /home/your_username/internship # Adjust path if you copied it elsewhere
    ```
2.  **Build and run the services** using Docker Compose. The `--build` flag ensures that Docker images are built from your Dockerfiles, and `-d` runs the containers in detached mode (in the background).
    ```bash
    docker-compose up -d --build
    ```

## 5. Verification

Check if your Docker containers are running correctly:

```bash
docker-compose ps
```

You should see output indicating that both `backend` and `frontend` services are up and healthy.

## 6. Accessing the Application

Based on the `docker-compose.yml` file:

*   The **frontend** should be accessible on `http://your_vps_ip:3000`
*   The **backend** API should be accessible on `http://your_vps_ip:8080`

Replace `your_vps_ip` with the actual IP address of your VPS.

## 7. Troubleshooting / Next Steps

*   **Firewall:** If you cannot access the application, ensure that ports `3000` and `8080` are open in your VPS's firewall (e.g., `ufw` on Ubuntu).
    ```bash
    sudo ufw allow 3000/tcp
    sudo ufw allow 8080/tcp
    sudo ufw enable
    ```
*   **Environment Variables:** If your application relies on environment variables (e.g., in `.env` files), make sure they are correctly configured on your VPS or within your Docker setup.
*   **Logs:** To check for errors, view the logs of your services:
    ```bash
    docker-compose logs frontend
    docker-compose logs backend
    ```
*   **Stop Services:** To stop the running services:
    ```bash
    docker-compose down
    ```

## 8. Replacing MinIO with a Cloud Object Storage Service (e.g., AWS S3)

The `minio-go` SDK used in your backend is largely compatible with Amazon S3, making migration to AWS S3 relatively straightforward.

### 8.1. Choose Your Cloud Object Storage Service

*   **AWS S3 (Amazon Simple Storage Service):** Highly recommended due to direct compatibility with the `minio-go` SDK.
*   **Google Cloud Storage (GCS):** Can be configured to be S3-compatible, but might require specific settings or a different SDK if direct S3 compatibility isn't sufficient.
*   **Azure Blob Storage:** Generally less S3-compatible out-of-the-box. Might require an S3 compatibility layer or a more significant rewrite using Azure's SDK.
*   **Other S3-compatible services:** Many providers offer S3-compatible storage (e.g., DigitalOcean Spaces, Wasabi, Backblaze B2).

For this instruction, we'll assume you're moving to **AWS S3**.

### 8.2. AWS S3 Setup

1.  **Create an S3 Bucket:**
    *   Log in to your AWS Management Console.
    *   Navigate to S3 and create a new bucket. Choose a unique name and a region.
    *   **Important:** Configure bucket policies and CORS settings as needed for your application. For public files, you'll need to ensure appropriate read permissions.

2.  **Create IAM User and Access Keys:**
    *   Go to IAM (Identity and Access Management).
    *   Create a new IAM user (or use an existing one) with programmatic access.
    *   Attach a policy that grants necessary permissions to your S3 bucket (e.g., `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:ListBucket`). A common approach is to create a custom policy that grants access only to your specific bucket.
    *   Generate an Access Key ID and Secret Access Key for this user. **Store these securely; you will not be able to retrieve the secret key again.**

### 8.3. Update Backend Configuration

Your backend (`pkg/config/config.go`) currently uses environment variables for MinIO configuration. You'll need to update these to point to your AWS S3 bucket.

The relevant configuration fields are:

```go
// pkg/config/config.go
type Config struct {
    // ... other fields
    MinioEndpoint        string `mapstructure:"MINIO_ENDPOINT"`
    MinioAccessKeyID     string `mapstructure:"MINIO_ACCESS_KEY_ID"`
    MinioSecretAccessKey string `mapstructure:"MINIO_SECRET_ACCESS_KEY"`
    MinioBucketName      string `mapstructure:"MINIO_BUCKET_NAME"`
    MinioUseSSL          bool   `mapstructure:"MINIO_USE_SSL"`
    MinioBaseURL         string `mapstructure:"MINIO_BASE_URL"`
    // ...
}
```

You will update the environment variables that map to these fields:

*   **`MINIO_ENDPOINT`**: Change this to your S3 endpoint. For example, `s3.your-aws-region.amazonaws.com` (e.g., `s3.us-east-1.amazonaws.com`).
*   **`MINIO_ACCESS_KEY_ID`**: Your AWS IAM user's Access Key ID.
*   **`MINIO_SECRET_ACCESS_KEY`**: Your AWS IAM user's Secret Access Key.
*   **`MINIO_BUCKET_NAME`**: The name of your S3 bucket.
*   **`MINIO_USE_SSL`**: Set this to `true` for S3.
*   **`MINIO_BASE_URL`**: This should be the public URL for your S3 bucket. For example, `https://your-s3-bucket-name.s3.your-aws-region.amazonaws.com`. This is used for constructing public URLs to your objects.

**Example `.env` file changes:**

```
# Old MinIO configuration
# MINIO_ENDPOINT=localhost:9000
# MINIO_ACCESS_KEY_ID=minioadmin
# MINIO_SECRET_ACCESS_KEY=minioadmin
# MINIO_BUCKET_NAME=mybucket
# MINIO_USE_SSL=false
# MINIO_BASE_URL=http://localhost:9000/mybucket

# New AWS S3 configuration
MINIO_ENDPOINT=s3.us-east-1.amazonaws.com # Replace with your region
MINIO_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
MINIO_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
MINIO_BUCKET_NAME=your-s3-bucket-name
MINIO_USE_SSL=true
MINIO_BASE_URL=https://your-s3-bucket-name.s3.us-east-1.amazonaws.com # Replace with your bucket name and region
```

### 8.4. Code Modifications (Minimal for S3)

The `minio-go` SDK is designed to be S3-compatible. In most cases, if your MinIO implementation only uses standard S3 operations, you might not need to change any Go code. The `minio.New` function can connect to any S3-compatible endpoint.

The file `internal/module/media/adapter/storage/minio.go` is where the `minio.Client` is initialized:

```go
// internal/module/media/adapter/storage/minio.go
func NewMinioStorage(endpoint, accessKey, secretKey, baseURL string, useSSL bool) (*MinioStorage, error) {
    minioClient, err := minio.New(endpoint, &minio.Options{
        Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
        Secure: useSSL,
    })
    // ...
}
```

This code should work directly with AWS S3 by simply changing the `endpoint`, `accessKey`, `secretKey`, `baseURL`, and `useSSL` parameters via your environment variables.

**Consider renaming:** While not strictly necessary for functionality, you might want to rename `internal/module/media/adapter/storage/minio.go` to something more generic like `s3.go` or `object_storage.go`, and rename `MinioStorage` to `S3Storage` or `ObjectStorage` to reflect the change in underlying service. This would involve:
*   Renaming the file.
*   Renaming the `MinioStorage` struct and its methods.
*   Updating imports and instantiation in `cmd/api-gateway/main.go`.

### 8.5. Migrate Existing Data (If Applicable)

If you have existing files stored in your MinIO instance that you want to keep, you'll need to migrate them to your new S3 bucket.

*   **Using `aws s3 sync` (if MinIO is accessible via S3 API):**
    ```bash
    aws s3 sync s3://your-minio-bucket s3://your-s3-bucket-name --endpoint-url http://your-minio-endpoint:9000
    ```
    (You'll need the AWS CLI configured with credentials that can access both MinIO and S3).

*   **Using `rclone`:** A versatile tool for syncing files between various cloud storage providers.
    ```bash
    # Configure rclone for MinIO
    rclone config create minio_remote s3 provider Minio endpoint http://localhost:9000 access_key_id minioadmin secret_access_key minioadmin

    # Configure rclone for AWS S3
    rclone config create s3_remote s3 provider AWS access_key_id YOUR_AWS_ACCESS_KEY_ID secret_access_key YOUR_AWS_SECRET_ACCESS_KEY region us-east-1

    # Sync data
    rclone sync minio_remote:mybucket s3_remote:your-s3-bucket-name
    ```

### 8.6. Testing

After making the configuration changes and potentially migrating data:

1.  **Restart your backend service** with the new environment variables.
2.  **Test file uploads:** Ensure new files are being uploaded to S3.
3.  **Test file retrieval:** Verify that existing and newly uploaded files can be retrieved correctly.
4.  **Check logs:** Monitor your backend logs for any errors related to S3 connectivity or operations.