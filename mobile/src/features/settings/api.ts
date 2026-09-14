import { apiRequest } from '@/lib/api';
import { AppSettings, UpdateAppSettings } from './types';

export function fetchSettings(): Promise<AppSettings> {
  return apiRequest<AppSettings>('/settings');
}

export function updateSettings(payload: UpdateAppSettings): Promise<AppSettings> {
  return apiRequest<AppSettings>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
