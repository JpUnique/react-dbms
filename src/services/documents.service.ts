import { api } from './api';

export interface BackendDocument {
  id: string;
  title: string;
  description?: string | null;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  folder_id?: string | null;
  folder_name?: string | null;
  owner_id: string;
  owner_name?: string | null;
  department?: string | null;
  status: 'draft' | 'published' | 'archived' | 'pending_review';
  is_starred: boolean;
  version: number;
  last_accessed?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentFilters {
  folder_id?: string;
  department?: string;
  status?: string;
  starred?: boolean;
  owner_id?: string;
  search?: string;
  limit?: number;
  page?: number;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`).join('&');
}

export const documentsService = {
  async list(filters?: DocumentFilters): Promise<BackendDocument[]> {
    const query: Record<string, string | undefined> = {
      folder_id: filters?.folder_id,
      department: filters?.department,
      status: filters?.status,
      owner_id: filters?.owner_id,
      search: filters?.search,
      starred: filters?.starred ? 'true' : undefined,
      limit: filters?.limit !== undefined ? String(filters.limit) : undefined,
      page: filters?.page !== undefined ? String(filters.page) : undefined,
    };
    const data = await api.get<{ documents: BackendDocument[] }>(`/documents${buildQuery(query)}`);
    return data.documents ?? [];
  },

  async get(id: string): Promise<BackendDocument> {
    const data = await api.get<{ document: BackendDocument }>(`/documents/${id}`);
    return data.document;
  },

  async upload(file: File, meta: {
    title?: string;
    description?: string;
    folder_id?: string;
    department?: string;
    status?: string;
  }): Promise<BackendDocument> {
    const formData = new FormData();
    formData.append('file', file);
    if (meta.title) formData.append('title', meta.title);
    if (meta.description) formData.append('description', meta.description);
    if (meta.folder_id) formData.append('folder_id', meta.folder_id);
    if (meta.department) formData.append('department', meta.department);
    if (meta.status) formData.append('status', meta.status);

    const data = await api.upload<{ document: BackendDocument }>('/documents', formData);
    return data.document;
  },

  async update(id: string, payload: Partial<BackendDocument>): Promise<BackendDocument> {
    const data = await api.patch<{ document: BackendDocument }>(`/documents/${id}`, payload);
    return data.document;
  },

  async moveToFolder(id: string, folderId: string | null): Promise<BackendDocument> {
    const data = await api.patch<{ document: BackendDocument }>(`/documents/${id}`, { folder_id: folderId });
    return data.document;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/documents/${id}`);
  },

  async toggleStar(id: string): Promise<boolean> {
    const data = await api.post<{ is_starred: boolean }>(`/documents/${id}/star`);
    return data.is_starred;
  },

  async getPresignedUrl(id: string): Promise<{ url: string; file_name: string }> {
    return api.get<{ url: string; file_name: string }>(`/documents/${id}/download`);
  },

  async download(id: string, fileName: string): Promise<void> {
    const { url, file_name } = await this.getPresignedUrl(id);
    const a = globalThis.document.createElement('a');
    a.href = url;
    a.download = file_name || fileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  },
};