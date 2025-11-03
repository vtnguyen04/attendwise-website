package platform

import (
	"context"
	"fmt"
	"log"

	pb "github.com/attendwise/backend/generated/go/ai"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// AIClient is a gRPC client for the AI service.
type AIClient struct {
	client pb.AIServiceClient
}

// NewAIClient creates a new AI service client.
func NewAIClient(addr string) (*AIClient, error) {
	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to AI service: %w", err)
	}

	client := pb.NewAIServiceClient(conn)
	log.Printf("Successfully connected to AI gRPC service at %s", addr)
	return &AIClient{client: client}, nil
}

func (c *AIClient) RecognizeFace(ctx context.Context, imageData []byte, storedEmbedding []byte) (*pb.RecognizeFaceResponse, error) {
	log.Println("[AIClient] Calling RecognizeFace")
	req := &pb.RecognizeFaceRequest{
		ImageData:           imageData,
		StoredFaceEmbedding: storedEmbedding,
	}

	return c.client.RecognizeFace(ctx, req)
}

// StartLivenessChallenge initiates the liveness check process.
func (c *AIClient) StartLivenessChallenge(ctx context.Context) (*pb.StartLivenessChallengeResponse, error) {
	log.Println("[AIClient] Calling StartLivenessChallenge")
	return c.client.StartLivenessChallenge(ctx, &pb.StartLivenessChallengeRequest{})
}

// SubmitLivenessVideo sends the video data for verification.
func (c *AIClient) SubmitLivenessVideo(ctx context.Context, sessionID string, videoData []byte) (*pb.SubmitLivenessVideoResponse, error) {
	log.Printf("[AIClient] Calling SubmitLivenessVideo for session %s", sessionID)
	req := &pb.SubmitLivenessVideoRequest{
		SessionId: sessionID,
		VideoData: videoData,
	}
	return c.client.SubmitLivenessVideo(ctx, req)
}