import axios from 'axios';
import {
  DashboardStats,
  Environment,
  TestCase,
  TestCollection,
  CollectionFolder,
  TestExecution,
  CollectionExecution,
  ExecuteRequestPayload,
  ExecuteResponsePayload,
  ReportSummary,
  HistoryPaginationResponse,
  HistorySummaryStats,
  PerformanceAnalyticsResponse,
} from '../types';

const client = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    const { data } = await client.get<DashboardStats>('/dashboard/stats');
    return data;
  },

  // Interactive Execution
  executeRequest: async (payload: ExecuteRequestPayload): Promise<ExecuteResponsePayload> => {
    const { data } = await client.post<ExecuteResponsePayload>('/execute', payload);
    return data;
  },

  // Environments
  getEnvironments: async (): Promise<Environment[]> => {
    const { data } = await client.get<Environment[]>('/environments');
    return data;
  },
  getEnvironment: async (id: number, revealSecrets = false): Promise<Environment> => {
    const { data } = await client.get<Environment>(`/environments/${id}?reveal_secrets=${revealSecrets}`);
    return data;
  },
  createEnvironment: async (envData: Partial<Environment>): Promise<Environment> => {
    const { data } = await client.post<Environment>('/environments', envData);
    return data;
  },
  updateEnvironment: async (id: number, envData: Partial<Environment>): Promise<Environment> => {
    const { data } = await client.put<Environment>(`/environments/${id}`, envData);
    return data;
  },
  deleteEnvironment: async (id: number): Promise<void> => {
    await client.delete(`/environments/${id}`);
  },
  activateEnvironment: async (id: number): Promise<Environment> => {
    const { data } = await client.post<Environment>(`/environments/${id}/activate`);
    return data;
  },

  // Test Cases
  getTestCases: async (params?: { collection_id?: number; folder_id?: number; method?: string; search?: string }): Promise<TestCase[]> => {
    const { data } = await client.get<TestCase[]>('/test-cases', { params });
    return data;
  },
  getTestCase: async (id: number): Promise<TestCase> => {
    const { data } = await client.get<TestCase>(`/test-cases/${id}`);
    return data;
  },
  createTestCase: async (tcData: Partial<TestCase>): Promise<TestCase> => {
    const { data } = await client.post<TestCase>('/test-cases', tcData);
    return data;
  },
  updateTestCase: async (id: number, tcData: Partial<TestCase>): Promise<TestCase> => {
    const { data } = await client.put<TestCase>(`/test-cases/${id}`, tcData);
    return data;
  },
  deleteTestCase: async (id: number): Promise<void> => {
    await client.delete(`/test-cases/${id}`);
  },
  duplicateTestCase: async (id: number): Promise<TestCase> => {
    const { data } = await client.post<TestCase>(`/test-cases/${id}/duplicate`);
    return data;
  },
  executeTestCase: async (id: number, environmentId?: number | null): Promise<ExecuteResponsePayload> => {
    const url = environmentId ? `/test-cases/${id}/execute?environment_id=${environmentId}` : `/test-cases/${id}/execute`;
    const { data } = await client.post<ExecuteResponsePayload>(url);
    return data;
  },

  // Collections
  getCollections: async (): Promise<TestCollection[]> => {
    const { data } = await client.get<TestCollection[]>('/collections');
    return data;
  },
  getCollection: async (id: number): Promise<TestCollection> => {
    const { data } = await client.get<TestCollection>(`/collections/${id}`);
    return data;
  },
  createCollection: async (colData: Partial<TestCollection>): Promise<TestCollection> => {
    const { data } = await client.post<TestCollection>('/collections', colData);
    return data;
  },
  updateCollection: async (id: number, colData: Partial<TestCollection>): Promise<TestCollection> => {
    const { data } = await client.put<TestCollection>(`/collections/${id}`, colData);
    return data;
  },
  deleteCollection: async (id: number): Promise<void> => {
    await client.delete(`/collections/${id}`);
  },
  runCollection: async (id: number, environmentId?: number | null): Promise<CollectionExecution> => {
    const url = environmentId ? `/collections/${id}/run?environment_id=${environmentId}` : `/collections/${id}/run`;
    const { data } = await client.post<CollectionExecution>(url);
    return data;
  },
  getCollectionRuns: async (id: number): Promise<CollectionExecution[]> => {
    const { data } = await client.get<CollectionExecution[]>(`/collections/${id}/runs`);
    return data;
  },

  // Folders inside Collections
  getCollectionFolders: async (collectionId: number): Promise<CollectionFolder[]> => {
    const { data } = await client.get<CollectionFolder[]>(`/collections/${collectionId}/folders`);
    return data;
  },
  createCollectionFolder: async (
    collectionId: number,
    folderData: { name: string; description?: string; order_index?: number }
  ): Promise<CollectionFolder> => {
    const { data } = await client.post<CollectionFolder>(`/collections/${collectionId}/folders`, folderData);
    return data;
  },
  getCollectionFolder: async (collectionId: number, folderId: number): Promise<CollectionFolder> => {
    const { data } = await client.get<CollectionFolder>(`/collections/${collectionId}/folders/${folderId}`);
    return data;
  },
  updateCollectionFolder: async (
    collectionId: number,
    folderId: number,
    folderData: { name?: string; description?: string; order_index?: number }
  ): Promise<CollectionFolder> => {
    const { data } = await client.put<CollectionFolder>(`/collections/${collectionId}/folders/${folderId}`, folderData);
    return data;
  },
  deleteCollectionFolder: async (collectionId: number, folderId: number): Promise<void> => {
    await client.delete(`/collections/${collectionId}/folders/${folderId}`);
  },
  runFolder: async (collectionId: number, folderId: number, environmentId?: number | null): Promise<CollectionExecution> => {
    const url = environmentId
      ? `/collections/${collectionId}/folders/${folderId}/run?environment_id=${environmentId}`
      : `/collections/${collectionId}/folders/${folderId}/run`;
    const { data } = await client.post<CollectionExecution>(url);
    return data;
  },

  // History
  getHistory: async (params?: {
    method?: string;
    status?: string;
    search?: string;
    page?: number;
    page_size?: number;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<HistoryPaginationResponse> => {
    const { data } = await client.get<HistoryPaginationResponse>('/history', { params });
    return data;
  },
  getHistorySummary: async (params?: {
    method?: string;
    status?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<HistorySummaryStats> => {
    const { data } = await client.get<HistorySummaryStats>('/history/summary', { params });
    return data;
  },
  getHistoryDetail: async (id: number): Promise<TestExecution> => {
    const { data } = await client.get<TestExecution>(`/history/${id}`);
    return data;
  },
  deleteHistoryItem: async (id: number): Promise<void> => {
    await client.delete(`/history/${id}`);
  },
  clearHistory: async (): Promise<void> => {
    await client.delete('/history');
  },

  // Performance Analytics
  getPerformanceAnalytics: async (params?: {
    start_date?: string;
    end_date?: string;
    method?: string;
  }): Promise<PerformanceAnalyticsResponse> => {
    const cleanParams: Record<string, string> = {};
    if (params) {
      if (params.start_date) cleanParams.start_date = params.start_date;
      if (params.end_date) cleanParams.end_date = params.end_date;
      if (params.method) cleanParams.method = params.method;
    }
    const { data } = await client.get<PerformanceAnalyticsResponse>('/analytics/performance', {
      params: cleanParams,
    });
    return data;
  },

  // Reports
  getReportSummary: async (params?: { collection_id?: number; status?: string; method?: string }): Promise<ReportSummary> => {
    const { data } = await client.get<ReportSummary>('/reports/summary', { params });
    return data;
  },
  getReportCsvUrl: (params?: { collection_id?: number; status?: string; method?: string }): string => {
    const cleanParams: Record<string, string> = {};
    if (params) {
      if (params.collection_id) cleanParams.collection_id = String(params.collection_id);
      if (params.status) cleanParams.status = params.status;
      if (params.method) cleanParams.method = params.method;
    }
    const query = new URLSearchParams(cleanParams).toString();
    return `/api/v1/reports/export/csv${query ? '?' + query : ''}`;
  },
  getReportPdfUrl: (params?: { collection_id?: number; status?: string; method?: string }): string => {
    const cleanParams: Record<string, string> = {};
    if (params) {
      if (params.collection_id) cleanParams.collection_id = String(params.collection_id);
      if (params.status) cleanParams.status = params.status;
      if (params.method) cleanParams.method = params.method;
    }
    const query = new URLSearchParams(cleanParams).toString();
    return `/api/v1/reports/export/pdf${query ? '?' + query : ''}`;
  },

  // Settings
  getSettings: async (): Promise<Record<string, any>> => {
    const { data } = await client.get('/settings');
    return data;
  },
  updateSettings: async (settings: Record<string, any>): Promise<Record<string, any>> => {
    const { data } = await client.post('/settings', settings);
    return data;
  },
};
