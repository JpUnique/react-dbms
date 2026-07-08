import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { reportsService } from '@/services';
import type { Report, ReportPeriod, ReportScope } from '@/services';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart3, Loader2, AlertCircle, RefreshCw, Users, Activity, Trophy, User as UserIcon, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { downloadReportPdf } from '@/lib/reportPdf';

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
];

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; sub?: string }> = ({
  icon: Icon, label, value, sub,
}) => (
  <Card className="shadow-sm">
    <CardContent className="pt-5 pb-5 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
      </div>
    </CardContent>
  </Card>
);

const Reports: React.FC = () => {
  const { currentUser } = useAuth();

  const [period, setPeriod] = useState<ReportPeriod>('today');
  const [scope, setScope] = useState<ReportScope>('own');
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (p: ReportPeriod, s: ReportScope) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await reportsService.get(p, s);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(period, scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handlePeriodChange = (p: ReportPeriod) => {
    setPeriod(p);
    load(p, scope);
  };

  const handleScopeChange = (s: ReportScope) => {
    setScope(s);
    load(period, s);
  };

  const isOwn = report?.scope === 'own';

  const mostActiveUser = report?.by_user[0];
  const mostCommonAction = useMemo(() => {
    if (!report) return null;
    const entries = Object.entries(report.by_action_totals);
    if (entries.length === 0) return null;
    return entries.reduce((max, cur) => (cur[1] > max[1] ? cur : max));
  }, [report]);

  const periodLabel = PERIODS.find(p => p.value === period)?.label ?? period;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              {isOwn ? 'Your own activity' : 'Activity across every user'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg border p-0.5 bg-muted/40">
              <button
                type="button"
                onClick={() => handleScopeChange('own')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  scope === 'own' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <UserIcon className="h-3.5 w-3.5" />
                My Report
              </button>
              {currentUser?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => handleScopeChange('all')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    scope === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  All Users
                </button>
              )}
            </div>
            <div className="flex rounded-lg border p-0.5 bg-muted/40">
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handlePeriodChange(p.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    period === p.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => load(period, scope)} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => report && downloadReportPdf(report, currentUser?.name)}
              disabled={isLoading || !report}
            >
              <FileDown className="h-4 w-4 mr-1" />
              Download PDF
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && report && (
          <>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isOwn ? '' : 'lg:grid-cols-4'}`}>
              <StatCard icon={Activity} label="Total actions" value={report.total_actions} />
              {!isOwn && <StatCard icon={Users} label="Active users" value={report.active_users} />}
              {!isOwn && (
                <StatCard
                  icon={Trophy}
                  label="Most active user"
                  value={mostActiveUser?.user_name ?? '—'}
                  sub={mostActiveUser ? `${mostActiveUser.total_actions} actions` : undefined}
                />
              )}
              <StatCard
                icon={BarChart3}
                label="Most common action"
                value={mostCommonAction?.[0] ?? '—'}
                sub={mostCommonAction ? `${mostCommonAction[1]} times` : undefined}
              />
            </div>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Activity over time</CardTitle>
                <CardDescription>{periodLabel}</CardDescription>
              </CardHeader>
              <CardContent className="px-2 pb-3">
                {report.total_actions > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={report.timeline} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                      <defs>
                        <linearGradient id="reportsArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="rgba(148,163,184,0.15)" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" name="Actions" stroke="#06b6d4" strokeWidth={2} fill="url(#reportsArea)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="py-16 text-center text-muted-foreground">
                    <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p>No activity recorded for this period</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {isOwn ? (
              <Card>
                <CardHeader>
                  <CardTitle>By action</CardTitle>
                  <CardDescription>What you did during this period</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(report.by_action_totals).length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground">
                      <Activity className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p>No activity recorded in this period</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(report.by_action_totals)
                        .sort((a, b) => b[1] - a[1])
                        .map(([action, count]) => (
                          <Badge key={action} variant="outline" className="text-xs py-1 px-2.5">
                            {action} · {count}
                          </Badge>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>By user</CardTitle>
                  <CardDescription>Everyone who used the system in this period, most active first</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {report.by_user.length === 0 ? (
                    <div className="py-14 text-center text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
                      <p>No user activity in this period</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/40">
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Top actions</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">First</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {report.by_user.map(u => (
                            <tr key={u.user_id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3">
                                <span className="font-medium">{u.user_name}</span>
                                <span className="block text-xs text-muted-foreground">{u.user_email}</span>
                              </td>
                              <td className="px-4 py-3 font-semibold">{u.total_actions}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(u.by_action)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 3)
                                    .map(([action, count]) => (
                                      <Badge key={action} variant="outline" className="text-[10px]">
                                        {action} · {count}
                                      </Badge>
                                    ))}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                {u.first_action_at ? format(new Date(u.first_action_at), 'MMM d, HH:mm') : '—'}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                {u.last_action_at ? format(new Date(u.last_action_at), 'MMM d, HH:mm') : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Reports;
