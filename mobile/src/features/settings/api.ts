import { loadSettings, saveSettings } from '@/lib/domain';
import { AppSettings, UpdateAppSettings } from './types';

export function fetchSettings(): Promise<AppSettings> {
  return loadSettings();
}

export function updateSettings(payload: UpdateAppSettings): Promise<AppSettings> {
  return saveSettings(payload);
}
