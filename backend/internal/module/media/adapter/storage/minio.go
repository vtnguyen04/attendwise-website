package storage

import (
	"context"
	"fmt"
	"io"
	"log"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// MinioStorage is the MinIO implementation of the media usecase's StorageProvider.
type MinioStorage struct {
	client  *minio.Client
	baseURL string // Base URL for public access
}

// NewMinioStorage creates a new MinioStorage client.
func NewMinioStorage(endpoint, accessKey, secretKey, baseURL string, useSSL bool) (*MinioStorage, error) {
	minioClient, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, err
	}

	log.Printf("Successfully connected to MinIO at %s", endpoint)
	return &MinioStorage{client: minioClient, baseURL: baseURL}, nil
}

// UploadPublicFile uploads a file to MinIO and makes it publicly readable.
func (s *MinioStorage) UploadPublicFile(ctx context.Context, bucketName, objectName, contentType string, reader io.Reader, size int64) (string, error) {
	// Explicitly set ACL to public-read during upload via UserMetadata.
	// This is more robust than relying solely on bucket policies.
	opts := minio.PutObjectOptions{
		ContentType:  contentType,
		UserMetadata: map[string]string{"x-amz-acl": "public-read"},
	}

	_, err := s.client.PutObject(ctx, bucketName, objectName, reader, size, opts)
	if err != nil {
		log.Printf("Error uploading object to MinIO: %v", err)
		return "", err
	}

	// Construct the public URL
	// publicURL := fmt.Sprintf("%s/%s/%s", s.baseURL, bucketName, objectName)
	publicURL := fmt.Sprintf("%s/%s", s.baseURL, objectName)
	log.Printf("Successfully uploaded file. Public URL: %s", publicURL)

	return publicURL, nil
}

// EnsureBucketExists creates the bucket and sets a public read policy.
func (s *MinioStorage) EnsureBucketExists(ctx context.Context, bucketName, location string) error {
	found, err := s.client.BucketExists(ctx, bucketName)
	if err != nil {
		return fmt.Errorf("failed to check if bucket exists: %w", err)
	}
	if !found {
		log.Printf("Bucket '%s' not found. Creating it...", bucketName)
		err = s.client.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{Region: location})
		if err != nil {
			return fmt.Errorf("failed to create bucket: %w", err)
		}
		log.Printf("Successfully created bucket '%s'", bucketName)
	}

	// Always set public read policy on the bucket, even if it already exists
	policy := fmt.Sprintf(`{
		"Version": "2012-10-17",
		"Statement": [
			{
				"Effect": "Allow",
				"Principal": {"AWS": ["*"]},
				"Action": ["s3:GetObject"],
				"Resource": ["arn:aws:s3:::%s/*"]
			}
		]
	}`, bucketName)
	err = s.client.SetBucketPolicy(ctx, bucketName, policy)
	if err != nil {
		return fmt.Errorf("failed to set bucket policy: %w", err)
	}
	log.Printf("Successfully set public-read policy on bucket '%s'", bucketName)

	return nil
}
