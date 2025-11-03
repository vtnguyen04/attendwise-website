package main

import (
	"log"
	"net/http"

	permission_domain "github.com/attendwise/backend/internal/module/permission/domain"
	"github.com/gin-gonic/gin"
)

// communityAdminMiddleware checks if the logged-in user is an admin of the specified community.
func communityAdminMiddleware(permService permission_domain.PermissionService) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		communityID := c.Param("id")
		if communityID == "" {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Community ID is required"})
			return
		}

		isAdmin, err := permService.IsCommunityAdmin(c.Request.Context(), communityID, userID.(string))
		if err != nil {
			log.Printf("Error in IsCommunityAdmin check: communityID=%s, userID=%s, error=%v", communityID, userID, err)
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Error checking permissions"})
			return
		}

		if !isAdmin {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "You do not have permission to manage this community"})
			return
		}

		c.Next()
	}
}