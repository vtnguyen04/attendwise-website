package storage

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"
)

// ImgbbStorage is the imgbb.com implementation of the media usecase's StorageProvider.
type ImgbbStorage struct {
	apiKey string
}

// NewImgbbStorage creates a new ImgbbStorage client.
func NewImgbbStorage(apiKey string) *ImgbbStorage {
	return &ImgbbStorage{apiKey: apiKey}
}

// UploadPublicFile uploads a file to imgbb.com and returns the public URL.
func (s *ImgbbStorage) UploadPublicFile(ctx context.Context, bucketName, objectName, contentType string, reader io.Reader, size int64) (string, error) {
	var b bytes.Buffer
	writer := multipart.NewWriter(&b)

	// Create a form file
	fw, err := writer.CreateFormFile("image", objectName)
	if err != nil {
		return "", fmt.Errorf("failed to create form file: %w", err)
	}

	// Copy the image data to the form file
	_, err = io.Copy(fw, reader)
	if err != nil {
		return "", fmt.Errorf("failed to copy image data: %w", err)
	}

	writer.Close()

	req, err := http.NewRequestWithContext(ctx, "POST", fmt.Sprintf("https://api.imgbb.com/1/upload?key=%s", s.apiKey), &b)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send request to imgbb: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("imgbb API returned non-200 status: %d - %s", resp.StatusCode, resp.Status)
	}

	var imgbbResponse struct {
		Data struct {
			URL string `json:"url"`
		} `json:"data"`
		Success bool `json:"success"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&imgbbResponse); err != nil {
		return "", fmt.Errorf("failed to decode imgbb response: %w", err)
	}

	if !imgbbResponse.Success {
		return "", fmt.Errorf("imgbb API reported upload failure")
	}

	return imgbbResponse.Data.URL, nil
}

// EnsureBucketExists is a no-op for imgbb.com.
func (s *ImgbbStorage) EnsureBucketExists(ctx context.Context, bucketName, location string) error {
	return nil
}
