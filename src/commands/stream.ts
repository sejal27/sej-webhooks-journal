#!/usr/bin/env node

import { config } from 'dotenv';
import { loadConfig } from '../utils/config';

// Load environment variables
config();
import { AuthManager } from '../utils/auth';
import { ApiClient, ApiClientError } from '../utils/api-client';
import { JournalApi } from '../utils/journal-api';
import { JournalEntryWithData } from '../types/api';
import { displayApiError } from '../utils/cli-helpers';

/**
 * Standalone streaming command for journal entries
 * This allows developers to quickly start streaming journal events for troubleshooting
 */
async function streamCommand() {
  console.log('🌊 HubSpot Journal Stream - Real-time Event Monitor');
  console.log('==================================================');
  console.log('');
  
  try {
    // Load configuration
    const config = loadConfig();
    console.log('✅ Configuration loaded');
    
    // Setup authentication
    const authManager = new AuthManager(config);
    console.log('🔐 Authenticating...');
    
    try {
      await authManager.getAccessToken();
      console.log('✅ Authentication successful');
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      console.log('');
      console.log('💡 Make sure your .env file has valid HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET');
      process.exit(1);
    }
    
    // Setup API client
    const apiClient = new ApiClient(config, authManager);
    const journalApi = new JournalApi(apiClient);
    
    console.log('');
    console.log('🚀 Starting journal stream...');
    console.log('📋 Rate limit: 30 requests/minute (polls every 2 seconds)');
    console.log('💡 Press Ctrl+C to stop streaming');
    console.log('');
    console.log('────────────────────────────────────────────────────────────────');
    
    let entryCount = 0;
    let eventCount = 0;
    let isRunning = true;
    
    // Setup graceful shutdown
    const handleShutdown = () => {
      console.log('\n\n🛑 Shutting down stream...');
      isRunning = false;
    };
    
    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);
    
    // Start streaming
    const stopStream = await journalApi.streamJournalEntries(
      // onNewEntry callback
      (entry: JournalEntryWithData) => {
        if (!isRunning) return;
        
        entryCount++;
        const timestamp = new Date().toLocaleTimeString();
        
        console.log(`\n📄 Entry #${entryCount} [${timestamp}]`);
        console.log(`   Offset: ${entry.currentOffset.substring(0, 12)}...`);
        
        if (entry.data && entry.data.journalEvents && Array.isArray(entry.data.journalEvents)) {
          const events = entry.data.journalEvents;
          eventCount += events.length;
          
          console.log(`   Events: ${events.length} (Total: ${eventCount})`);
          console.log(`   Published: ${new Date(entry.data.publishedAt).toLocaleString()}`);
          
          // Display events in a compact format
          events.forEach((event, index) => {
            const objectDisplay = `${event.objectTypeId}:${event.objectId}`;
            const actionDisplay = event.action || event.type || 'Unknown';
            const portalDisplay = `Portal ${event.portalId}`;
            
            console.log(`     ${index + 1}. ${actionDisplay} → ${objectDisplay} (${portalDisplay})`);
            
            if (event.propertyChanges && Object.keys(event.propertyChanges).length > 0) {
              console.log(`        Property Changes:`);
              const entries = Object.entries(event.propertyChanges);
              entries.slice(0, 5).forEach(([property, value]) => {
                const displayValue = typeof value === 'string' && value.length > 80 
                  ? `${value.substring(0, 80)}...` 
                  : JSON.stringify(value);
                console.log(`          ${property}: ${displayValue}`);
              });
              if (entries.length > 5) {
                console.log(`          ... +${entries.length - 5} more properties`);
              }
            }
          });
        } else {
          console.log('   ⚠️  No events in this entry');
        }
        
        console.log('────────────────────────────────────────────────────────────────');
      },
      
      // onError callback
      (error: Error) => {
        if (!isRunning) return;
        console.log(`\n❌ Error: ${error.message}`);
      },
      
      // onStatusUpdate callback
      (status: string) => {
        if (!isRunning) return;
        
        // Only show important status updates to keep output clean
        if (status.includes('Starting stream') || 
            status.includes('Rate limit') || 
            status.includes('waiting')) {
          console.log(`ℹ️  ${status}`);
        }
      }
    );
    
    // Wait for shutdown signal
    while (isRunning) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Cleanup
    stopStream();
    
    console.log('\n📊 Stream Summary:');
    console.log(`   Journal Entries: ${entryCount}`);
    console.log(`   Total Events: ${eventCount}`);
    console.log('\n✅ Stream stopped gracefully');
    
  } catch (error) {
    console.log('');
    displayApiError(error);
    process.exit(1);
  }
}

// Run the command if this file is executed directly
if (require.main === module) {
  streamCommand().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} 