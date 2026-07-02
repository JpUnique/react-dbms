import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { auditService } from '@/services';
import type { BackendAuditLog, AuditFilters } from '@/services';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield, Loader2, AlertCircle, RefreshCw, ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/services/api';

const ACTIONS = ['create', 'update', 'delete', 'login', 'logout', 'download', 'restore', 'share', 'upload'];
const RESOURCE_TYPES = ['document', 'folder', 'tag', 'user', 'share', 'version', 'auth'];

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  login: 'bg-purple-100 text-purple-800',
  logout: 'bg-gray-100 text-gray-800',
  download: 'bg-cyan-100 text-cyan-800',
  restore: 'bg-amber-100 text-amber-800',
  share: 'bg-indigo-100 text-indigo-800',
  upload: 'bg-teal-100 text-teal-800',
};

const PAGE_SIZE = 50;

const AuditLog: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<BackendAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');

  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');

  const [isClearing, setIsClearing] = useState(false);

  const buildFilters = useCallback((off: number): AuditFilters => {
    const f: AuditFilters = { limit: PAGE_SIZE, offset: off };
    if (filterAction) f.action = filterAction;
    if (filterResource) f.resource_type = filterResource;
    return f;
  }, [filterAction, filterResource]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setOffset(0);
    try {
      const result = await auditService.list(buildFilters(0));
      setLogs(result);
      setHasMore(result.length === PAGE_SIZE);
    } catch {
      setError('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [buildFilters]);

  useEffect(() => {
    // TEMP-NO-ROLES: admin-only redirect disabled for testing — restore
    // `if (currentUser?.role !== 'admin') { navigate('/'); return; }` once
    // role-based access is reintroduced.
    load();
  }, [currentUser, navigate, load]);

  const loadMore = async () => {
    const newOffset = offset + PAGE_SIZE;
    setIsLoadingMore(true);
    try {
      const result = await auditService.list(buildFilters(newOffset));
      setLogs(prev => [...prev, ...result]);
      setOffset(newOffset);
      setHasMore(result.length === PAGE_SIZE);
    } catch {
      globalThis.alert('Failed to load more logs');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleClear = async () => {
    if (!globalThis.confirm('Delete all audit logs older than 90 days? This cannot be undone.')) return;
    const before = new Date(Date.now() - 90 * 86400000).toISOString();
    setIsClearing(true);
    try {
      await api.delete(`/audit/?before=${encodeURIComponent(before)}`);
      await load();
    } catch {
      globalThis.alert('Failed to clear logs');
    } finally {
      setIsClearing(false);
    }
  };

  const actionBadge = (action: string) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[action] ?? 'bg-gray-100 text-gray-700'}`}>
      {action}
    </span>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Audit Log
            </h1>
            <p className="text-muted-foreground mt-1">System-wide activity trail</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="destructive" size="sm" onClick={handleClear} disabled={isClearing}>
              {isClearing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Clear Old Logs (90d+)
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3 flex-wrap items-center">
              <div className="flex-1 min-w-[160px]">
                <Select value={filterAction || '__all__'} onValueChange={v => setFilterAction(v === '__all__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All actions</SelectItem>
                    {ACTIONS.map(a => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[160px]">
                <Select value={filterResource || '__all__'} onValueChange={v => setFilterResource(v === '__all__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All resource types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All resource types</SelectItem>
                    {RESOURCE_TYPES.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={load} disabled={isLoading}>Apply Filters</Button>
            </div>
          </CardContent>
        </Card>

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

        {!isLoading && (
          <Card>
            <CardHeader>
              <CardTitle>Log Entries ({logs.length}{hasMore ? '+' : ''})</CardTitle>
              <CardDescription>Most recent events first</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {logs.length === 0 && (
                <div className="py-14 text-center text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>No audit logs found</p>
                  {(filterAction || filterResource) && (
                    <p className="text-sm mt-1">Try clearing the filters</p>
                  )}
                </div>
              )}
              {logs.length > 0 && (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[170px]">Time</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Resource</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Resource ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {logs.map(log => (
                          <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                              {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                            </td>
                            <td className="px-4 py-3">
                              {log.user_name
                                ? <span className="font-medium">{log.user_name}</span>
                                : <span className="text-muted-foreground italic">system</span>}
                              {log.user_email && (
                                <span className="block text-xs text-muted-foreground">{log.user_email}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">{actionBadge(log.action)}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="capitalize">{log.resource_type}</Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs font-mono truncate max-w-[160px]">
                              {log.resource_id ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {hasMore && (
                    <div className="flex justify-center py-4 border-t">
                      <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
                        {isLoadingMore
                          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading…</>
                          : <><ChevronDown className="h-4 w-4 mr-2" />Load more</>}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default AuditLog;
