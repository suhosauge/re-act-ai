const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}

// ─── Training Jobs ───
export const trainingJobsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<{ jobs: any[]; total: number }>(`/api/training-jobs${qs}`);
  },
  get: (id: string) => apiFetch<any>(`/api/training-jobs/${id}`),
  create: (data: any) => apiFetch<any>('/api/training-jobs', {
    method: 'POST', body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiFetch<any>(`/api/training-jobs/${id}`, {
    method: 'PUT', body: JSON.stringify(data),
  }),
  delete: (id: string) => apiFetch(`/api/training-jobs/${id}`, { method: 'DELETE' }),
  start: (id: string) => apiFetch<any>(`/api/training-jobs/${id}/start`, { method: 'POST' }),
  pause: (id: string) => apiFetch<any>(`/api/training-jobs/${id}/pause`, { method: 'POST' }),
  resume: (id: string) => apiFetch<any>(`/api/training-jobs/${id}/resume`, { method: 'POST' }),
  stop: (id: string) => apiFetch<any>(`/api/training-jobs/${id}/stop`, { method: 'POST' }),
  metrics: (id: string) => apiFetch<any[]>(`/api/training-jobs/${id}/metrics`),
};

// ─── Models ───
export const modelsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<{ models: any[]; total: number }>(`/api/models${qs}`);
  },
  get: (id: string) => apiFetch<any>(`/api/models/${id}`),
  create: (data: any) => apiFetch<any>('/api/models', {
    method: 'POST', body: JSON.stringify(data),
  }),
  versions: (id: string) => apiFetch<any[]>(`/api/models/${id}/versions`),
  deploy: (id: string, versionId: string) => apiFetch(`/api/models/${id}/deploy`, {
    method: 'POST', body: JSON.stringify({ version_id: versionId }),
  }),
  archive: (id: string) => apiFetch(`/api/models/${id}/archive`, { method: 'POST' }),
};

// ─── Datasets ───
export const datasetsApi = {
  list: () => apiFetch<any[]>('/api/datasets'),
  create: (data: any) => apiFetch<any>('/api/datasets', {
    method: 'POST', body: JSON.stringify(data),
  }),
};

// ─── System ───
export const systemApi = {
  health: () => apiFetch<any>('/api/health'),
  status: () => apiFetch<any>('/api/system/status'),
};

// ─── Config Templates ───
export const configsApi = {
  templates: () => apiFetch<any[]>('/api/datasets/configs/templates'),
};
