import { apiRequest } from '@/lib/api';
import { SearchResponse } from './types';

export function fetchGlobalSearch(
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<SearchResponse> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  }
  const suffix = query.toString();
  return apiRequest<SearchResponse>(`/search${suffix ? `?${suffix}` : ''}`);
}
