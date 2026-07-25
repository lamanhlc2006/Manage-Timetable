import api from './api';

export interface GoogleSyncStatus {
  connected: boolean;
  syncEnabled: boolean;
  lastSyncAt: string | null;
}

export const getGoogleAuthUrl = async (): Promise<string> => {
  const response = await api.get<{ url: string }>('/auth/google/url');
  return response.data.url;
};

export const getGoogleSyncStatus = async (): Promise<GoogleSyncStatus> => {
  const response = await api.get<GoogleSyncStatus>('/auth/google/status');
  return response.data;
};

export const toggleGoogleSync = async (enabled: boolean): Promise<{ message: string; syncEnabled: boolean }> => {
  const response = await api.post('/auth/google/toggle-sync', { enabled });
  return response.data;
};

export const disconnectGoogle = async (): Promise<{ message: string }> => {
  const response = await api.post('/auth/google/disconnect');
  return response.data;
};

export const syncGoogleNow = async (): Promise<{ message: string; pushedCount: number; pulledCount: number }> => {
  const response = await api.post('/auth/google/sync-now');
  return response.data;
};
