import { api } from './api';
import type { BackendDocument } from './documents.service';

export const departmentsService = {
  async listDocuments(department: string, page = 1, limit = 20): Promise<{ documents: BackendDocument[]; total: number }> {
    const query = `?department=${encodeURIComponent(department)}&page=${page}&limit=${limit}`;
    const data = await api.get<{ documents: BackendDocument[]; meta: { total: number } }>(`/documents/by-department${query}`);
    return { documents: data.documents ?? [], total: data.meta?.total ?? 0 };
  },

  async counts(): Promise<Record<string, number>> {
    const data = await api.get<{ counts: Record<string, number> }>('/documents/department-counts');
    return data.counts ?? {};
  },
};
