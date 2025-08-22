export interface Subscription {
  id: number;
  appId: number;
  subscriptionType: 'OBJECT' | 'ASSOCIATION';
  objectTypeId: string;
  portalId: number;
  actions: string[];
  properties: string[] | null;
  objectIds: number[] | null;
  associatedObjectTypeIds: string[] | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateSubscriptionRequest {
  objectTypeId: string;
  subscriptionType: 'OBJECT' | 'ASSOCIATION';
  portalId: number;
  actions: string[];
  properties?: string[];
  objectIds?: number[];
  associatedObjectTypeIds?: string[];
}

export interface SubscriptionsResponse {
  results: Subscription[];
}

export interface JournalEntry {
  url: string;
  expiresAt: string;
  currentOffset: string;
}

export interface JournalEvent {
  type: string;
  portalId: number;
  occurredAt: string;
  action: string;
  objectTypeId: string;
  objectId: number;
  propertyChanges?: Record<string, any>;
  associatedObjectId?: number;
  associatedObjectTypeId?: string;
  associationType?: string;
  [key: string]: any; // Allow for additional properties
}

export interface JournalData {
  offset: string;
  journalEvents: JournalEvent[];
  publishedAt: string;
  [key: string]: any; // Allow for unknown structure
}

export interface JournalEntryWithData extends JournalEntry {
  data: JournalData;
}

export interface CreateSnapshotRequest {
  portalId: number;
  objectId: number;
  objectTypeId: string;
  properties: string[];
}

export interface CreateSnapshotsRequest {
  snapshotRequests: CreateSnapshotRequest[];
}

// Common object type IDs from the documentation
export const OBJECT_TYPE_IDS = {
  CONTACTS: '0-1',
  COMPANIES: '0-2',
  DEALS: '0-3',
  ENGAGEMENTS: '0-4',
  TICKETS: '0-5',
  PRODUCTS: '0-7',
  LINE_ITEMS: '0-8',
  CONVERSATIONS: '0-11',
  QUOTES: '0-14',
  FORMS: '0-15',
  FEEDBACK_SUBMISSIONS: '0-19',
  ATTRIBUTIONS: '0-20',
  TASKS: '0-27',
  OBJECT_LISTS: '0-45'
} as const;

// Available actions for subscriptions
export const SUBSCRIPTION_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  MERGE: 'MERGE',
  RESTORE: 'RESTORE',
  ASSOCIATION_ADDED: 'ASSOCIATION_ADDED',
  ASSOCIATION_REMOVED: 'ASSOCIATION_REMOVED',
  SNAPSHOT: 'SNAPSHOT'
} as const; 