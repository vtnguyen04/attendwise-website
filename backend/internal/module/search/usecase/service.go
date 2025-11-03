package usecase

import (
	"context"
	"strings"

	"github.com/attendwise/backend/internal/module/search/domain"
)

type searchService struct {
	repo domain.SearchRepository
}

func NewSearchService(repo domain.SearchRepository) domain.SearchService {
	return &searchService{repo: repo}
}

// Hàm Search không có userID - đã đúng
func (s *searchService) Search(ctx context.Context, query, typeFilter string, limit, offset int) ([]*domain.SearchResult, error) {
	cleanQuery := strings.TrimSpace(query)
	if cleanQuery == "" {
		return []*domain.SearchResult{}, nil
	}
	return s.repo.Search(ctx, cleanQuery, typeFilter, limit, offset)
}

// FIX: Xóa userID khỏi chữ ký của hàm và khỏi lệnh gọi xuống repository
func (s *searchService) SearchCommunities(ctx context.Context, query string, limit, offset int) ([]*domain.SearchResult, error) {
	cleanQuery := strings.TrimSpace(query)
	if cleanQuery == "" {
		return []*domain.SearchResult{}, nil
	}
	// Lệnh gọi xuống repo bây giờ cũng không còn userID
	return s.repo.SearchCommunities(ctx, cleanQuery, limit, offset)
}

// Hàm SearchEvents vẫn cần userID - đã đúng
func (s *searchService) SearchEvents(ctx context.Context, userID, query string, limit, offset int) ([]*domain.SearchResult, error) {
	cleanQuery := strings.TrimSpace(query)
	if cleanQuery == "" {
		return []*domain.SearchResult{}, nil
	}
	return s.repo.SearchEvents(ctx, userID, cleanQuery, limit, offset)
}

// Hàm SearchUsers không có userID - đã đúng
func (s *searchService) SearchUsers(ctx context.Context, query string, limit, offset int) ([]*domain.SearchResult, error) {
	cleanQuery := strings.TrimSpace(query)
	if cleanQuery == "" {
		return []*domain.SearchResult{}, nil
	}
	return s.repo.SearchUsers(ctx, cleanQuery, limit, offset)
}
