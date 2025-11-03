package googleauth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

const (
	googleUserInfoAPI = "https://www.googleapis.com/oauth2/v2/userinfo"
)

// GoogleUser represents the structure of the user information returned by Google.
type GoogleUser struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
	Locale        string `json:"locale"`
}

// GoogleOAuthConfig holds the OAuth2 configuration for Google.
type GoogleOAuthClient struct {
	oauth2Config *oauth2.Config
}

// NewGoogleOAuthClient creates a new GoogleOAuthClient instance.
func NewGoogleOAuthClient(clientID, clientSecret string) *GoogleOAuthClient {
	return &GoogleOAuthClient{
		oauth2Config: &oauth2.Config{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			Endpoint:     google.Endpoint,
			Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
		},
	}
}

// GetAuthCodeURL returns the URL to which the user should be redirected to initiate Google OAuth.
func (g *GoogleOAuthClient) GetAuthCodeURL(state, redirectURL string) string {
	config := *g.oauth2Config
	config.RedirectURL = redirectURL
	return config.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

// ExchangeCode exchanges the authorization code for Google tokens and retrieves user info.
func (g *GoogleOAuthClient) ExchangeCode(ctx context.Context, code, redirectURL string) (*GoogleUser, error) {
	config := *g.oauth2Config
	config.RedirectURL = redirectURL
	token, err := config.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("code exchange failed: %w", err)
	}

	client := config.Client(ctx, token)
	resp, err := client.Get(googleUserInfoAPI)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get user info, status: %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	userData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read user info response: %w", err)
	}

	var googleUser GoogleUser
	if err := json.Unmarshal(userData, &googleUser); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user info: %w", err)
	}

	if !googleUser.VerifiedEmail {
		return nil, fmt.Errorf("google email not verified")
	}

	log.Printf("Successfully retrieved Google user info for ID: %s, Email: %s", googleUser.ID, googleUser.Email)
	return &googleUser, nil
}

// VerifyIDToken verifies the Google ID token and extracts user information.
// This is an alternative to ExchangeCode if the frontend sends the ID token directly.
func (g *GoogleOAuthClient) VerifyIDToken(ctx context.Context, rawIDToken string) (*GoogleUser, error) {
	// Parse and verify the ID token.
	// The oauth2 library's VerifyIDToken method is suitable for this.
	// It checks the signature, issuer, audience, and expiration.
	// The actual verifier should be created using the google.Config.Client(ctx, token)
	// and then using the OIDC verifier. For simplicity, we'll use a direct call
	// to the userinfo endpoint with the access token obtained from the ID token.
	// A more robust solution would involve using a dedicated OIDC library.

	// For now, let's assume we get an access token from somewhere or use the ExchangeCode flow.
	// If the frontend sends only the ID token, we would need to verify it using a library
	// like "github.com/coreos/go-oidc" or manually verify the JWT.
	// Since the prompt implies using the existing oauth2 flow, I'll stick to that.
	// If the user explicitly wants ID token verification, I'll need to add that.

	// For now, let's return an error indicating this method is not fully implemented
	// or suggest using the ExchangeCode flow.
	return nil, fmt.Errorf("VerifyIDToken is not implemented. Please use ExchangeCode flow or provide an access token to fetch user info.")
}

// GetUserInfo fetches user information using an access token.
func (g *GoogleOAuthClient) GetUserInfo(ctx context.Context, accessToken string) (*GoogleUser, error) {
	client := g.oauth2Config.Client(ctx, &oauth2.Token{AccessToken: accessToken, TokenType: "Bearer", Expiry: time.Now().Add(time.Hour)})
	resp, err := client.Get(googleUserInfoAPI)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info with access token: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get user info with access token, status: %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	userData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read user info response with access token: %w", err)
	}

	var googleUser GoogleUser
	if err := json.Unmarshal(userData, &googleUser); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user info with access token: %w", err)
	}

	if !googleUser.VerifiedEmail {
		return nil, fmt.Errorf("google email not verified")
	}

	log.Printf("Successfully retrieved Google user info for ID: %s, Email: %s (via access token)", googleUser.ID, googleUser.Email)
	return &googleUser, nil
}