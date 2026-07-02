import { api } from './api';

export type ReportPeriod = 'today' | 'yesterday' | 'week' | 'month';
export type ReportScope = 'own' | 'all';

export interface ReportUser {
  user_id: string;
  user_name: string;
  user_email: string;
  total_actions: number;
  by_action: Record<string, number>;
  by_resource_type: Record<string, number>;
  first_action_at: string;
  last_action_at: string;
}

export interface ReportTimelinePoint {
  label: string;
  count: number;
}

export interface Report {
  period: ReportPeriod;
  scope: ReportScope;
  total_actions: number;
  active_users: number;
  by_user: ReportUser[];
  by_action_totals: Record<string, number>;
  timeline: ReportTimelinePoint[];
}

const EMPTY_REPORT: Omit<Report, 'period' | 'scope'> = {
  total_actions: 0,
  active_users: 0,
  by_user: [],
  by_action_totals: {},
  timeline: [],
};

export const reportsService = {
  // Defaults to your own activity ("own"); pass scope: "all" for the
  // system-wide, all-users view.
  async get(period: ReportPeriod = 'today', scope: ReportScope = 'own'): Promise<Report> {
    const data = await api.get<Report>(`/reports?period=${encodeURIComponent(period)}&scope=${encodeURIComponent(scope)}`);
    return {
      ...EMPTY_REPORT,
      ...data,
      by_user: data.by_user ?? [],
      by_action_totals: data.by_action_totals ?? {},
      timeline: data.timeline ?? [],
    };
  },
};
