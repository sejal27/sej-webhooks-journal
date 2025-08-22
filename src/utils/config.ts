import { HubSpotConfig } from '../types/config';

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export function loadConfig(): HubSpotConfig {
  const requiredEnvVars = [
    'HUBSPOT_CLIENT_ID',
    'HUBSPOT_CLIENT_SECRET',
    'HUBSPOT_API_BASE_URL',
    'HUBSPOT_OAUTH_TOKEN_URL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new ConfigError(
      `Missing required environment variables: ${missingVars.join(', ')}\n\n` +
      'Please create a .env file based on env.template and fill in your HubSpot OAuth credentials.'
    );
  }

  const config: HubSpotConfig = {
    clientId: process.env.HUBSPOT_CLIENT_ID!,
    clientSecret: process.env.HUBSPOT_CLIENT_SECRET!,
    apiBaseUrl: process.env.HUBSPOT_API_BASE_URL!,
    oauthTokenUrl: process.env.HUBSPOT_OAUTH_TOKEN_URL!,
    defaultPortalId: process.env.DEFAULT_PORTAL_ID,
    debug: process.env.DEBUG === 'true'
  };

  // Validate URLs
  try {
    new URL(config.apiBaseUrl);
    new URL(config.oauthTokenUrl);
  } catch (error) {
    throw new ConfigError('Invalid URL format in configuration');
  }

  return config;
}

export function validatePortalId(portalId: string): number {
  const parsed = parseInt(portalId, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new ConfigError('Portal ID must be a positive integer');
  }
  return parsed;
}

export function logConfig(config: HubSpotConfig): void {
  if (config.debug) {
    console.log('📊 Configuration loaded:');
    console.log(`  API Base URL: ${config.apiBaseUrl}`);
    console.log(`  OAuth Token URL: ${config.oauthTokenUrl}`);
    console.log(`  Default Portal ID: ${config.defaultPortalId || 'Not set'}`);
    console.log(`  Debug: ${config.debug}`);
    console.log(`  Client ID: ${config.clientId.substring(0, 8)}...`);
    console.log('');
  }
} 