package usecase

import (
	"context"
	"fmt"
	"sort"

	community_domain "github.com/attendwise/backend/internal/module/community/domain"
	event_domain "github.com/attendwise/backend/internal/module/event/domain"
	feed_domain "github.com/attendwise/backend/internal/module/feed/domain"
)

type service struct {
	communityRepo community_domain.CommunityRepository
	eventRepo     event_domain.EventRepository
	feedRepo      feed_domain.Repository
}

// NewService constructs a feed service backed by community, event, and feed repositories.
func NewService(communityRepo community_domain.CommunityRepository, eventRepo event_domain.EventRepository, feedRepo feed_domain.Repository) feed_domain.Service {
	return &service{
		communityRepo: communityRepo,
		eventRepo:     eventRepo,
		feedRepo:      feedRepo,
	}
}

func (s *service) ListGlobalPosts(ctx context.Context, userID string, limit, offset int, authorID string) ([]*community_domain.Post, int, error) {
	return s.feedRepo.ListGlobalPosts(ctx, userID, limit, offset, authorID)
}

func (s *service) GetFeed(ctx context.Context, userID string, limit int, scope feed_domain.Scope) ([]*feed_domain.Item, error) {
	if scope == "" {
		scope = feed_domain.ScopeAll
	}

	switch scope {
	case feed_domain.ScopeAll, feed_domain.ScopeCommunity, feed_domain.ScopeGlobal:
	default:
		return nil, fmt.Errorf("unsupported feed scope: %s", scope)
	}

	memberCommunities, err := s.communityRepo.GetCommunitiesByMember(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("could not get user's communities: %w", err)
	}

	var communityIDs []string
	for _, c := range memberCommunities {
		communityIDs = append(communityIDs, c.ID)
	}

	var (
		posts  []*community_domain.Post
		events []*event_domain.EventItem
	)

	switch scope {
	case feed_domain.ScopeGlobal:
		globalPosts, _, err := s.feedRepo.ListGlobalPosts(ctx, userID, limit, 0, "")
		if err != nil {
			return nil, fmt.Errorf("could not get global posts: %w", err)
		}
		posts = append(posts, globalPosts...)
	case feed_domain.ScopeCommunity:
		communityPosts, _, err := s.communityRepo.GetPostsForFeed(ctx, communityIDs, userID, limit, false)
		if err != nil {
			return nil, fmt.Errorf("could not get community posts for feed: %w", err)
		}
		posts = append(posts, communityPosts...)

		if len(communityIDs) > 0 {
			events, err = s.eventRepo.GetUpcomingEventsByCommunityIDs(ctx, communityIDs, limit)
			if err != nil {
				return nil, fmt.Errorf("could not get events for feed: %w", err)
			}
		}
	case feed_domain.ScopeAll:
		communityPosts, _, err := s.communityRepo.GetPostsForFeed(ctx, communityIDs, userID, limit, false)
		if err != nil {
			return nil, fmt.Errorf("could not get community posts for feed: %w", err)
		}
		posts = append(posts, communityPosts...)

		globalPosts, _, err := s.feedRepo.ListGlobalPosts(ctx, userID, limit, 0, "")
		if err != nil {
			return nil, fmt.Errorf("could not get global posts: %w", err)
		}
		posts = append(posts, globalPosts...)

		if len(communityIDs) > 0 {
			events, err = s.eventRepo.GetUpcomingEventsByCommunityIDs(ctx, communityIDs, limit)
			if err != nil {
				return nil, fmt.Errorf("could not get events for feed: %w", err)
			}
		}
	}

	items := collateFeed(posts, events)
	if limit > 0 && len(items) > limit {
		items = items[:limit]
	}

	return items, nil
}

func collateFeed(posts []*community_domain.Post, events []*event_domain.EventItem) []*feed_domain.Item {
	var feed []*feed_domain.Item

	for _, post := range posts {
		feed = append(feed, &feed_domain.Item{
			Type:      "post",
			Post:      post,
			CreatedAt: post.CreatedAt,
		})
	}

	for _, event := range events {
		feed = append(feed, &feed_domain.Item{
			Type:      "event",
			Event:     event,
			CreatedAt: event.CreatedAt,
		})
	}

	sort.Slice(feed, func(i, j int) bool {
		return feed[i].CreatedAt.After(feed[j].CreatedAt)
	})

	return feed
}
