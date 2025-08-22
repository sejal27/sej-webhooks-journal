import inquirer from 'inquirer';
import { HubSpotConfig } from '../types/config';
import {
  CliContext,
  MainMenuChoices,
  SubscriptionMenuChoices,
  SnapshotMenuChoices,
  JournalMenuChoices
} from '../types/cli';
import {
  OBJECT_TYPE_IDS,
  SUBSCRIPTION_ACTIONS,
  CreateSubscriptionRequest,
  JournalEntry,
  JournalEntryWithData,
  JournalEvent
} from '../types/api';
import { AuthManager } from './auth';
import { ApiClient, ApiClientError } from './api-client';
import { SubscriptionsApi } from './subscriptions-api';
import { SnapshotsApi } from './snapshots-api';
import { JournalApi } from './journal-api';
import {
  displaySubscriptions,
  displayApiError,
  displaySuccess,
  displayInfo,
  displayWarning,
  formatObjectTypeName
} from './cli-helpers';


export class InteractiveCLI {
  private config: HubSpotConfig;
  private authManager: AuthManager;
  private context: CliContext;
  private apiClient: ApiClient;
  private subscriptionsApi: SubscriptionsApi;
  private snapshotsApi: SnapshotsApi;
  private journalApi: JournalApi;

  constructor(config: HubSpotConfig, authManager: AuthManager) {
    this.config = config;
    this.authManager = authManager;
    this.context = {
      isAuthenticated: false,
      currentPortalId: config.defaultPortalId
    };

    // Initialize API services
    this.apiClient = new ApiClient(config, authManager);
    this.subscriptionsApi = new SubscriptionsApi(this.apiClient);
    this.snapshotsApi = new SnapshotsApi(this.apiClient);
    this.journalApi = new JournalApi(this.apiClient);

    // Configure terminal for better compatibility
    this.configureTerminal();
  }

  /**
   * Configure terminal for better inquirer compatibility
   */
  private configureTerminal(): void {
    // Ensure we're in an interactive terminal
    if (!process.stdout.isTTY) {
      console.error('❌ This CLI requires an interactive terminal');
      process.exit(1);
    }

    // Set up proper terminal handling for inquirer
    process.stdout.write('\x1b[?25h'); // Show cursor

    // Handle terminal resize
    process.stdout.on('resize', () => {
      // Inquirer handles this automatically in newer versions
    });
  }

  /**
   * Start the interactive CLI
   */
  async start(): Promise<void> {
    console.log('\n🚀 Starting interactive CLI...');

    // Test authentication
    try {
      const token = await this.authManager.getAccessToken();
      this.context.isAuthenticated = true;
      this.context.currentToken = token;

      if (this.config.debug) {
        console.log('✅ Authentication successful - CLI ready');
      }
    } catch (error) {
      console.error('❌ Authentication failed - some features may not work');
      this.context.isAuthenticated = false;
    }

    // Start main menu loop
    await this.showMainMenu();
  }

