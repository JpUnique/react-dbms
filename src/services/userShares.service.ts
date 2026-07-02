import { api } from './api';
import type { BackendDocument } from './documents.service';

export type SharePermission = 'view' | 'download';

export interface ShareRecipient {
  user_id: string;
  name: string;
  email: string;
  permission: SharePermission;
  shared_at: string;
}

export interface SharedDocument extends BackendDocument {
  shared_by_name: string;
  permission: SharePermission;
  shared_at: string;
}

export const userSharesService = {
  async grant(documentId: string, userId: string, permission: SharePermission): Promise<void> {
    await api.post(`/documents/${documentId}/user-shares`, { user_id: userId, permission });
  },

  async listRecipients(documentId: string): Promise<ShareRecipient[]> {
    const data = await api.get<{ recipients: ShareRecipient[] | null }>(`/documents/${documentId}/user-shares`);
    return data.recipients ?? [];
  },

  async revoke(documentId: string, userId: string): Promise<void> {
    await api.delete(`/documents/${documentId}/user-shares/${userId}`);
  },

  async sharedWithMe(): Promise<SharedDocument[]> {
    const data = await api.get<{ documents: SharedDocument[] | null }>('/shared-with-me');
    return data.documents ?? [];
  },
};
