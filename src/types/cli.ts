export interface MenuChoice {
  name: string;
  value: string;
  description?: string;
}

export interface MenuOptions {
  type: 'list' | 'input' | 'confirm';
  name: string;
  message: string;
  choices?: MenuChoice[];
  default?: string | boolean;
}

export interface CliContext {
  isAuthenticated: boolean;
  currentToken?: string;
  currentPortalId?: string;
}

export enum MainMenuChoices {
  SUBSCRIPTIONS = 'subscriptions',
  SNAPSHOTS = 'snapshots', 
  JOURNAL = 'journal',
  EXIT = 'exit'
}

export enum SubscriptionMenuChoices {
  LIST_SUBSCRIPTIONS = 'list-subscriptions',
  CREATE_SUBSCRIPTION = 'create-subscription',
  DELETE_SUBSCRIPTION = 'delete-subscription',
  DELETE_PORTAL_SUBSCRIPTIONS = 'delete-portal-subscriptions',
  BACK = 'back'
}

export enum SnapshotMenuChoices {
  CREATE_SNAPSHOTS = 'create-snapshots',
  BACK = 'back'
}

export enum JournalMenuChoices {
  GET_EARLIEST = 'get-earliest',
  GET_LATEST = 'get-latest',
  GET_NEXT = 'get-next',
  STREAM = 'stream',
  BACK = 'back'
} 