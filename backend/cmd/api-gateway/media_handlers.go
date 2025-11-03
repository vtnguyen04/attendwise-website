package main

import (
	"fmt"
	"log"
	"net/http"

	media_usecase "github.com/attendwise/backend/internal/module/media/usecase"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type MediaHandler struct {
	service media_usecase.MediaService
}

func NewMediaHandler(service media_usecase.MediaService) *MediaHandler {
	return &MediaHandler{service: service}
}

// UploadFile handles direct file uploads from the client.
// @Summary Upload a file
// @Description Upload a file to the media storage
// @ID upload-file
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "File to upload"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/media/upload [post]
// @Security ApiKeyAuth
func (h *MediaHandler) UploadFile(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File not provided or invalid"})
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	objectName := fmt.Sprintf("%s-%s", uuid.New().String(), header.Filename)

	publicURL, err := h.service.UploadFile(c.Request.Context(), objectName, contentType, file, header.Size)
	if err != nil {
		log.Printf("Failed to upload file: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload file"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "File uploaded successfully",
		"final_url":  publicURL,
		"upload_url": publicURL, // For compatibility with old frontend logic
	})
}