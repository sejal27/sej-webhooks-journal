import axios from 'axios';
import { ApiClient, ApiClientError } from './api-client';
import { JournalEntry, JournalEntryWithData, JournalData } from '../types/api';

export class JournalApi {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Download and parse journal data from a URL
   */
  private async downloadJournalData(url: string): Promise<JournalData> {
    try {
      const response = await axios.get(url, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Accept': 'application/json'
        }
      });
      
      // Debug: Log the raw response structure (only if needed for troubleshooting)
      if (process.env.DEBUG === 'true' && process.env.DEBUG_JOURNAL === 'true') {
        console.log('🔍 Debug - Downloaded JSON structure:');
        console.log('Response keys:', Object.keys(response.data));
        console.log('Full response:', JSON.stringify(response.data, null, 2));
      }
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('Journal data file not found - the URL may have expired');
        } else if (error.response?.status === 403) {
          throw new Error('Access denied to journal data file - the URL may have expired');
        } else {
          throw new Error(`Failed to download journal data: ${error.message}`);
        }
      } else {
        throw new Error(`Unexpected error downloading journal data: ${error}`);
      }
    }
  }

  /**
   * Get the earliest journal entry with data
   */
  async getEarliestJournalEntry(): Promise<JournalEntryWithData> {
    const entry = await this.apiClient.get<JournalEntry>('/webhooks/v4/journal/earliest');
    const data = await this.downloadJournalData(entry.url);
    
    return {
      ...entry,
      data
    };
  }

  /**
   * Get the latest journal entry with data
   */
  async getLatestJournalEntry(): Promise<JournalEntryWithData> {
    const entry = await this.apiClient.get<JournalEntry>('/webhooks/v4/journal/latest');
    const data = await this.downloadJournalData(entry.url);
    
    return {
      ...entry,
      data
    };
  }

  /**
   * Get the next journal entry after a specific offset with data
   */
  async getNextJournalEntry(offset: string, options?: { suppressErrorLogging?: boolean }): Promise<JournalEntryWithData> {
    try {
      const entry = await this.apiClient.get<JournalEntry>(
        `/webhooks/v4/journal/offset/${offset}/next`,
        { suppressErrorLogging: options?.suppressErrorLogging }
      );
      
      // Check if we got a valid entry with required fields
      if (!entry || !entry.url) {
        throw new ApiClientError('You are already on the latest offset', 204);
      }
      
      const data = await this.downloadJournalData(entry.url);
      
      return {
        ...entry,
        data
      };
    } catch (error) {
      // Handle 204 responses specifically
      if (error instanceof ApiClientError && error.statusCode === 204) {
        throw new ApiClientError('You are already on the latest offset', 204);
      }
      
      // Re-throw other errors as-is
      throw error;
    }
  }

  /**
   * Stream new journal entries as they become available
   * @param onNewEntry Callback function called when new entries are found
   * @param onError Callback function called when errors occur
   * @param onStatusUpdate Callback function called for status updates
   * @returns Function to stop the streaming
   */
  async streamJournalEntries(
    onNewEntry: (entry: JournalEntryWithData) => void,
    onError: (error: Error) => void,
    onStatusUpdate: (status: string) => void
  ): Promise<() => void> {
    let isRunning = true;
    let lastOffset: string | null = null;
    let requestCount = 0;
    let lastMinuteTimestamp = Date.now();
    
    // Rate limiting: 100 requests per minute max, we'll use 15 to be very safe
    // Note: Each poll makes 1 HubSpot API request (S3 downloads don't count)
    const MAX_REQUESTS_PER_MINUTE = 30;
    const POLL_INTERVAL_MS = 2000; // Poll every 5 seconds (12 polls/min, well under 15 limit)
    
    const resetRateLimit = () => {
      const now = Date.now();
      if (now - lastMinuteTimestamp >= 60000) {
        requestCount = 0;
        lastMinuteTimestamp = now;
      }
    };
    
    const checkRateLimit = (): boolean => {
      resetRateLimit();
      return requestCount < MAX_REQUESTS_PER_MINUTE;
    };
    
    const incrementRequestCount = () => {
      requestCount++;
    };

    // Get initial latest entry to establish starting point
    try {
      onStatusUpdate('🔍 Getting initial latest journal entry...');
      const initialEntry = await this.getLatestJournalEntry();
      lastOffset = initialEntry.currentOffset;
      incrementRequestCount();
      onStatusUpdate(`📍 Starting stream from offset: ${lastOffset.substring(0, 8)}...`);
    } catch (error) {
      onError(new Error(`Failed to get initial journal entry: ${error}`));
      return () => {}; // Return empty stop function
    }

    const pollForNewEntries = async () => {
      while (isRunning) {
        try {
          // Check rate limit before making request
          if (!checkRateLimit()) {
            const waitTime = 60000 - (Date.now() - lastMinuteTimestamp);
            onStatusUpdate(`⏳ Rate limit reached, waiting ${Math.ceil(waitTime / 1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          // Try to get next entry after current offset
          if (lastOffset) {
            try {
              const nextEntry = await this.getNextJournalEntry(lastOffset, { suppressErrorLogging: true });
              incrementRequestCount();
              
              // Check if this is actually a new entry (different offset)
              if (nextEntry.currentOffset !== lastOffset) {
                lastOffset = nextEntry.currentOffset;
                onNewEntry(nextEntry);
              }
            } catch (error) {
              incrementRequestCount();
              
              // If no next entry available, that's expected - just continue polling silently
              if (error instanceof ApiClientError && error.statusCode === 204) {
                // No new entries available yet - this is normal, but still wait before next poll
                // Don't call continue here as it skips the delay!
              } else {
                // For other errors, report them
                onError(new Error(`Error checking for new entries: ${error}`));
              }
            }
          }

          // Wait before next poll
          await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
        } catch (error) {
          if (isRunning) {
            onError(new Error(`Streaming error: ${error}`));
          }
          await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS * 2)); // Wait longer on error
        }
      }
    };

    // Start polling in background
    pollForNewEntries().catch(error => {
      if (isRunning) {
        onError(new Error(`Streaming failed: ${error}`));
      }
    });

    // Return stop function
    return () => {
      isRunning = false;
      onStatusUpdate('🛑 Streaming stopped');
    };
  }
} 