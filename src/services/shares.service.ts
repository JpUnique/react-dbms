import { api, API_BASE_URL } from './api';
import type { BackendDocument } from './documents.service';

export interface BackendShare {
  id: string;
  document_id: string;
  share_token: string;
  shared_by?: string | null;
  permission: 'view' | 'edit' | 'download';
  password_hash?: string | null;
  expires_at?: string | null;
  access_count: number;
  created_at: string;
}

export const sharesService = {
  async create(payload: {
    document_id: string;
    permission?: 'view' | 'edit' | 'download';
    password?: string;
    expires_at?: string | null;
  }): Promise<BackendShare> {
    const data = await api.post<{ share: BackendShare }>('/shares', payload);
    return data.share;
  },

  async list(documentId?: string): Promise<BackendShare[]> {
    const query = documentId ? `?document_id=${encodeURIComponent(documentId)}` : '';
    const data = await api.get<{ shares: BackendShare[] | null }>(`/shares${query}`);
    return data.shares ?? [];
  },

  async revoke(id: string): Promise<void> {
    await api.delete(`/shares/${id}`);
  },

  async publicAccess(token: string): Promise<{ document: BackendDocument; permission: string }> {
    return api.get<{ document: BackendDocument; permission: string }>(`/shares/public/${token}`);
  },

  async publicDownload(token: string, password?: string): Promise<{ url: string; file_name: string }> {
    return api.post<{ url: string; file_name: string }>(`/shares/public/${token}/download`, { password: password || '' });
  },

  buildShareUrl(token: string): string {
    return `${globalThis.location.origin}/share/${token}`;
  },

  getPublicApiUrl(token: string): string {
    return `${API_BASE_URL}/shares/public/${token}`;
  },
};