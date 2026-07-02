import { api } from './api';

export const watchersService = {
  async status(documentId: string): Promise<{ watching: boolean; watcher_count: number }> {
    return api.get<{ watching: boolean; watcher_count: number }>(`/documents/${documentId}/watch`);
  },

  async toggle(documentId: string): Promise<{ watching: boolean }> {
    return api.post<{ watching: boolean }>(`/documents/${documentId}/watch`, {});
  },
};
