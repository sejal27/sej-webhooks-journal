import { Subscription } from '../types/api';

/**
 * Display a subscription in a formatted way
 */
export function displaySubscription(subscription: Subscription): void {
  console.log(`📋 Subscription ID: ${subscription.id}`);
  console.log(`   App ID: ${subscription.appId}`);
  console.log(`   Type: ${subscription.subscriptionType}`);
  console.log(`   Object Type: ${subscription.objectTypeId}`);
  console.log(`   Portal ID: ${subscription.portalId}`);
  console.log(`   Actions: ${subscription.actions.join(', ')}`);
  
  if (subscription.properties && subscription.properties.length > 0) {
    console.log(`   Properties: ${subscription.properties.join(', ')}`);
  }
  
  if (subscription.objectIds && subscription.objectIds.length > 0) {
    console.log(`   Object IDs: ${subscription.objectIds.join(', ')}`);
  }
  
  if (subscription.associatedObjectTypeIds && subscription.associatedObjectTypeIds.length > 0) {
    console.log(`   Associated Types: ${subscription.associatedObjectTypeIds.join(', ')}`);
  }
  
  console.log(`   Created: ${new Date(subscription.createdAt).toLocaleString()}`);
  console.log(`   Updated: ${new Date(subscription.updatedAt).toLocaleString()}`);
}

/**
 * Display a list of subscriptions
 */
export function displaySubscriptions(subscriptions: Subscription[], portalIdFilter?: number): void {
  if (subscriptions.length === 0) {
    if (portalIdFilter) {
      console.log(`📋 No subscriptions found for portal ${portalIdFilter}.`);
    } else {
      console.log('📋 No subscriptions found.');
    }
    return;
  }

  if (portalIdFilter) {
    console.log(`📋 Found ${subscriptions.length} subscription(s) for portal ${portalIdFilter}:`);
  } else {
    console.log(`📋 Found ${subscriptions.length} subscription(s):`);
  }
  console.log('');

  subscriptions.forEach((subscription, index) => {
    if (index > 0) {
      console.log('─'.repeat(80));
    }
    displaySubscription(subscription);
  });
}

/**
 * Display error information in a user-friendly way
 */
export function displayApiError(error: any): void {
  console.error('❌ API Error occurred:');
  
  if (error.statusCode) {
    console.error(`   Status Code: ${error.statusCode}`);
  }
  
  console.error(`   Message: ${error.message}`);
  
  if (error.correlationId) {
    console.error(`   Correlation ID: ${error.correlationId}`);
  }
  
  if (error.category) {
    console.error(`   Category: ${error.category}`);
  }
}

/**
 * Display a success message
 */
export function displaySuccess(message: string): void {
  console.log(`✅ ${message}`);
}

/**
 * Display an info message
 */
export function displayInfo(message: string): void {
  console.log(`ℹ️  ${message}`);
}

/**
 * Display a warning message
 */
export function displayWarning(message: string): void {
  console.log(`⚠️  ${message}`);
}

/**
 * Format object type ID to a human-readable name
 */
export function formatObjectTypeName(objectTypeId: string): string {
  const typeMap: { [key: string]: string } = {
    '0-1': 'Contacts',
    '0-2': 'Companies',
    '0-3': 'Deals',
    '0-4': 'Engagements',
    '0-5': 'Tickets',
    '0-7': 'Products',
    '0-8': 'Line Items',
    '0-11': 'Conversations',
    '0-14': 'Quotes',
    '0-15': 'Forms',
    '0-19': 'Feedback Submissions',
    '0-20': 'Attributions',
    '0-27': 'Tasks',
    '0-45': 'Object Lists'
  };

  return typeMap[objectTypeId] || `Custom Object (${objectTypeId})`;
} 