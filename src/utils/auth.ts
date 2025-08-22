import axios, { AxiosError } from 'axios';
import { HubSpotConfig, AuthToken, OAuthTokenRequest, ApiError } from '../types/config';

export class AuthError extends Error {
  constructor(message: string, public correlationId?: string, public category?: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class AuthManager {
  private config: HubSpotConfig;
  private currentToken: AuthToken | null = null;
  private lastTokenLogTime: number = 0;

  // Required scopes for Webhooks Journal API
  private readonly requiredScopes = [
    'developer.webhooks_journal.read',
    'developer.webhooks_journal.snapshots.read',
    'developer.webhooks_journal.snapshots.write',
    'developer.webhooks_journal.subscriptions.read',
    'developer.webhooks_journal.subscriptions.write'
  ];

  constructor(config: HubSpotConfig) {
    this.config = config;
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.currentToken && !this.isTokenExpired(this.currentToken)) {
      // Only log token usage once per minute to avoid spam during streaming
      const now = Date.now();
      if (this.config.debug && (now - this.lastTokenLogTime) > 60000) {
        console.log('🔑 Using existing valid token');
        this.lastTokenLogTime = now;
      }
      return this.currentToken.access_token;
    }

    // Fetch a new token
    if (this.config.debug) {
      console.log('🔄 Fetching new access token...');
    }
    
    this.currentToken = await this.fetchAccessToken();
    return this.currentToken.access_token;
  }

  /**
   * Fetch a new access token from HubSpot
   */
  private async fetchAccessToken(): Promise<AuthToken> {
    const scopeString = this.requiredScopes.join(' ');
    
    const tokenRequest: OAuthTokenRequest = {
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: scopeString
    };

    if (this.config.debug) {
      console.log('📋 Requesting scopes:', scopeString);
    }

    try {
      const response = await axios.post(this.config.oauthTokenUrl, tokenRequest, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        // Convert to URL-encoded form data
        transformRequest: [(data) => {
          return Object.keys(data)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
            .join('&');
        }]
      });

      const token: AuthToken = {
        ...response.data,
        obtained_at: Date.now()
      };

      if (this.config.debug) {
        console.log('✅ Access token obtained successfully');
        console.log(`   Token Type: ${token.token_type}`);
        console.log(`   Expires In: ${token.expires_in} seconds`);
        console.log(`   Granted Scopes: ${token.scope || 'Not specified'}`);
      }

      return token;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiError>;
        const errorData = axiosError.response?.data;
        
        if (errorData) {
          throw new AuthError(
            `OAuth authentication failed: ${errorData.message || 'Unknown error'}`,
            errorData.correlationId,
            errorData.category
          );
        } else {
          throw new AuthError(
            `OAuth request failed: ${axiosError.message}`,
            undefined,
            'HTTP_ERROR'
          );
        }
      } else {
        throw new AuthError(`Unexpected error during authentication: ${error}`);
      }
    }
  }

  /**
   * Check if a token is expired (with 5-minute buffer)
   */
  private isTokenExpired(token: AuthToken): boolean {
    if (!token.obtained_at) {
      return true; // No timestamp, assume expired
    }

    const now = Date.now();
    const expirationTime = token.obtained_at + (token.expires_in * 1000);
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    return now >= (expirationTime - bufferTime);
  }

  /**
   * Force refresh the current token
   */
  async refreshToken(): Promise<string> {
    if (this.config.debug) {
      console.log('🔄 Force refreshing access token...');
    }
    
    this.currentToken = await this.fetchAccessToken();
    return this.currentToken.access_token;
  }

  /**
   * Clear the current token (useful for testing or logout)
   */
  clearToken(): void {
    this.currentToken = null;
    if (this.config.debug) {
      console.log('🗑️  Token cleared');
    }
  }

  /**
   * Get token info (for debugging)
   */
  getTokenInfo(): { hasToken: boolean; isExpired: boolean; expiresIn?: number } {
    if (!this.currentToken) {
      return { hasToken: false, isExpired: true };
    }

    const isExpired = this.isTokenExpired(this.currentToken);
    let expiresIn: number | undefined;
    
    if (this.currentToken.obtained_at) {
      const now = Date.now();
      const expirationTime = this.currentToken.obtained_at + (this.currentToken.expires_in * 1000);
      expiresIn = Math.max(0, Math.floor((expirationTime - now) / 1000));
    }

    return {
      hasToken: true,
      isExpired,
      expiresIn
    };
  }

  /**
   * Display the required scopes for easy reference
   */
  displayRequiredScopes(): void {
    console.log('📋 Required OAuth Scopes for your HubSpot App:');
    console.log('==============================================');
    console.log('');
    console.log('🔧 Webhooks Journal API Scopes:');
    console.log('  • developer.webhooks_journal.read');
    console.log('  • developer.webhooks_journal.snapshots.read');
    console.log('  • developer.webhooks_journal.snapshots.write');
    console.log('  • developer.webhooks_journal.subscriptions.read');
    console.log('  • developer.webhooks_journal.subscriptions.write');
    console.log('');
    console.log('💡 Add these scopes to your OAuth app in the HubSpot Developer portal.');
  }

  /**
   * Get the required scopes array
   */
  getRequiredScopes(): string[] {
    return [...this.requiredScopes];
  }
} 