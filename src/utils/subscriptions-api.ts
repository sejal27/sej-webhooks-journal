import { ApiClient } from './api-client';
import { 
  Subscription, 
  CreateSubscriptionRequest, 
  SubscriptionsResponse 
} from '../types/api';

export class SubscriptionsApi {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Get all subscriptions for the app
   */
  async getSubscriptions(): Promise<Subscription[]> {
    const response = await this.apiClient.get<SubscriptionsResponse>('/webhooks/v4/subscriptions');
    return response.results;
  }

  /**
   * Create a new subscription
   */
  async createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    return await this.apiClient.post<Subscription>('/webhooks/v4/subscriptions', request);
  }

  /**
   * Delete a subscription by ID
   */
  async deleteSubscription(subscriptionId: number): Promise<void> {
    await this.apiClient.delete(`/webhooks/v4/subscriptions/${subscriptionId}`);
  }

  /**
   * Delete all subscriptions for a portal
   */
  async deletePortalSubscriptions(portalId: number): Promise<void> {
    try {
      await this.apiClient.delete(`/webhooks/v4/subscriptions/portals/${portalId}`);
    } catch (error: any) {
      // If bulk delete fails with internal error, try individual deletion as fallback
      if (error.statusCode === 500) {
        console.log('⚠️  Bulk delete failed, trying individual deletion...');
        await this.deletePortalSubscriptionsIndividually(portalId);
        return;
      }
      throw error;
    }
  }

  /**
   * Delete all subscriptions for a portal individually (fallback method)
   */
  private async deletePortalSubscriptionsIndividually(portalId: number): Promise<void> {
    // Get all subscriptions
    const subscriptions = await this.getSubscriptions();
    
    // Filter subscriptions for the specific portal
    const portalSubscriptions = subscriptions.filter(sub => sub.portalId === portalId);
    
    if (portalSubscriptions.length === 0) {
      console.log(`📋 No subscriptions found for portal ${portalId}`);
      return;
    }

    console.log(`🔄 Deleting ${portalSubscriptions.length} subscription(s) individually...`);
    
    // Delete each subscription individually
    for (const subscription of portalSubscriptions) {
      try {
        await this.deleteSubscription(subscription.id);
        console.log(`✅ Deleted subscription ${subscription.id}`);
      } catch (error) {
        console.error(`❌ Failed to delete subscription ${subscription.id}:`, error);
      }
    }
  }
} 