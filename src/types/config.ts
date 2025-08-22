export interface HubSpotConfig {
  clientId: string;
  clientSecret: string;
  apiBaseUrl: string;
  oauthTokenUrl: string;
  defaultPortalId?: string;
  debug: boolean;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  // Add timestamp for token expiration tracking
  obtained_at?: number;
}

export interface OAuthTokenRequest {
  grant_type: 'client_credentials';
  client_id: string;
  client_secret: string;
  scope: string;
}

export interface ApiError {
  status: string;
  message: string;
  correlationId?: string;
  category?: string;
} 