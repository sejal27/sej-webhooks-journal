#!/usr/bin/env node

import { config } from 'dotenv';
import { loadConfig, logConfig, ConfigError } from './utils/config';
import { AuthManager, AuthError } from './utils/auth';
import { InteractiveCLI } from './utils/cli';

// Load environment variables
config();

async function main() {
  console.log('🚀 HubSpot Webhooks Journal API CLI');
  console.log('===================================');
  
  try {
    // Load and validate configuration
    const hubspotConfig = loadConfig();
    
    console.log('✅ Configuration loaded successfully!');
    logConfig(hubspotConfig);
    
    console.log('Welcome to the journal-util CLI!');
    console.log('This utility helps you test the HubSpot Webhooks Journal API.');
    console.log('');
    
    // Create authentication manager
    const authManager = new AuthManager(hubspotConfig);
    
    // Check if credentials are properly configured
    if (hubspotConfig.clientId !== 'your_client_id_here' && hubspotConfig.clientSecret !== 'your_client_secret_here') {
      console.log('🔐 Testing authentication...');
      
      try {
        await authManager.getAccessToken();
        console.log('✅ Authentication successful!');
      } catch (error) {
        if (error instanceof AuthError) {
          console.error('❌ Authentication failed:');
          console.error(`   ${error.message}`);
          if (error.correlationId) {
            console.error(`   Correlation ID: ${error.correlationId}`);
          }
          console.log('');
          console.log('💡 Note: You can still use the CLI to explore the API structure,');
          console.log('   but API calls will fail until authentication is resolved.');
        } else {
          console.error('❌ Unexpected authentication error:', error);
        }
      }
    } else {
      console.log('⚠️  Please update your .env file with actual HubSpot OAuth credentials:');
      console.log('   1. Get your Client ID and Client Secret from your HubSpot Developer Account');
      console.log('   2. Update the HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET in .env');
      console.log('   3. Optionally set DEFAULT_PORTAL_ID for easier testing');
      console.log('');
      console.log('💡 Note: You can still use the CLI to explore the API structure,');
      console.log('   but API calls will fail until credentials are provided.');
    }
    
    // Start interactive CLI
    const cli = new InteractiveCLI(hubspotConfig, authManager);
    await cli.start();
    
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error('❌ Configuration Error:');
      console.error(error.message);
      console.log('');
      console.log('💡 Getting started:');
      console.log('   1. Copy env.template to .env');
      console.log('   2. Fill in your HubSpot OAuth credentials');
      console.log('   3. Run the CLI again');
      process.exit(1);
    } else {
      throw error;
    }
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Unexpected Error:', error.message);
    process.exit(1);
  });
} 