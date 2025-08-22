import { ApiClient } from './api-client';
import { CreateSnapshotsRequest } from '../types/api';

export class SnapshotsApi {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Create CRM object snapshots
   */
  async createSnapshots(request: CreateSnapshotsRequest): Promise<void> {
    await this.apiClient.post<void>('/webhooks/v4/snapshots/crm', request);
  }
} 