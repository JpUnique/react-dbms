import { api } from './api';

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  resource_type: string;
  resource_id?: string;
  is_read: boolean;
  created_at: string;
}

export const notificationsService = {
  async list(): Promise<{ notifications: AppNotification[]; unread_count: number }> {
    return api.get<{ notifications: AppNotification[]; unread_count: number }>('/notifications');
  },

  async markRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`, {});
  },

  async markAllRead(): Promise<void> {
    await api.patch('/notifications/read-all', {});
  },
};
