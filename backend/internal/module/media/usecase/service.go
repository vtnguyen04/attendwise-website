package usecase

import (
	"context"
	"io"
)

// MediaService defines the interface for media-related operations.
type MediaService interface {
	UploadFile(ctx context.Context, objectName string, contentType string, reader io.Reader, size int64) (url string, err error)
}

// StorageProvider defines the interface for the underlying object storage.
type StorageProvider interface {
	UploadPublicFile(ctx context.Context, bucketName, objectName, contentType string, reader io.Reader, size int64) (string, error)
}

// Service is the implementation of the MediaService.
type Service struct {
	storage    StorageProvider
	bucketName string
	baseURL    string // Base URL for public access
}

// NewService creates a new media service.
func NewService(storage StorageProvider, bucketName, baseURL string) *Service {
	return &Service{
		storage:    storage,
		bucketName: bucketName,
		baseURL:    baseURL,
	}
}

func (s *Service) UploadFile(ctx context.Context, objectName string, contentType string, reader io.Reader, size int64) (string, error) {
	return s.storage.UploadPublicFile(ctx, s.bucketName, objectName, contentType, reader, size)
}
