import { config } from 'dotenv';
import { loadConfig, ConfigError } from './config';
import { AuthManager, AuthError } from './auth';

// Load environment variables
config();

export async function testAuthentication(): Promise<void> {
  console.log('🔐 Authentication Test');
  console.log('====================');
  
  try {
    const hubspotConfig = loadConfig();
    const authManager = new AuthManager(hubspotConfig);
    
    console.log('1. Testing initial token fetch...');
    const token1 = await authManager.getAccessToken();
    console.log(`   ✅ Token obtained: ${token1.substring(0, 16)}...`);
    
    console.log('2. Testing cached token retrieval...');
    const token2 = await authManager.getAccessToken();
    console.log(`   ✅ Token retrieved: ${token2.substring(0, 16)}...`);
    console.log(`   Same token? ${token1 === token2 ? 'Yes' : 'No'}`);
    
    console.log('3. Testing token info...');
    const tokenInfo = authManager.getTokenInfo();
    console.log(`   Has token: ${tokenInfo.hasToken}`);
    console.log(`   Is expired: ${tokenInfo.isExpired}`);
    console.log(`   Expires in: ${tokenInfo.expiresIn} seconds`);
    
    console.log('4. Testing forced refresh...');
    const token3 = await authManager.refreshToken();
    console.log(`   ✅ New token obtained: ${token3.substring(0, 16)}...`);
    console.log(`   Different token? ${token1 !== token3 ? 'Yes' : 'No'}`);
    
    console.log('5. Testing token clear...');
    authManager.clearToken();
    const tokenInfo2 = authManager.getTokenInfo();
    console.log(`   Has token after clear: ${tokenInfo2.hasToken}`);
    
    console.log('6. Testing token re-fetch after clear...');
    const token4 = await authManager.getAccessToken();
    console.log(`   ✅ Token re-obtained: ${token4.substring(0, 16)}...`);
    
    console.log('');
    console.log('✅ All authentication tests passed!');
    
  } catch (error) {
    if (error instanceof AuthError) {
      console.error('❌ Authentication Error:');
      console.error(`   ${error.message}`);
      if (error.correlationId) {
        console.error(`   Correlation ID: ${error.correlationId}`);
      }
    } else if (error instanceof ConfigError) {
      console.error('❌ Configuration Error:');
      console.error(`   ${error.message}`);
    } else {
      console.error('❌ Unexpected Error:', error);
    }
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testAuthentication().catch(console.error);
} 