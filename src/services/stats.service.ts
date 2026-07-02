import { api } from './api';

export interface DashboardStats {
  users: { total: number; active: number };
  documents: {
    total: number;
    starred: number;
    published: number;
    draft: number;
    archived: number;
  };
  folders: { total: number };
  storage: { total_bytes: number; total_mb: number };
  recent_documents: Array<{
    id: string;
    title: string;
    file_type: string;
    updated_at: string;
    owner_name: string | null;
  }>;
  by_department: Array<{ department: string; count: number }>;
  by_status: Array<{ status: string; count: number }>;
  by_type: Array<{ category: string; count: number }>;
}

export interface ActivityPoint {
  date: string;
  count: number;
  document_actions: number;
  user_actions: number;
}

const EMPTY_STATS: DashboardStats = {
  users: { total: 0, active: 0 },
  documents: { total: 0, starred: 0, published: 0, draft: 0, archived: 0 },
  folders: { total: 0 },
  storage: { total_bytes: 0, total_mb: 0 },
  recent_documents: [],
  by_department: [],
  by_status: [],
  by_type: [],
};

export const statsService = {
  async dashboard(): Promise<DashboardStats> {
    const data = await api.get<DashboardStats>('/stats/dashboard');
    // Guard every array field against null (Go nil slice → JSON null).
    return {
      ...EMPTY_STATS,
      ...data,
      recent_documents: data.recent_documents ?? [],
      by_department:    data.by_department    ?? [],
      by_status:        data.by_status        ?? [],
      by_type:          data.by_type          ?? [],
    };
  },
  async activity(period: 'today' | 'day' | 'week' | 'month' | 'halfyear' | 'year' = 'week'): Promise<ActivityPoint[]> {
    const data = await api.get<{ activity: ActivityPoint[] }>(`/stats/activity?period=${period}`);
    return data.activity ?? [];
  },
};