  /**
   * Display the main menu
   */
  private async showMainMenu(): Promise<void> {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                           🚀 HubSpot Webhooks Journal API CLI                                         ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📊 Status:', this.context.isAuthenticated ? '✅ Authenticated' : '❌ Not authenticated');
    console.log('');

    const choices = [
      {
        name: '📋 Subscriptions - Manage webhook subscriptions',
        value: MainMenuChoices.SUBSCRIPTIONS,
        short: 'Subscriptions'
      },
      {
        name: '📸 Snapshots - Create object snapshots',
        value: MainMenuChoices.SNAPSHOTS,
        short: 'Snapshots'
      },
      {
        name: '📚 Journal - Access journal data',
        value: MainMenuChoices.JOURNAL,
        short: 'Journal'
      },
      {
        name: '🚪 Exit',
        value: MainMenuChoices.EXIT,
        short: 'Exit'
      }
    ];

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'Select a category:',
        choices,
        pageSize: 10
      }
    ]);

    await this.handleMainMenuChoice(answer.choice);
  }

  /**
   * Handle main menu choice
   */
  private async handleMainMenuChoice(choice: MainMenuChoices): Promise<void> {
    switch (choice) {
      case MainMenuChoices.SUBSCRIPTIONS:
        await this.showSubscriptionsMenu();
        break;
      case MainMenuChoices.SNAPSHOTS:
        await this.showSnapshotsMenu();
        break;
      case MainMenuChoices.JOURNAL:
        await this.showJournalMenu();
        break;
      case MainMenuChoices.EXIT:
        console.log('\n👋 Thanks for using the HubSpot Webhooks Journal API CLI!');
        process.exit(0);
        break;
    }
  }

  /**
   * Display the subscriptions menu
   */
  private async showSubscriptionsMenu(): Promise<void> {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                                    📋 Subscriptions Menu                                              ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Manage webhook subscriptions for your HubSpot app');
    console.log('');

    const choices = [
      {
        name: '📋 List all subscriptions',
        value: SubscriptionMenuChoices.LIST_SUBSCRIPTIONS,
        short: 'List subscriptions'
      },
      {
        name: '➕ Create new subscription',
        value: SubscriptionMenuChoices.CREATE_SUBSCRIPTION,
        short: 'Create subscription'
      },
      {
        name: '🗑️  Delete subscription by ID',
        value: SubscriptionMenuChoices.DELETE_SUBSCRIPTION,
        short: 'Delete subscription'
      },
      {
        name: '🗑️  Delete all portal subscriptions',
        value: SubscriptionMenuChoices.DELETE_PORTAL_SUBSCRIPTIONS,
        short: 'Delete portal subscriptions'
      },
      {
        name: '⬅️  Back to main menu',
        value: SubscriptionMenuChoices.BACK,
        short: 'Back'
      }
    ];

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'Select an action:',
        choices,
        pageSize: 10
      }
    ]);

    await this.handleSubscriptionMenuChoice(answer.choice);
  }

  /**
   * Handle subscription menu choice
   */
  private async handleSubscriptionMenuChoice(choice: SubscriptionMenuChoices): Promise<void> {
    switch (choice) {
      case SubscriptionMenuChoices.LIST_SUBSCRIPTIONS:
        await this.listSubscriptions();
        break;
      case SubscriptionMenuChoices.CREATE_SUBSCRIPTION:
        await this.createSubscription();
        break;
      case SubscriptionMenuChoices.DELETE_SUBSCRIPTION:
        await this.deleteSubscription();
        break;
      case SubscriptionMenuChoices.DELETE_PORTAL_SUBSCRIPTIONS:
        await this.deletePortalSubscriptions();
        break;
      case SubscriptionMenuChoices.BACK:
        await this.showMainMenu();
        break;
    }
  }

  /**
   * List subscriptions with optional portal filtering
   */
  private async listSubscriptions(): Promise<void> {
    if (!this.context.isAuthenticated) {
      displayWarning('Authentication required for API calls');
      await this.pressAnyKey();
      await this.showSubscriptionsMenu();
      return;
    }

    let currentPortalId: number | undefined = undefined;

    while (true) {
      try {
        console.clear();
        console.log('📋 Subscriptions List');
        console.log('===================');
        console.log('');

        // Get portal ID filter
        const portalIdFilter = await this.collectPortalIdFilter(currentPortalId);
        currentPortalId = portalIdFilter;

        console.log('\n🔄 Fetching subscriptions...');
        const subscriptions = await this.subscriptionsApi.getSubscriptions();

        // Filter by portal ID if specified
        const filteredSubscriptions = portalIdFilter
          ? subscriptions.filter(sub => sub.portalId === portalIdFilter)
          : subscriptions;

        console.clear();
        console.log('📋 Subscriptions List');
        console.log('===================');
        console.log('');

        displaySubscriptions(filteredSubscriptions, portalIdFilter);

        // Show action menu
        const action = await this.showSubscriptionListActions();

        if (action === 'back') {
          await this.showSubscriptionsMenu();
          return;
        } else if (action === 'change-filter') {
          // Continue loop to change filter
          continue;
        } else if (action === 'refresh') {
          // Continue loop to refresh with same filter
          continue;
        }

      } catch (error) {
        console.log('');
        displayApiError(error);
        await this.pressAnyKey();
        continue;
      }
    }
  }

  /**
   * Collect portal ID filter from user (optional)
   */
  private async collectPortalIdFilter(currentPortalId?: number): Promise<number | undefined> {
    const defaultValue = currentPortalId ||
      (this.config.defaultPortalId && !this.config.defaultPortalId.includes('your_portal_id_here')
        ? this.config.defaultPortalId
        : undefined);

    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'portalId',
        message: 'Enter portal ID to filter by (leave empty for all portals):',
        default: defaultValue,
        validate: (input: string) => {
          if (!input || input.trim() === '') {
            return true; // Empty is valid - shows all portals
          }
          const id = parseInt(input);
          if (isNaN(id) || id <= 0) {
            return 'Please enter a valid portal ID (positive number) or leave empty for all portals';
          }
          return true;
        }
      }
    ]);

    const input = answer.portalId?.trim();
    return input && input !== '' ? parseInt(input) : undefined;
  }

  /**
   * Show actions available after listing subscriptions
   */
  private async showSubscriptionListActions(): Promise<string> {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          {
            name: '🔄 Refresh list',
            value: 'refresh',
            short: 'Refresh'
          },
          {
            name: '🔍 Change portal filter',
            value: 'change-filter',
            short: 'Change filter'
          },
          {
            name: '⬅️  Back to subscriptions menu',
            value: 'back',
            short: 'Back'
          }
        ]
      }
    ]);

    return answer.action;
  }

  /**
   * Create a new subscription
   */
  private async createSubscription(): Promise<void> {
    if (!this.context.isAuthenticated) {
      displayWarning('Authentication required for API calls');
      await this.pressAnyKey();
      await this.showSubscriptionsMenu();
      return;
    }

    try {
      console.log('\n➕ Create New Subscription');
      console.log('========================');
      console.log('');

      // Collect subscription parameters
      const portalId = await this.collectPortalId();
      const objectTypeId = await this.collectObjectTypeId();
      const subscriptionType = await this.collectSubscriptionType();
      const actions = await this.collectActions(subscriptionType);
      let properties: string[] = [];
      if (subscriptionType === 'OBJECT') {
        properties = await this.collectProperties();
      }
      const objectIds = await this.collectSubscriptionObjectIds();

      const request: CreateSubscriptionRequest = {
        portalId,
        objectTypeId,
        subscriptionType,
        actions,
        properties: properties.length > 0 ? properties : undefined,
        objectIds: objectIds.length > 0 ? objectIds : undefined
      };

      console.log('\n🔄 Creating subscription...');
      const subscription = await this.subscriptionsApi.createSubscription(request);

      console.log('');
      displaySuccess('Subscription created successfully!');
      console.log('');
      console.log(`📋 Subscription ID: ${subscription.id}`);
      console.log(`   Object Type: ${formatObjectTypeName(subscription.objectTypeId)}`);
      console.log(`   Portal ID: ${subscription.portalId}`);
      console.log(`   Actions: ${subscription.actions.join(', ')}`);
      if (subscription.objectIds && subscription.objectIds.length > 0) {
        console.log(`   Object IDs: ${subscription.objectIds.join(', ')}`);
      } else {
        console.log(`   Object IDs: All objects (no filter)`);
      }

    } catch (error) {
      console.log('');
      displayApiError(error);
    }

    await this.pressAnyKey();
    await this.showSubscriptionsMenu();
  }

  /**
   * Delete a subscription by ID
   */
  private async deleteSubscription(): Promise<void> {
    if (!this.context.isAuthenticated) {
      displayWarning('Authentication required for API calls');
      await this.pressAnyKey();
      await this.showSubscriptionsMenu();
      return;
    }

    try {
      const answer = await inquirer.prompt([
        {
          type: 'input',
          name: 'subscriptionId',
          message: 'Enter the subscription ID to delete:',
          validate: (input: string) => {
            const id = parseInt(input);
            if (isNaN(id) || id <= 0) {
              return 'Please enter a valid subscription ID (positive number)';
            }
            return true;
          }
        }
      ]);

      const subscriptionId = parseInt(answer.subscriptionId);

      // Confirm deletion
      const confirm = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmDelete',
          message: `Are you sure you want to delete subscription ${subscriptionId}?`,
          default: false
        }
      ]);

      if (confirm.confirmDelete) {
        console.log('\n🔄 Deleting subscription...');
        await this.subscriptionsApi.deleteSubscription(subscriptionId);

        console.log('');
        displaySuccess(`Subscription ${subscriptionId} deleted successfully!`);
      } else {
        displayInfo('Deletion cancelled.');
      }

    } catch (error) {
      console.log('');
      displayApiError(error);
    }

    await this.pressAnyKey();
    await this.showSubscriptionsMenu();
  }

  /**
   * Delete all subscriptions for a portal
   */
  private async deletePortalSubscriptions(): Promise<void> {
    if (!this.context.isAuthenticated) {
      displayWarning('Authentication required for API calls');
      await this.pressAnyKey();
      await this.showSubscriptionsMenu();
      return;
    }

    try {
      const portalId = await this.collectPortalId();

      // Confirm deletion
      const confirm = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmDelete',
          message: `Are you sure you want to delete ALL subscriptions for portal ${portalId}? This cannot be undone.`,
          default: false
        }
      ]);

      if (confirm.confirmDelete) {
        console.log('\n🔄 Deleting all portal subscriptions...');
        await this.subscriptionsApi.deletePortalSubscriptions(portalId);

        console.log('');
        displaySuccess(`All subscriptions for portal ${portalId} deleted successfully!`);
      } else {
        displayInfo('Deletion cancelled.');
      }

    } catch (error) {
      console.log('');
      displayApiError(error);
    }

    await this.pressAnyKey();
    await this.showSubscriptionsMenu();
  }

  /**
   * Collect portal ID from user
   */
  private async collectPortalId(): Promise<number> {
    // Don't use placeholder values as defaults
    const defaultValue = this.config.defaultPortalId &&
                        !this.config.defaultPortalId.includes('your_portal_id_here')
                        ? this.config.defaultPortalId
                        : undefined;

    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'portalId',
        message: 'Enter the portal ID for this subscription:',
        default: defaultValue,
        validate: (input: string) => {
          const id = parseInt(input);
          if (isNaN(id) || id <= 0) {
            return 'Please enter a valid portal ID (positive number)';
          }
          return true;
        }
      }
    ]);

    return parseInt(answer.portalId);
  }

  /**
   * Collect object type ID from user
   */
  private async collectObjectTypeId(): Promise<string> {
    const objectTypeChoices = Object.entries(OBJECT_TYPE_IDS).map(([name, id]) => ({
      name: `${name} (${id})`,
      value: id,
      short: name
    }));

    // Add custom option
    objectTypeChoices.push({
      name: 'Custom object type (enter manually)',
      value: 'custom' as any,
      short: 'Custom'
    });

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'objectTypeId',
        message: 'Select object type:',
        choices: objectTypeChoices,
        pageSize: 15
      }
    ]);

    if (answer.objectTypeId === 'custom') {
      const customAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'customObjectTypeId',
          message: 'Enter custom object type ID:',
          validate: (input: string) => {
            if (!input.trim()) {
              return 'Object type ID cannot be empty';
            }
            return true;
          }
        }
      ]);
      return customAnswer.customObjectTypeId;
    }

    return answer.objectTypeId;
  }

  /**
   * Collect subscription type from user
   */
  private async collectSubscriptionType(): Promise<'OBJECT' | 'ASSOCIATION'> {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'subscriptionType',
        message: 'Select subscription type:',
        choices: [
          { name: 'OBJECT - Subscribe to object lifecycle events', value: 'OBJECT' },
          { name: 'ASSOCIATION - Subscribe to association events', value: 'ASSOCIATION' }
        ]
      }
    ]);

    return answer.subscriptionType;
  }

  /**
   * Collect actions from user
   */
  private async collectActions(subscriptionType: 'OBJECT' | 'ASSOCIATION'): Promise<string[]> {
    // Filter actions based on subscription type
    const getValidActions = (type: 'OBJECT' | 'ASSOCIATION'): string[] => {
      switch (type) {
        case 'OBJECT':
          return ['CREATE', 'UPDATE', 'DELETE', 'MERGE', 'RESTORE'];
        case 'ASSOCIATION':
          return ['ASSOCIATION_ADDED', 'ASSOCIATION_REMOVED'];
        default:
          return [];
      }
    };

    const validActions = getValidActions(subscriptionType);
    const actionChoices = validActions.map(action => ({
      name: `${action} - ${this.getActionDescription(action)}`,
      value: action,
      short: action
    }));

    const answer = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'actions',
        message: `Select actions to subscribe to for ${subscriptionType} subscription (use spacebar to select):`,
        choices: actionChoices,
        validate: (choices: string[]) => {
          if (choices.length === 0) {
            return 'Please select at least one action';
          }
          return true;
        }
      }
    ]);

    return answer.actions;
  }

  /**
   * Collect properties from user
   */
  private async collectProperties(): Promise<string[]> {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'properties',
        message: 'Enter property names (comma-separated, optional):',
        default: ''
      }
    ]);

    if (!answer.properties.trim()) {
      return [];
    }

    return answer.properties.split(',').map((prop: string) => prop.trim()).filter(Boolean);
  }

  /**
   * Get description for an action
   */
  private getActionDescription(action: string): string {
    const descriptions: { [key: string]: string } = {
      'CREATE': 'Object creation events',
      'UPDATE': 'Object modification events',
      'DELETE': 'Object deletion events',
      'MERGE': 'Object merge events',
      'RESTORE': 'Object restoration events',
      'ASSOCIATION_ADDED': 'Association creation events',
      'ASSOCIATION_REMOVED': 'Association removal events',
      'SNAPSHOT': 'Snapshot generation events'
    };

    return descriptions[action] || 'Unknown action';
  }

  /**
   * Display the snapshots menu
   */
  private async showSnapshotsMenu(): Promise<void> {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                                     📸 Snapshots Menu                                                 ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Create snapshots of CRM objects for specific points in time');
    console.log('');

    const choices = [
      {
        name: '📸 Create CRM object snapshots',
        value: SnapshotMenuChoices.CREATE_SNAPSHOTS,
        short: 'Create snapshots'
      },
      {
        name: '⬅️  Back to main menu',
        value: SnapshotMenuChoices.BACK,
        short: 'Back'
      }
    ];

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'Select an action:',
        choices,
        pageSize: 10
      }
    ]);

    await this.handleSnapshotMenuChoice(answer.choice);
  }

  /**
   * Handle snapshot menu choice
   */
  private async handleSnapshotMenuChoice(choice: SnapshotMenuChoices): Promise<void> {
    switch (choice) {
      case SnapshotMenuChoices.CREATE_SNAPSHOTS:
        await this.createSnapshots();
        break;
      case SnapshotMenuChoices.BACK:
        await this.showMainMenu();
        break;
    }
  }

  /**
   * Display the journal menu
   */
  private async showJournalMenu(): Promise<void> {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                                     📚 Journal Menu                                                   ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Access historical event data stored in chronological order');
    console.log('');

    const choices = [
      {
        name: '⏮️  Get earliest journal entry',
        value: JournalMenuChoices.GET_EARLIEST,
        short: 'Get earliest'
      },
      {
        name: '⏭️  Get latest journal entry',
        value: JournalMenuChoices.GET_LATEST,
        short: 'Get latest'
      },
      {
        name: '➡️  Get next journal entry (requires offset)',
        value: JournalMenuChoices.GET_NEXT,
        short: 'Get next'
      },
      {
        name: '🌊 Stream new journal entries (real-time)',
        value: JournalMenuChoices.STREAM,
        short: 'Stream'
      },
      {
        name: '⬅️  Back to main menu',
        value: JournalMenuChoices.BACK,
        short: 'Back'
      }
    ];

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'Select an action:',
        choices,
        pageSize: 10
      }
    ]);

    await this.handleJournalMenuChoice(answer.choice);
  }

  /**
   * Handle journal menu choice
   */
  private async handleJournalMenuChoice(choice: JournalMenuChoices): Promise<void> {
    switch (choice) {
      case JournalMenuChoices.GET_EARLIEST:
        await this.getEarliestJournalEntry();
        break;
      case JournalMenuChoices.GET_LATEST:
        await this.getLatestJournalEntry();
        break;
      case JournalMenuChoices.GET_NEXT:
        await this.getNextJournalEntry();
        break;
      case JournalMenuChoices.STREAM:
        await this.streamJournalEntries();
        break;
      case JournalMenuChoices.BACK:
        await this.showMainMenu();
        break;
    }
  }

  /**
   * Wait for user to press any key
   */
  private async pressAnyKey(): Promise<void> {
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Press Enter to continue...'
      }
    ]);
  }

  /**
   * Create new snapshots
   */
  private async createSnapshots(): Promise<void> {
    if (!this.context.isAuthenticated) {
      displayWarning('Authentication required for API calls');
      await this.pressAnyKey();
      await this.showSnapshotsMenu();
      return;
    }

    try {
      console.log('\n📸 Create New Snapshots');
      console.log('=======================');
      console.log('');

      // Collect snapshot parameters
      const portalId = await this.collectPortalId();
      const objectTypeId = await this.collectObjectTypeId();
      const objectIds = await this.collectObjectIds();
      const properties = await this.collectProperties();

      // Create snapshot requests
      const snapshotRequests = objectIds.map(objectId => ({
        portalId,
        objectId,
        objectTypeId,
        properties: properties
      }));

      const request = { snapshotRequests };

      console.log('\n🔄 Creating snapshots...');
      await this.snapshotsApi.createSnapshots(request);

      console.log('');
      displaySuccess('Snapshots created successfully!');
      console.log('');
      console.log(`📸 Created ${snapshotRequests.length} snapshot(s) for:`);
      console.log(`   Portal ID: ${portalId}`);
      console.log(`   Object Type: ${formatObjectTypeName(objectTypeId)}`);
      console.log(`   Object IDs: ${objectIds.join(', ')}`);
      console.log(`   Properties: ${properties.length > 0 ? properties.join(', ') : '*'}`);

    } catch (error) {
      console.log('');
      displayApiError(error);
    }

    await this.pressAnyKey();
    await this.showSnapshotsMenu();
  }

  /**
   * Get earliest journal entry
   */
  private async getEarliestJournalEntry(): Promise<void> {
    if (!this.context.isAuthenticated) {
      displayWarning('Authentication required for API calls');
      await this.pressAnyKey();
      await this.showJournalMenu();
      return;
    }

    try {
      console.log('\n⏮️  Get Earliest Journal Entry');
      console.log('==============================');
      console.log('');

      console.log('🔄 Fetching earliest journal entry...');
      const entry = await this.journalApi.getEarliestJournalEntry();
      console.log('📥 Downloaded journal data successfully!');

      console.log('');
      displaySuccess('Retrieved earliest journal entry with data!');
      console.log('');
      this.displayJournalEntry(entry);

      // Offer next offset option
      const wantNext = await this.offerNextOffsetOption(entry.currentOffset);
      if (wantNext) {
        await this.getNextJournalEntryFromOffset(entry.currentOffset);
      }

    } catch (error) {
      console.log('');
      displayApiError(error);
      await this.pressAnyKey();
    }

    await this.showJournalMenu();
  }

  /**
   * Get latest journal entry
   */
  private async getLatestJournalEntry(): Promise<void> {
    if (!this.context.isAuthenticated) {
      displayWarning('Authentication required for API calls');
      await this.pressAnyKey();
      await this.showJournalMenu();
      return;
    }

    try {
      console.log('\n⏭️  Get Latest Journal Entry');
      console.log('============================');
      console.log('');

      console.log('🔄 Fetching latest journal entry...');
      const entry = await this.journalApi.getLatestJournalEntry();
      console.log('📥 Downloaded journal data successfully!');

      console.log('');
      displaySuccess('Retrieved latest journal entry with data!');
      console.log('');
      this.displayJournalEntry(entry);

    } catch (error) {
      console.log('');
      displayApiError(error);
    }

    await this.pressAnyKey();
    await this.showJournalMenu();
  }

  /**
   * Get next journal entry by offset
   */
  private async getNextJournalEntry(): Promise<void> {
    if (!this.context.isAuthenticated) {
      displayWarning('Authentication required for API calls');
      await this.pressAnyKey();
      await this.showJournalMenu();
      return;
    }

    try {
      console.log('\n➡️  Get Next Journal Entry');
      console.log('==========================');
      console.log('');

      // Collect offset
      const offset = await this.collectJournalOffset();

      console.log('\n🔄 Fetching next journal entry...');
      const entry = await this.journalApi.getNextJournalEntry(offset, { suppressErrorLogging: true });
      console.log('📥 Downloaded journal data successfully!');

      console.log('');
      displaySuccess('Retrieved next journal entry with data!');
      console.log('');
      this.displayJournalEntry(entry);

      // Offer next offset option
      const wantNext = await this.offerNextOffsetOption(entry.currentOffset);
      if (wantNext) {
        await this.getNextJournalEntryFromOffset(entry.currentOffset);
      }

    } catch (error) {
      console.log('');
      // Handle 204 specifically with terse message
      if (error instanceof ApiClientError && error.statusCode === 204) {
        displayInfo('You are already on the latest offset.');
      } else {
        displayApiError(error);
      }
      await this.pressAnyKey();
    }

    await this.showJournalMenu();
  }

  /**
   * Offer next offset option after displaying a journal entry
   * Returns true if user wants to get next entry, false if they want to return to menu
   */
  private async offerNextOffsetOption(currentOffset: string): Promise<boolean> {
    console.log('');

    const choices = [
      {
        name: `➡️  Get next journal entry from offset: ${currentOffset.substring(0, 12)}...`,
        value: 'next',
        short: 'Get next'
      },
      {
        name: '⬅️  Back to journal menu',
        value: 'back',
        short: 'Back'
      }
    ];

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'What would you like to do next?',
        choices,
        pageSize: 10
      }
    ]);

    return answer.choice === 'next';
  }

  /**
   * Get next journal entry from a given offset with proper error handling
   */
  private async getNextJournalEntryFromOffset(offset: string): Promise<boolean> {
    try {
      console.log('\n🔄 Fetching next journal entry...');
      const entry = await this.journalApi.getNextJournalEntry(offset, { suppressErrorLogging: true });
      console.log('📥 Downloaded journal data successfully!');

      console.log('');
      displaySuccess('Retrieved next journal entry with data!');
      console.log('');
      this.displayJournalEntry(entry);

      // Offer next offset option again (recursive)
      const wantNext = await this.offerNextOffsetOption(entry.currentOffset);
      if (wantNext) {
        return await this.getNextJournalEntryFromOffset(entry.currentOffset);
      }

      return false;

    } catch (error) {
      // Handle 404 and 204 specifically with terse message
      if (error instanceof ApiClientError && error.statusCode === 204) {
        console.log('');
        displayInfo('You are already on the latest offset.');
      } else {
        console.log('');
        displayApiError(error);
      }

      await this.pressAnyKey();
      return false;
    }
  }

  /**
   * Stream journal entries in real-time
   */
  private async streamJournalEntries(): Promise<void> {
    if (!this.context.isAuthenticated) {
      displayWarning('Authentication required for API calls');
      await this.pressAnyKey();
      await this.showJournalMenu();
      return;
    }

    try {
      console.log('\n🌊 Stream Journal Entries');
      console.log('=========================');
      console.log('');
      console.log('This will stream new journal entries as they are published.');
      console.log('Rate limiting: Max 30 requests per minute (HubSpot limit: 100/min)');
      console.log('');
      console.log('💡 Press Ctrl+C to stop streaming at any time');
      console.log('');

      // Ask user to confirm
      const confirm = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Start streaming journal entries?',
          default: true
        }
      ]);

      if (!confirm.proceed) {
        await this.showJournalMenu();
        return;
      }

      console.log('');
      console.log('🚀 Starting journal stream...');
      console.log('────────────────────────────────────────────────────────────────');

      let entryCount = 0;
      let isStreamActive = true;

      // Set up Ctrl+C handler
      const originalHandler = process.listeners('SIGINT');
      const handleInterrupt = () => {
        console.log('\n\n🛑 Stream interrupted by user');
        isStreamActive = false;
        process.removeListener('SIGINT', handleInterrupt);
        // Restore original handlers
        originalHandler.forEach(handler => {
          process.on('SIGINT', handler as NodeJS.SignalsListener);
        });
      };
      process.on('SIGINT', handleInterrupt);

      try {
        const stopStream = await this.journalApi.streamJournalEntries(
          // onNewEntry callback
          (entry: JournalEntryWithData) => {
            if (!isStreamActive) return;

            entryCount++;
            console.log(`\n📄 New Journal Entry #${entryCount} [${new Date().toLocaleTimeString()}]`);
            console.log(`   Offset: ${entry.currentOffset.substring(0, 8)}...`);
            console.log(`   Expires: ${new Date(entry.expiresAt).toLocaleString()}`);

            if (entry.data && entry.data.journalEvents && Array.isArray(entry.data.journalEvents)) {
              const events = entry.data.journalEvents;
              console.log(`   Events: ${events.length}`);
              console.log(`   Published: ${new Date(entry.data.publishedAt).toLocaleString()}`);
              console.log('');

              // Display each event
              events.forEach((event, index) => {
                console.log(`   🎯 Event ${index + 1}:`);
                console.log(`      Type: ${event.type || 'Unknown'}`);
                console.log(`      Portal: ${event.portalId}`);
                console.log(`      Action: ${event.action || 'N/A'}`);
                if (event.occurredAt) {
                  console.log(`      Time: ${new Date(event.occurredAt).toLocaleString()}`);
                }
                if (event.type === 'association') {
                  console.log(`      From Object Type: ${event.fromObjectTypeId}`);
                  console.log(`      From Object ID:   ${event.fromObjectId}`);
                  console.log(`      To Object Type:   ${event.toObjectTypeId}`);
                  console.log(`      To Object ID:     ${event.toObjectId}`);
                  if (event.associationTypeId !== undefined) {
                    console.log(`      Association Type ID: ${event.associationTypeId}`);
                  }
                  if (event.associationCategory !== undefined) {
                    console.log(`      Association Category: ${event.associationCategory}`);
                  }
                  if (event.isPrimary !== undefined) {
                    console.log(`      Is Primary: ${event.isPrimary}`);
                  }
                } else {
                  console.log(`      Object Type: ${event.objectTypeId}`);
                  console.log(`      Object ID:   ${event.objectId}`);
                }
                if (event.propertyChanges && Object.keys(event.propertyChanges).length > 0) {
                  console.log(`      Property Changes:`);
                  Object.entries(event.propertyChanges).forEach(([property, value]) => {
                    const displayValue = typeof value === 'string' && value.length > 100
                      ? `${value.substring(0, 100)}...`
                      : JSON.stringify(value);
                    console.log(`        ${property}: ${displayValue}`);
                  });
                }
                if (index < events.length - 1) {
                  console.log('      ┈'.repeat(30));
                }
              });
            } else {
              console.log('   ⚠️  No events data found');
            }

            console.log('────────────────────────────────────────────────────────────────');
          },

          // onError callback
          (error: Error) => {
            if (!isStreamActive) return;
            console.log(`\n❌ Stream error: ${error.message}`);
          },

          // onStatusUpdate callback
          (status: string) => {
            if (!isStreamActive) return;
            console.log(`ℹ️  ${status}`);
          }
        );

        // Wait for stream to be stopped
        while (isStreamActive) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Stop the stream
        stopStream();

      } finally {
        // Cleanup: remove interrupt handler
        process.removeListener('SIGINT', handleInterrupt);
        // Restore original handlers
        originalHandler.forEach(handler => {
          process.on('SIGINT', handler as NodeJS.SignalsListener);
        });
      }

      console.log(`\n✅ Stream completed. Total entries received: ${entryCount}`);

    } catch (error) {
      console.log('');
      displayApiError(error);
    }

    await this.pressAnyKey();
    await this.showJournalMenu();
  }

  /**
   * Collect journal offset from user
   */
  private async collectJournalOffset(): Promise<string> {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'offset',
        message: 'Enter the journal offset UUID:',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Please enter a valid offset UUID';
          }
          return true;
        }
      }
    ]);

    return answer.offset.trim();
  }

  /**
   * Collect object IDs from user (for snapshots)
   */
  private async collectObjectIds(): Promise<number[]> {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'objectIds',
        message: 'Enter object IDs (comma-separated):',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Please enter at least one object ID';
          }
          const ids = input.split(',').map(id => id.trim());
          for (const id of ids) {
            if (isNaN(parseInt(id)) || parseInt(id) <= 0) {
              return 'Please enter valid object IDs (positive numbers)';
            }
          }
          return true;
        }
      }
    ]);

    return answer.objectIds.split(',').map((id: string) => parseInt(id.trim()));
  }

  /**
   * Collect object IDs from user (for subscriptions - optional)
   */
  private async collectSubscriptionObjectIds(): Promise<number[]> {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'objectIds',
        message: 'Enter specific object IDs to subscribe to (comma-separated, leave empty for all objects):',
        default: '',
        validate: (input: string) => {
          if (!input.trim()) {
            return true; // Empty is valid - subscribe to all objects
          }
          const ids = input.split(',').map(id => id.trim());
          for (const id of ids) {
            if (isNaN(parseInt(id)) || parseInt(id) <= 0) {
              return 'Please enter valid object IDs (positive numbers) or leave empty for all objects';
            }
          }
          return true;
        }
      }
    ]);

    if (!answer.objectIds.trim()) {
      return [];
    }

    return answer.objectIds.split(',').map((id: string) => parseInt(id.trim()));
  }

  /**
   * Display a journal entry
   */
  private displayJournalEntry(entry: JournalEntryWithData): void {
    console.log('📚 Journal Entry:');
    console.log(`   Current Offset: ${entry.currentOffset}`);
    console.log(`   Expires At: ${new Date(entry.expiresAt).toLocaleString()}`);
    console.log('');

    // Debug: Show the actual data structure (only if needed for troubleshooting)
    if (this.config.debug && process.env.DEBUG_JOURNAL === 'true') {
      console.log('🔍 Debug - Raw data structure:');
      console.log(JSON.stringify(entry.data, null, 2));
      console.log('');
    }

    // Display journal data with defensive checks
    console.log('📋 Journal Data:');

    if (!entry.data) {
      console.log('   ❌ No data available');
      return;
    }

    // Check if journalEvents exist and is an array
    if (entry.data.journalEvents && Array.isArray(entry.data.journalEvents)) {
      const events = entry.data.journalEvents;
      console.log(`   Events: ${events.length}`);
      console.log(`   Published At: ${new Date(entry.data.publishedAt).toLocaleString()}`);
      console.log(`   Data Offset: ${entry.data.offset}`);
      console.log('');

      // Display events
      if (events.length > 0) {
        console.log('🎯 Events:');
        events.forEach((event, index) => {
          this.displayJournalEvent(event, index + 1);

          if (index < events.length - 1) {
            console.log('      ─'.repeat(50));
          }
        });
      } else {
        console.log('   No events found in this journal entry.');
      }
    } else {
      console.log('   ❌ Events data is not in expected format');
      console.log('   📋 Available data keys:', Object.keys(entry.data));
      console.log('   📄 Raw data:');
      console.log(JSON.stringify(entry.data, null, 2));
    }
  }

  /**
   * Display a single journal event
   */
  private displayJournalEvent(event: JournalEvent, index: number): void {
    console.log(`   ${index}. Event Type: ${event.type}`);
    console.log(`      Portal ID: ${event.portalId}`);
    console.log(`      Action: ${event.action}`);
    console.log(`      Occurred At: ${new Date(event.occurredAt).toLocaleString()}`);

    // Association-specific fields
    if (event.type === 'association') {
      console.log(`      From Object Type: ${event.fromObjectTypeId}`);
      console.log(`      From Object ID:   ${event.fromObjectId}`);
      console.log(`      To Object Type:   ${event.toObjectTypeId}`);
      console.log(`      To Object ID:     ${event.toObjectId}`);
      if (event.associationTypeId !== undefined) {
        console.log(`      Association Type ID: ${event.associationTypeId}`);
      }
      if (event.associationCategory !== undefined) {
        console.log(`      Association Category: ${event.associationCategory}`);
      }
      if (event.isPrimary !== undefined) {
        console.log(`      Is Primary: ${event.isPrimary}`);
      }
    } else {
      // Fallback for non-association events
      console.log(`      Object Type: ${event.objectTypeId} (${formatObjectTypeName(event.objectTypeId)})`);
      console.log(`      Object ID: ${event.objectId}`);
    }

    if (event.propertyChanges && Object.keys(event.propertyChanges).length > 0) {
      console.log(`      Property Changes:`);
      Object.entries(event.propertyChanges).forEach(([property, value]) => {
        console.log(`        ${property}: ${JSON.stringify(value)}`);
      });
    }

    if (event.associatedObjectId) {
      console.log(`      Associated Object ID: ${event.associatedObjectId}`);
      if (event.associatedObjectTypeId) {
        console.log(`      Associated Object Type: ${event.associatedObjectTypeId} (${formatObjectTypeName(event.associatedObjectTypeId)})`);
      }
    }

    if (event.associationType) {
      console.log(`      Association Type: ${event.associationType}`);
    }

    // Show any additional properties that might be present
    const knownKeys = [
      'type', 'portalId', 'objectTypeId', 'objectId', 'action', 'occurredAt', 'propertyChanges',
      'associatedObjectId', 'associatedObjectTypeId', 'associationType',
      'fromObjectId', 'toObjectId', 'fromObjectTypeId', 'toObjectTypeId',
      'associationTypeId', 'associationCategory', 'isPrimary'
    ];
    const additionalKeys = Object.keys(event).filter(key => !knownKeys.includes(key));
    if (additionalKeys.length > 0) {
      console.log(`      Additional Properties:`);
      additionalKeys.forEach(key => {
        console.log(`        ${key}: ${JSON.stringify(event[key])}`);
      });
    }
  }
}
