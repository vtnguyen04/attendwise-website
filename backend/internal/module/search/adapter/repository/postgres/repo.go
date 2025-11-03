package postgres

import (
	"context"
	"fmt"
	"strings"
	"unicode"

	"github.com/attendwise/backend/internal/module/search/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

type searchRepository struct {
	db *pgxpool.Pool
}

func NewSearchRepository(db *pgxpool.Pool) domain.SearchRepository {
	return &searchRepository{db: db}
}

// THAY THẾ BẰNG PHIÊN BẢN HOÀN CHỈNH NÀY
func (r *searchRepository) Search(ctx context.Context, query, typeFilter string, limit, offset int) ([]*domain.SearchResult, error) {
	cleanQuery := strings.TrimSpace(query)
	if cleanQuery == "" {
		return []*domain.SearchResult{}, nil
	}

	// Bắt đầu câu lệnh SQL
	sqlQuery := `WITH search_query AS (SELECT plainto_tsquery('english', $1) AS query)`

	var queries []string
	// Các tham số cho câu lệnh SQL: $1=cleanQuery, $2=limit, $3=offset
	args := []interface{}{cleanQuery, limit, offset}

	// --- 1. Tìm kiếm Users (Luôn công khai) ---
	if typeFilter == "" || typeFilter == "user" {
		queries = append(queries, `
            SELECT 'user' AS type,
                   ts_rank(to_tsvector('english', name || ' ' || COALESCE(company, '')), query) AS rank,
                   json_build_object(
					   'id', id, 
					   'name', name, 
					   'profile_picture_url', profile_picture_url, 
					   'company', company,
					   'position', position
				   ) AS result
            FROM users, search_query 
            WHERE to_tsvector('english', name || ' ' || COALESCE(company, '')) @@ query
        `)
	}

	// --- 2. Tìm kiếm Communities (CHỈ CÔNG KHAI) ---
	if typeFilter == "" || typeFilter == "community" {
		queries = append(queries, `
            SELECT 'community' AS type,
                   ts_rank(to_tsvector('english', c.name || ' ' || COALESCE(c.description, '')), query) AS rank,
                   -- Các trường trả về nhất quán với hàm SearchCommunities công khai
                   json_build_object(
						'id', c.id, 
						'name', c.name, 
						'slug', c.slug, 
						'description', c.description,
						'cover_image_url', c.cover_image_url, 
						'type', c.type,
						'allow_member_invites', c.allow_member_invites, 
						'member_count', c.member_count,
						'admin_name', u.name
				   ) AS result
            FROM communities c
			JOIN users u ON c.owner_id = u.id,
                 search_query
            WHERE c.deleted_at IS NULL
              AND c.type = 'public' -- Điều kiện cốt lõi: CHỈ TÌM PUBLIC
              AND to_tsvector('english', c.name || ' ' || COALESCE(c.description, '')) @@ query
        `)
	}

	// --- 3. Tìm kiếm Events (CHỈ TRONG COMMUNITY CÔNG KHAI) ---
	if typeFilter == "" || typeFilter == "event" {
		queries = append(queries, `
            SELECT 'event' AS type,
                   ts_rank(to_tsvector('english', e.name || ' ' || COALESCE(e.description, '')), query) AS rank,
                   json_build_object(
					   'id', e.id, 
					   'name', e.name, 
					   'slug', e.slug, 
					   'description', e.description,
					   'cover_image_url', e.cover_image_url, 
					   'start_time', e.start_time, 
					   'end_time', e.end_time,
					   'community_id', c.id,
					   'community_name', c.name
				   ) AS result
            FROM events e
            JOIN communities c ON e.community_id = c.id,
                 search_query
            WHERE e.deleted_at IS NULL
              AND c.type = 'public' -- Điều kiện cốt lõi: Event phải thuộc community PUBLIC
              AND to_tsvector('english', e.name || ' ' || COALESCE(e.description, '')) @@ query
        `)
	}

	// --- 4. Tìm kiếm Posts (CHỈ CÁC BÀI VIẾT CÔNG KHAI) ---
	if typeFilter == "" || typeFilter == "post" {
		queries = append(queries, `
            SELECT 'post' AS type,
                   ts_rank(to_tsvector('english', p.content), query) AS rank,
                   json_build_object(
					   'id', p.id, 
					   'content', LEFT(p.content, 200), -- Lấy 200 ký tự đầu
					   'created_at', p.created_at,
					   'community_id', p.community_id, 
					   'author_id', u.id,
					   'author_name', u.name,
					   'author_avatar', u.profile_picture_url
				   ) AS result
            FROM posts p
            JOIN users u ON p.author_id = u.id,
                 search_query
            WHERE p.deleted_at IS NULL
              AND p.status = 'approved'
              AND p.visibility = 'public' -- Điều kiện cốt lõi: Bài viết phải CÔNG KHAI
              AND to_tsvector('english', p.content) @@ query
        `)
	}

	// --- Ghép nối và thực thi câu lệnh ---
	if len(queries) == 0 {
		return []*domain.SearchResult{}, nil
	}

	// LIMIT $2, OFFSET $3
	fullQuery := sqlQuery + strings.Join(queries, " UNION ALL ") + " ORDER BY rank DESC LIMIT $2 OFFSET $3"

	rows, err := r.db.Query(ctx, fullQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to execute public search query: %w", err)
	}
	defer rows.Close()

	var results []*domain.SearchResult
	for rows.Next() {
		var res domain.SearchResult
		if err := rows.Scan(&res.Type, &res.Rank, &res.Result); err != nil {
			return nil, fmt.Errorf("failed to scan search result: %w", err)
		}
		results = append(results, &res)
	}
	return results, nil
}

func (r *searchRepository) SearchCommunities(ctx context.Context, query string, limit, offset int) ([]*domain.SearchResult, error) {
	cleanQuery := strings.TrimSpace(query)
	if cleanQuery == "" {
		return []*domain.SearchResult{}, nil
	}
	likePattern := "%" + strings.ToLower(cleanQuery) + "%"

	// Câu lệnh SQL đã được đơn giản hóa, không còn join với community_members
	sqlQuery := `
		SELECT 'community' AS type,
		       (
				   ts_rank(to_tsvector('english', c.name || ' ' || COALESCE(c.description, '')), plainto_tsquery('english', $1))
				   + CASE WHEN LOWER(c.name) LIKE $4 THEN 0.2 ELSE 0 END
			   ) AS rank,
		       -- Trả về các trường công khai, không có 'status'
		       json_build_object(
					'id', c.id, 'name', c.name, 'slug', c.slug, 'description', c.description,
					'cover_image_url', c.cover_image_url, 'type', c.type,
					'allow_member_invites', c.allow_member_invites, 'member_count', c.member_count,
					'admin_name', u.name
			   ) AS result
		FROM communities c
		JOIN users u ON c.owner_id = u.id
		WHERE 
			c.deleted_at IS NULL
			-- CHỈ TÌM community CÔNG KHAI
			AND c.type = 'public'
			-- Điều kiện tìm kiếm bằng từ khóa
			AND (
				to_tsvector('english', c.name || ' ' || COALESCE(c.description, '')) @@ plainto_tsquery('english', $1)
				OR LOWER(c.name) LIKE $4
			)
		ORDER BY rank DESC
		-- LIMIT $2, OFFSET $3
		LIMIT $2 OFFSET $3
	`
	// Chú ý: chỉ có 4 tham số được truyền vào, không có userID
	rows, err := r.db.Query(ctx, sqlQuery, cleanQuery, limit, offset, likePattern)
	if err != nil {
		return nil, fmt.Errorf("failed to execute public search communities query: %w", err)
	}
	defer rows.Close()

	var results []*domain.SearchResult
	for rows.Next() {
		var res domain.SearchResult
		if err := rows.Scan(&res.Type, &res.Rank, &res.Result); err != nil {
			return nil, fmt.Errorf("failed to scan search result: %w", err)
		}
		results = append(results, &res)
	}
	return results, nil
}

func (r *searchRepository) SearchUsers(ctx context.Context, query string, limit, offset int) ([]*domain.SearchResult, error) {
	sqlQuery := `
        SELECT 'user' AS type, ts_rank(to_tsvector('english', name || ' ' || COALESCE(company, '')), query) AS rank, json_build_object('id', id, 'name', name, 'email', email, 'profile_picture_url', profile_picture_url, 'position', position, 'company', company) AS result
        FROM users, plainto_tsquery('english', $1) AS query
        WHERE to_tsvector('english', name || ' ' || COALESCE(company, '')) @@ query
        ORDER BY rank DESC
        LIMIT $2 OFFSET $3
    `
	rows, err := r.db.Query(ctx, sqlQuery, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to execute search users query: %w", err)
	}
	defer rows.Close()

	var results []*domain.SearchResult
	for rows.Next() {
		var res domain.SearchResult
		if err := rows.Scan(&res.Type, &res.Rank, &res.Result); err != nil {
			return nil, fmt.Errorf("failed to scan search result: %w", err)
		}
		results = append(results, &res)
	}

	return results, nil
}

func (r *searchRepository) SearchEvents(ctx context.Context, userID, query string, limit, offset int) ([]*domain.SearchResult, error) {
	sqlQuery := `
		SELECT 'event' AS type, ts_rank(to_tsvector('english', e.name || ' ' || COALESCE(e.description, '')), query) AS rank, json_build_object('id', e.id, 'name', e.name, 'slug', e.slug, 'description', e.description, 'cover_image_url', e.cover_image_url, 'start_time', e.start_time, 'end_time', e.end_time, 'community_id', e.community_id, 'community_name', c.name) AS result
		FROM events e
		LEFT JOIN communities c ON e.community_id = c.id
		LEFT JOIN community_members cm ON e.community_id = cm.community_id AND cm.user_id = $2,
		     plainto_tsquery('english', $1) AS query
		WHERE (c.type = 'public' OR (cm.user_id IS NOT NULL AND cm.status = 'active'))
		AND to_tsvector('english', e.name || ' ' || COALESCE(e.description, '')) @@ query
		ORDER BY rank DESC
		LIMIT $3 OFFSET $4
	`
	rows, err := r.db.Query(ctx, sqlQuery, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to execute search events query: %w", err)
	}
	defer rows.Close()

	var results []*domain.SearchResult
	for rows.Next() {
		var res domain.SearchResult
		if err := rows.Scan(&res.Type, &res.Rank, &res.Result); err != nil {
			return nil, fmt.Errorf("failed to scan search result: %w", err)
		}
		results = append(results, &res)
	}

	return results, nil
}

func buildPrefixTsQuery(input string) string {
	terms := strings.FieldsFunc(input, func(r rune) bool {
		return !unicode.IsLetter(r) && !unicode.IsDigit(r)
	})

	if len(terms) == 0 {
		return ""
	}

	var parts []string
	for _, term := range terms {
		var builder strings.Builder
		for _, r := range strings.ToLower(term) {
			if unicode.IsLetter(r) || unicode.IsDigit(r) {
				builder.WriteRune(r)
			}
		}
		clean := builder.String()
		if clean == "" {
			continue
		}
		parts = append(parts, clean+":*")
	}

	return strings.Join(parts, " & ")
}
