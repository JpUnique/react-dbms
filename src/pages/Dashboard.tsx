import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { statsService, documentsService, type DashboardStats, type ActivityPoint, type BackendDocument } from '@/services';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FilePlus, FileText, Files, FolderOpen, UsersRound, Database,
  TrendingUp, TrendingDown, Minus, Star, Clock, ArrowRight, Loader2,
  BarChart3, WifiOff, FileImage, FileCode, FileVideoCamera, FileMusic,
  ChevronDown, Sun, CalendarDays, CalendarRange, CalendarClock, Archive,
  Activity, CheckCircle2, FileStack, FolderPlus, Share2,
  Bookmark, Zap,
} from 'lucide-react';
import {
  AreaChart, Area, ComposedChart, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts';

// ── Constants ──────────────────────────────────────────────────────────────────

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

type FileIconEntry = { icon: React.ElementType; bg: string; color: string };
const EXT_MAP: Record<string, FileIconEntry> = {
  pdf:  { icon: FileText,       bg: 'bg-red-100 dark:bg-red-900/30',      color: 'text-red-600 dark:text-red-400' },
  doc:  { icon: FileText,       bg: 'bg-blue-100 dark:bg-blue-900/30',    color: 'text-blue-600 dark:text-blue-400' },
  docx: { icon: FileText,       bg: 'bg-blue-100 dark:bg-blue-900/30',    color: 'text-blue-600 dark:text-blue-400' },
  xls:  { icon: Database,       bg: 'bg-green-100 dark:bg-green-900/30',  color: 'text-green-600 dark:text-green-400' },
  xlsx: { icon: Database,       bg: 'bg-green-100 dark:bg-green-900/30',  color: 'text-green-600 dark:text-green-400' },
  csv:  { icon: Database,       bg: 'bg-green-100 dark:bg-green-900/30',  color: 'text-green-600 dark:text-green-400' },
  ppt:  { icon: Files,          bg: 'bg-orange-100 dark:bg-orange-900/30',color: 'text-orange-600 dark:text-orange-400' },
  pptx: { icon: Files,          bg: 'bg-orange-100 dark:bg-orange-900/30',color: 'text-orange-600 dark:text-orange-400' },
  png:  { icon: FileImage,      bg: 'bg-purple-100 dark:bg-purple-900/30',color: 'text-purple-600 dark:text-purple-400' },
  jpg:  { icon: FileImage,      bg: 'bg-purple-100 dark:bg-purple-900/30',color: 'text-purple-600 dark:text-purple-400' },
  jpeg: { icon: FileImage,      bg: 'bg-purple-100 dark:bg-purple-900/30',color: 'text-purple-600 dark:text-purple-400' },
  gif:  { icon: FileImage,      bg: 'bg-purple-100 dark:bg-purple-900/30',color: 'text-purple-600 dark:text-purple-400' },
  svg:  { icon: FileImage,      bg: 'bg-purple-100 dark:bg-purple-900/30',color: 'text-purple-600 dark:text-purple-400' },
  mp4:  { icon: FileVideoCamera,bg: 'bg-pink-100 dark:bg-pink-900/30',    color: 'text-pink-600 dark:text-pink-400' },
  mov:  { icon: FileVideoCamera,bg: 'bg-pink-100 dark:bg-pink-900/30',    color: 'text-pink-600 dark:text-pink-400' },
  mp3:  { icon: FileMusic,      bg: 'bg-indigo-100 dark:bg-indigo-900/30',color: 'text-indigo-600 dark:text-indigo-400' },
  js:   { icon: FileCode,       bg: 'bg-yellow-100 dark:bg-yellow-900/30',color: 'text-yellow-600 dark:text-yellow-400' },
  ts:   { icon: FileCode,       bg: 'bg-blue-100 dark:bg-blue-900/30',    color: 'text-blue-600 dark:text-blue-400' },
  py:   { icon: FileCode,       bg: 'bg-teal-100 dark:bg-teal-900/30',    color: 'text-teal-600 dark:text-teal-400' },
};
const FALLBACK: FileIconEntry = { icon: FileText, bg: 'bg-slate-100 dark:bg-slate-800', color: 'text-slate-500' };

const FileIcon = ({ name, size = 18 }: { name: string; size?: number }) => {
  const ext = (name.split('.').pop() ?? '').toLowerCase();
  const { icon: Icon, bg, color } = EXT_MAP[ext] ?? FALLBACK;
  return (
    <div className={`h-9 w-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
      <Icon className={color} size={size} />
    </div>
  );
};

const formatStorage = (mb: number) =>
  mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;

const formatRelative = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

// ── StatCard ───────────────────────────────────────────────────────────────────

type TrendDir = 'up' | 'down' | 'flat';

interface StatCardProps {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; gradient: string; iconColor: string;
  trendDir?: TrendDir; trendLabel?: string;
  sparkline?: number[];
  sparkColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label, value, sub, icon: Icon, gradient, iconColor,
  trendDir, trendLabel, sparkline, sparkColor = '#3b82f6',
}) => {
  const TrendIcon = trendDir === 'up' ? TrendingUp : trendDir === 'down' ? TrendingDown : Minus;
  const trendCls  = trendDir === 'up'
    ? 'text-emerald-500'
    : trendDir === 'down' ? 'text-red-500' : 'text-muted-foreground';
  const sparkData = (sparkline ?? []).map(v => ({ v }));

  return (
    <Card className="shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border-border/60 overflow-hidden">
      <CardContent className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
          <div className={`${gradient} rounded-2xl p-3.5 shrink-0 shadow-inner`}>
            <Icon className={`h-6 w-6 ${iconColor}`} strokeWidth={1.75} />
          </div>
        </div>

        {/* Trend row + sparkline */}
        <div className="flex items-end justify-between mt-3 gap-2">
          {trendDir && trendLabel ? (
            <div className={`flex items-center gap-1 ${trendCls}`}>
              <TrendIcon className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">{trendLabel}</span>
            </div>
          ) : <span />}

          {sparkData.length > 1 && (
            <div className="h-10 w-28 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                  <defs>
                    <filter id={`glow-${label}`}>
                      <feGaussianBlur stdDeviation="1.5" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <Line
                    type="monotone" dataKey="v"
                    stroke={sparkColor} strokeWidth={2}
                    dot={false} activeDot={false}
                    filter={`url(#glow-${label})`}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ── Empty state helper ─────────────────────────────────────────────────────────

const EmptyChart = ({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) => (
  <div className="flex flex-col items-center justify-center h-[220px] text-center gap-2">
    <Icon className="h-10 w-10 text-muted-foreground/30" />
    <p className="text-sm font-medium text-muted-foreground">{title}</p>
    <p className="text-xs text-muted-foreground/70">{sub}</p>
  </div>
);

// ── Trading-platform tooltip ───────────────────────────────────────────────────

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
}

const TradingTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(10,17,32,0.92)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      padding: '10px 14px',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      minWidth: '140px',
    }}>
      <p style={{ color: '#64748b', fontSize: '10px', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>{label}</p>
      {payload.map(entry => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: entry.color, boxShadow: `0 0 6px ${entry.color}` }} />
          <span style={{ color: '#94a3b8', fontSize: '11px', flex: 1 }}>{entry.dataKey}</span>
          <span style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

const BarTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(10,17,32,0.92)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      padding: '10px 14px',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      minWidth: '140px',
    }}>
      <p style={{ color: '#64748b', fontSize: '10px', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>{label}</p>
      {payload.filter(e => e.value > 0).map(entry => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: entry.color }} />
          <span style={{ color: '#94a3b8', fontSize: '11px', flex: 1 }}>{entry.dataKey}</span>
          <span style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// ── Period selector ────────────────────────────────────────────────────────────

type Period = 'today' | 'day' | 'week' | 'month' | 'halfyear' | 'year';

const PERIOD_OPTIONS: { value: Period; label: string; icon: React.ElementType }[] = [
  { value: 'today',    label: 'Today',         icon: Sun           },
  { value: 'day',      label: 'Day ago',       icon: Clock         },
  { value: 'week',     label: 'Week ago',      icon: CalendarDays  },
  { value: 'month',    label: 'Month ago',     icon: CalendarRange },
  { value: 'halfyear', label: 'Half year ago', icon: CalendarClock },
  { value: 'year',     label: 'Year ago',      icon: Archive       },
];

const PERIOD_LABELS = Object.fromEntries(
  PERIOD_OPTIONS.map(o => [o.value, o.label])
) as Record<Period, string>;

function formatActivityDate(raw: string, period: Period): string {
  if (period === 'today' || period === 'day') return raw;
  if (period === 'halfyear' || period === 'year') {
    const [, m] = raw.split('-');
    return new Date(2000, parseInt(m, 10) - 1).toLocaleString('en-US', { month: 'short' });
  }
  return new Date(raw + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
}

// ── Period dropdown ────────────────────────────────────────────────────────────
// Must live OUTSIDE Dashboard so React doesn't recreate the component type on
// every render (which would unmount the Radix DropdownMenu and kill open state).

interface PeriodDropdownProps {
  period: Period;
  onChange: (p: Period) => void;
  loading?: boolean;
}

const PeriodDropdown: React.FC<PeriodDropdownProps> = ({ period, onChange, loading }) => {
  const opt = PERIOD_OPTIONS.find(o => o.value === period)!;
  return (
    <div className="flex items-center gap-1.5">
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 font-medium">
            <opt.icon className="h-3.5 w-3.5 text-muted-foreground" />
            {PERIOD_LABELS[period]}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {PERIOD_OPTIONS.map(({ value, label, icon: Icon }) => (
            <DropdownMenuItem
              key={value}
              onClick={() => onChange(value)}
              className={`gap-2.5 ${period === value ? 'bg-accent font-medium' : ''}`}
            >
              <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// ── Default stats ──────────────────────────────────────────────────────────────

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

// ══════════════════════════════════════════════════════════════════════════════
// Dashboard
// ══════════════════════════════════════════════════════════════════════════════

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [dashStats, setDashStats]           = useState<DashboardStats>(EMPTY_STATS);
  const [activityPoints, setActivityPoints] = useState<ActivityPoint[]>([]);
  const [starredDocs, setStarredDocs]       = useState<BackendDocument[]>([]);
  const [recentDocs, setRecentDocs]         = useState<BackendDocument[]>([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [isOffline, setIsOffline]           = useState(false);
  const [period, setPeriod]                 = useState<Period>('week');
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    let remaining = 4;
    const done = () => { if (--remaining <= 0) setIsLoading(false); };

    statsService.dashboard()
      .then(stats => { setDashStats(stats); setIsOffline(false); })
      .catch(() => setIsOffline(true))
      .finally(done);

    statsService.activity(period)
      .then(setActivityPoints)
      .catch(() => {})
      .finally(done);

    documentsService.list({ starred: true })
      .then(docs => setStarredDocs(docs.slice(0, 8)))
      .catch(() => {})
      .finally(done);

    documentsService.list({ limit: 8 } as Parameters<typeof documentsService.list>[0])
      .then(docs => setRecentDocs(docs))
      .catch(() => {})
      .finally(done);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadActivity = useCallback((p: Period) => {
    setActivityLoading(true);
    statsService.activity(p)
      .then(setActivityPoints)
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  }, []);

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p);
    loadActivity(p);
  }, [loadActivity]);

  const chartData = activityPoints.map(p => ({
    date: formatActivityDate(p.date, period),
    Documents: p.document_actions,
    Users: p.user_actions,
    Total: p.count,
  }));
  const hasActivity = chartData.some(d => d.Total > 0);

  // ── Trend computation (compare first half of period vs second half) ────────
  const docSpark  = activityPoints.map(p => p.document_actions);
  const half      = Math.max(1, Math.floor(docSpark.length / 2));
  const prevSum   = docSpark.slice(0, half).reduce((s, v) => s + v, 0);
  const recentSum = docSpark.slice(half).reduce((s, v) => s + v, 0);
  const docTrendDir: TrendDir   = recentSum > prevSum ? 'up' : recentSum < prevSum ? 'down' : 'flat';
  const docTrendLabel = docTrendDir === 'up'
    ? `+${recentSum - prevSum} vs earlier`
    : docTrendDir === 'down'
    ? `-${prevSum - recentSum} vs earlier`
    : 'Stable';

  // Storage trend mirrors doc trend (uploads = storage used)
  const storageTrendDir   = docTrendDir;
  const storageTrendLabel = docTrendLabel;

  // Total activity sparkline for each stat card
  const totalSpark = activityPoints.map(p => p.count);

  const timeOfDay = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <MainLayout>
      <div className="space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {timeOfDay()}, {currentUser?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Here's what's happening in your workspace today.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" asChild size="sm">
              <Link to="/documents" className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" /> Browse
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/documents/new" className="flex items-center gap-1.5">
                <FilePlus className="h-4 w-4" /> Upload
              </Link>
            </Button>
          </div>
        </div>

        {/* ── Offline banner ──────────────────────────────────────────────────── */}
        {isOffline && !isLoading && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-sm">
            <WifiOff className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-amber-700 dark:text-amber-400">
              Could not reach the server — showing defaults. Check that the backend is running.
            </p>
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && (
          <>
            {/* ── Stat cards ──────────────────────────────────────────────────── */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total Documents" value={dashStats.documents.total}
                sub={`${dashStats.documents.published} published · ${dashStats.documents.draft} drafts`}
                icon={Files}
                gradient="bg-linear-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-800/20 ring-1 ring-blue-200/80 dark:ring-blue-700/40"
                iconColor="text-blue-600 dark:text-blue-400"
                trendDir={hasActivity ? docTrendDir : undefined}
                trendLabel={hasActivity ? docTrendLabel : undefined}
                sparkline={docSpark}
                sparkColor="#3b82f6"
              />
              <StatCard
                label="Folders" value={dashStats.folders.total}
                sub="Organized structure"
                icon={FolderOpen}
                gradient="bg-linear-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-800/20 ring-1 ring-amber-200/80 dark:ring-amber-700/40"
                iconColor="text-amber-600 dark:text-amber-400"
                trendDir={dashStats.folders.total > 0 ? 'up' : 'flat'}
                trendLabel={dashStats.folders.total > 0 ? `${dashStats.folders.total} active` : 'None yet'}
                sparkColor="#f59e0b"
              />
              <StatCard
                label="Storage Used" value={formatStorage(dashStats.storage.total_mb)}
                sub={`${dashStats.documents.starred} starred documents`}
                icon={Database}
                gradient="bg-linear-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-800/20 ring-1 ring-emerald-200/80 dark:ring-emerald-700/40"
                iconColor="text-emerald-600 dark:text-emerald-400"
                trendDir={hasActivity ? storageTrendDir : undefined}
                trendLabel={hasActivity ? storageTrendLabel : undefined}
                sparkline={totalSpark}
                sparkColor="#10b981"
              />
              <StatCard
                label="Team Members" value={dashStats.users.total}
                sub={`${dashStats.users.active} active`}
                icon={UsersRound}
                gradient="bg-linear-to-br from-violet-100 to-violet-50 dark:from-violet-900/40 dark:to-violet-800/20 ring-1 ring-violet-200/80 dark:ring-violet-700/40"
                iconColor="text-violet-600 dark:text-violet-400"
                trendDir={dashStats.users.active > 0 ? 'up' : 'flat'}
                trendLabel={`${dashStats.users.active} of ${dashStats.users.total} active`}
                sparkColor="#8b5cf6"
              />
            </div>

            {/* ── Quick Actions ────────────────────────────────────────────────── */}
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-3 pt-4 px-5">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      icon: FilePlus, label: 'Upload Document', desc: 'Add new file',
                      to: '/documents/new',
                      bg: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-200/60 dark:border-blue-700/40',
                      iconCls: 'text-blue-600 dark:text-blue-400',
                    },
                    {
                      icon: FolderPlus, label: 'New Folder', desc: 'Organise files',
                      to: '/folders/root',
                      bg: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-200/60 dark:border-amber-700/40',
                      iconCls: 'text-amber-600 dark:text-amber-400',
                    },
                    {
                      icon: Share2, label: 'Shared With Me', desc: 'View shared docs',
                      to: '/documents/shared',
                      bg: 'bg-teal-500/10 hover:bg-teal-500/20 border-teal-200/60 dark:border-teal-700/40',
                      iconCls: 'text-teal-600 dark:text-teal-400',
                    },
                    {
                      icon: Bookmark, label: 'Starred Files', desc: 'Your favourites',
                      to: '/starred',
                      bg: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-200/60 dark:border-violet-700/40',
                      iconCls: 'text-violet-600 dark:text-violet-400',
                    },
                  ].map(({ icon: Icon, label, desc, to, bg, iconCls }) => (
                    <Link
                      key={to} to={to}
                      className={`flex flex-col items-center gap-2.5 rounded-xl border p-4 text-center transition-all duration-150 ${bg}`}
                    >
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${bg.split(' ')[0]}`}>
                        <Icon className={`h-5 w-5 ${iconCls}`} strokeWidth={1.75} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight">{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── Main tabs ────────────────────────────────────────────────────── */}
            <Tabs defaultValue="activity">
              <TabsList className="h-9 gap-0.5">
                <TabsTrigger value="activity" className="gap-1.5 text-sm">
                  <BarChart3 className="h-3.5 w-3.5" /> Activity Overview
                </TabsTrigger>
                <TabsTrigger value="recent" className="gap-1.5 text-sm">
                  <Clock className="h-3.5 w-3.5" /> Recent Documents
                </TabsTrigger>
                <TabsTrigger value="starred" className="gap-1.5 text-sm">
                  <Star className="h-3.5 w-3.5" /> Starred Documents
                </TabsTrigger>
              </TabsList>

              {/* ══ Activity Overview ══════════════════════════════════════════ */}
              <TabsContent value="activity" className="mt-4">
                <div className="space-y-4">
                {/* Row 1 — charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                  {/* Activity Breakdown — stacked area + total line */}
                  <Card className="shadow-sm overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">Activity Breakdown</CardTitle>
                        {activityLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                      </div>
                    </CardHeader>
                    <CardContent className="px-2 pb-3">
                      {hasActivity ? (
                        <ResponsiveContainer width="100%" height={230}>
                          <ComposedChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                            <defs>
                              <linearGradient id="compBlue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.6} />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                              </linearGradient>
                              <linearGradient id="compGreen" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor="#10b981" stopOpacity={0.55} />
                                <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                              </linearGradient>
                              <filter id="compGlow">
                                <feGaussianBlur stdDeviation="2" result="blur" />
                                <feMerge>
                                  <feMergeNode in="blur" />
                                  <feMergeNode in="SourceGraphic" />
                                </feMerge>
                              </filter>
                              {/* Arrowhead marker for the total line */}
                              <marker id="arrowTotal" markerWidth="7" markerHeight="7"
                                refX="5" refY="3.5" orient="auto">
                                <polygon points="0 0, 7 3.5, 0 7" fill="#f59e0b" />
                              </marker>
                            </defs>
                            <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="rgba(148,163,184,0.07)" />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 10, fill: '#64748b' }}
                              axisLine={false} tickLine={false}
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: '#64748b' }}
                              axisLine={false} tickLine={false}
                              allowDecimals={false}
                            />
                            <Tooltip content={<BarTooltip />}
                              cursor={{ stroke: '#475569', strokeDasharray: '4 4', strokeWidth: 1 }} />
                            <Legend
                              wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: '#94a3b8' }}
                              iconType="circle" iconSize={7}
                            />
                            {/* Stacked filled areas */}
                            <Area type="monotone" dataKey="Documents" name="Documents"
                              stackId="1" stroke="#3b82f6" strokeWidth={1.5}
                              fill="url(#compBlue)" dot={false} activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 1.5 }}
                            />
                            <Area type="monotone" dataKey="Users" name="Users"
                              stackId="1" stroke="#10b981" strokeWidth={1.5}
                              fill="url(#compGreen)" dot={false} activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 1.5 }}
                            />
                            {/* Total trend line with arrowhead at last point */}
                            <Line type="monotone" dataKey="Total" name="Total"
                              stroke="#f59e0b" strokeWidth={2}
                              dot={(props: Record<string, unknown>) => {
                                const { cx, cy, index } = props as { cx: number; cy: number; index: number };
                                if (index !== chartData.length - 1) return <g key={index} />;
                                return (
                                  <g key={index}>
                                    <circle cx={cx} cy={cy} r={4} fill="#f59e0b" stroke="#fff" strokeWidth={2} />
                                    <polygon
                                      points={`${cx + 12},${cy} ${cx + 4},${cy - 5} ${cx + 4},${cy + 5}`}
                                      fill="#f59e0b"
                                    />
                                  </g>
                                );
                              }}
                              activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      ) : (
                        <EmptyChart icon={BarChart3} title="No activity data yet" sub="Upload and work with documents to see activity" />
                      )}
                    </CardContent>
                  </Card>

                  {/* Activity Trend — trading-platform style */}
                  <Card className="shadow-sm overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">Activity Trend</CardTitle>
                        <PeriodDropdown period={period} onChange={handlePeriodChange} loading={activityLoading} />
                      </div>
                    </CardHeader>
                    <CardContent className="px-2 pb-3">
                      {hasActivity ? (
                        <ResponsiveContainer width="100%" height={230}>
                          <AreaChart data={chartData} margin={{ top: 12, right: 8, bottom: 0, left: -18 }}>
                            <defs>
                              {/* Primary teal line gradient */}
                              <linearGradient id="trendTeal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor="#06b6d4" stopOpacity={0.45} />
                                <stop offset="50%"  stopColor="#06b6d4" stopOpacity={0.12} />
                                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0}    />
                              </linearGradient>
                              {/* Blue secondary */}
                              <linearGradient id="trendBlue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor="#818cf8" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#818cf8" stopOpacity={0}    />
                              </linearGradient>
                              {/* Glow filter for the line */}
                              <filter id="lineGlow">
                                <feGaussianBlur stdDeviation="2.5" result="blur" />
                                <feMerge>
                                  <feMergeNode in="blur" />
                                  <feMergeNode in="SourceGraphic" />
                                </feMerge>
                              </filter>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="2 6"
                              vertical={false}
                              stroke="rgba(148,163,184,0.07)"
                            />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 10, fill: '#64748b' }}
                              axisLine={false} tickLine={false}
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: '#64748b' }}
                              axisLine={false} tickLine={false}
                              allowDecimals={false}
                            />
                            <Tooltip
                              content={<TradingTooltip />}
                              cursor={{ stroke: '#475569', strokeDasharray: '4 4', strokeWidth: 1 }}
                            />
                            {/* Documents sub-line */}
                            <Area
                              type="monotone"
                              dataKey="Documents"
                              stroke="#818cf8"
                              strokeWidth={1.5}
                              strokeDasharray="4 3"
                              fill="url(#trendBlue)"
                              dot={false}
                              activeDot={{ r: 4, fill: '#818cf8', stroke: '#fff', strokeWidth: 1.5 }}
                            />
                            {/* Total activity — primary bright line with arrow tip */}
                            <Area
                              type="monotone"
                              dataKey="Total"
                              stroke="#06b6d4"
                              strokeWidth={2.5}
                              fill="url(#trendTeal)"
                              dot={(props: Record<string, unknown>) => {
                                const { cx, cy, index } = props as { cx: number; cy: number; index: number };
                                if (index !== chartData.length - 1) return <g key={index} />;
                                return (
                                  <g key={index} filter="url(#lineGlow)">
                                    <circle cx={cx} cy={cy} r={4.5} fill="#06b6d4" stroke="#fff" strokeWidth={2} />
                                    <polygon
                                      points={`${cx + 13},${cy} ${cx + 4},${cy - 6} ${cx + 4},${cy + 6}`}
                                      fill="#06b6d4"
                                    />
                                  </g>
                                );
                              }}
                              activeDot={{
                                r: 5,
                                fill: '#06b6d4',
                                stroke: '#fff',
                                strokeWidth: 2,
                                filter: 'url(#lineGlow)',
                              }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <EmptyChart icon={TrendingUp} title="No trend data yet" sub="Activity will be tracked automatically" />
                      )}
                    </CardContent>
                  </Card>

                </div>
                {/* Row 2 — analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                  {/* Activity Distribution */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Activity Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {dashStats.by_type.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={dashStats.by_type}
                              dataKey="count" nameKey="category"
                              cx="50%" cy="50%"
                              innerRadius={52} outerRadius={80}
                              paddingAngle={3}
                            >
                              {dashStats.by_type.map((entry, i) => (
                                <Cell key={entry.category} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <EmptyChart icon={Activity} title="No activity distribution yet" sub="Start working with documents" />
                      )}
                    </CardContent>
                  </Card>

                  {/* Document Health */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">Document Health</CardTitle>
                        <Link to="/documents" className="text-xs text-primary hover:underline flex items-center gap-1">
                          All documents <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        {
                          label: 'Published', count: dashStats.documents.published,
                          color: 'bg-emerald-500', track: 'bg-emerald-100 dark:bg-emerald-900/30',
                          textColor: 'text-emerald-600 dark:text-emerald-400',
                          icon: CheckCircle2,
                        },
                        {
                          label: 'Draft', count: dashStats.documents.draft,
                          color: 'bg-amber-500', track: 'bg-amber-100 dark:bg-amber-900/30',
                          textColor: 'text-amber-600 dark:text-amber-400',
                          icon: FileText,
                        },
                        {
                          label: 'Archived', count: dashStats.documents.archived,
                          color: 'bg-slate-400 dark:bg-slate-600', track: 'bg-slate-100 dark:bg-slate-800',
                          textColor: 'text-slate-500 dark:text-slate-400',
                          icon: Archive,
                        },
                        {
                          label: 'Starred', count: dashStats.documents.starred,
                          color: 'bg-yellow-400', track: 'bg-yellow-100 dark:bg-yellow-900/30',
                          textColor: 'text-yellow-600 dark:text-yellow-400',
                          icon: Star,
                        },
                      ].map(({ label, count, color, track, textColor, icon: Icon }) => {
                        const pct = dashStats.documents.total > 0
                          ? Math.round((count / dashStats.documents.total) * 100)
                          : 0;
                        return (
                          <div key={label} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Icon className={`h-3.5 w-3.5 ${textColor}`} />
                                <span className="text-xs font-medium">{label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{count} doc{count !== 1 ? 's' : ''}</span>
                                <span className={`text-xs font-bold tabular-nums ${textColor}`}>{pct}%</span>
                              </div>
                            </div>
                            <div className={`h-2 rounded-full ${track} overflow-hidden`}>
                              <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {dashStats.documents.total === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">No documents yet — upload your first file</p>
                      )}
                    </CardContent>
                  </Card>

                </div>
                {/* Row 3 — Recent Activity full-width */}

                  {/* Recent Activity feed */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
                      <Button variant="ghost" size="sm" asChild className="text-xs h-7">
                        <Link to="/recent" className="flex items-center gap-1">
                          View all <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {dashStats.recent_documents.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                          {dashStats.recent_documents.slice(0, 8).map(doc => (
                            <Link key={doc.id} to={`/documents/${doc.id}`}>
                              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/60 transition-colors group">
                                <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                  <FileText className="h-4 w-4 text-blue-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{doc.title}</p>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {formatRelative(doc.updated_at)}
                                    {doc.owner_name ? ` · ${doc.owner_name}` : ''}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[140px] text-center gap-2">
                          <Clock className="h-10 w-10 text-muted-foreground/30" />
                          <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
                          <p className="text-xs text-muted-foreground/70">Activity will appear here automatically</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                </div>
              </TabsContent>

              {/* ══ Recent Documents ══════════════════════════════════════════ */}
              <TabsContent value="recent" className="mt-4">
                <div className="space-y-4">

                  {/* Quick status chips */}
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-full px-3 py-1">
                      <FileStack className="h-3.5 w-3.5" />
                      {dashStats.documents.published} published
                    </div>
                    <div className="flex items-center gap-1.5 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full px-3 py-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {dashStats.documents.draft} drafts
                    </div>
                    <div className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1">
                      <Archive className="h-3.5 w-3.5" />
                      {dashStats.documents.archived} archived
                    </div>
                    <div className="flex items-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full px-3 py-1">
                      <Database className="h-3.5 w-3.5" />
                      {formatStorage(dashStats.storage.total_mb)} used
                    </div>
                  </div>

                  <Card className="shadow-sm">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        Recent Documents
                      </CardTitle>
                      <Button variant="ghost" size="sm" asChild className="text-xs">
                        <Link to="/documents" className="flex items-center gap-1">
                          View all <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {recentDocs.length > 0 ? (
                        <div className="space-y-1">
                          {recentDocs.map(doc => (
                            <Link key={doc.id} to={`/documents/${doc.id}`}>
                              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/60 transition-colors group">
                                <FileIcon name={doc.file_name} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{doc.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatRelative(doc.updated_at)}
                                    {doc.owner_name ? ` · ${doc.owner_name}` : ''}
                                    {' · '}{(doc.file_size / 1024 / 1024).toFixed(1)} MB
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge variant="outline" className="text-[10px] capitalize hidden sm:flex">{doc.status}</Badge>
                                  <Badge variant="outline" className="text-[10px] uppercase hidden md:flex">{doc.file_type}</Badge>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-12 text-center gap-3">
                          <Clock className="h-12 w-12 text-muted-foreground/30" />
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">No recent documents</p>
                            <p className="text-xs text-muted-foreground/70 mt-0.5">Upload a document to see it here</p>
                          </div>
                          <Button size="sm" asChild>
                            <Link to="/documents/new">Upload Document</Link>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ══ Starred Documents ════════════════════════════════════════ */}
              <TabsContent value="starred" className="mt-4">
                <Card className="shadow-sm">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      Starred Documents
                    </CardTitle>
                    <Button variant="ghost" size="sm" asChild className="text-xs">
                      <Link to="/starred" className="flex items-center gap-1">
                        View all <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {starredDocs.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {starredDocs.map(doc => (
                          <Link key={doc.id} to={`/documents/${doc.id}`}>
                            <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/60 transition-colors group">
                              <FileIcon name={doc.file_name} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{doc.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(doc.file_size / 1024 / 1024).toFixed(1)} MB · {formatRelative(doc.updated_at)}
                                </p>
                              </div>
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-12 text-center gap-3">
                        <Star className="h-12 w-12 text-muted-foreground/30" />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">No starred documents</p>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">Star important documents to access them quickly</p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/documents">View All Documents</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Dashboard;
