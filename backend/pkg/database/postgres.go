package database

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPostgresPool tạo và trả về một connection pool tới PostgreSQL.
// Nó cũng ping để xác nhận kết nối thành công.
func NewPostgresPool(databaseURL string) (*pgxpool.Pool, error) {
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable is not set")
	}

	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}

	// Tùy chỉnh thêm config cho pool ở đây nếu cần
	// config.MaxConns = 10

	dbpool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, err
	}

	// Ping CSDL để xác nhận kết nối
	if err := dbpool.Ping(context.Background()); err != nil {
		dbpool.Close()
		return nil, err
	}

	log.Println("Successfully connected to the database")
	return dbpool, nil
}
