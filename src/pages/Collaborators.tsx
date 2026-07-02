import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usersService } from '@/services';
import type { User } from '@/services';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Search, UsersRound, Mail, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  admin:  { label: 'Admin',  className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-700' },
  editor: { label: 'Editor', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-700' },
  viewer: { label: 'Viewer', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700' },
};

function initials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-indigo-500',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const CollaboratorCard: React.FC<{ user: User; isSelf: boolean }> = ({ user, isSelf }) => {
  const role = user.role ?? 'viewer';
  const roleConf = ROLE_CONFIG[role] ?? ROLE_CONFIG.viewer;
  const bg = avatarColor(user.name ?? '?');

  return (
    <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center shrink-0 text-white font-semibold text-sm shadow-sm', bg)}>
            {initials(user.name ?? '?')}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate">{user.name}</p>
              {isSelf && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">You</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>

            {user.department && (
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{user.department}</span>
              </div>
            )}

            <div className="mt-2.5">
              <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border', roleConf.className)}>
                {roleConf.label}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Collaborators: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    usersService.directory()
      .then(setUsers)
      .catch(() => setError('Failed to load team members'))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = users.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.department?.toLowerCase().includes(search.toLowerCase())
  );

  const byRole = (role: string) => filtered.filter(u => (u.role ?? 'viewer') === role);
  const admins  = byRole('admin');
  const editors = byRole('editor');
  const viewers = byRole('viewer');

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2.5">
              <span className="h-9 w-9 rounded-xl bg-linear-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-800/20 ring-1 ring-emerald-200/80 dark:ring-emerald-700/40 flex items-center justify-center">
                <UsersRound className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </span>
              Collaborators
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {users.length > 0 ? `${users.length} team member${users.length !== 1 ? 's' : ''} in your workspace` : 'Everyone in your workspace'}
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name, email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && error && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <UsersRound className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="font-medium">No team members found</p>
              {search && <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>}
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && filtered.length > 0 && (
          <div className="space-y-8">
            {admins.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Admins</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{admins.length}</Badge>
                </div>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {admins.map(u => <CollaboratorCard key={u.id} user={u} isSelf={u.id === currentUser?.id} />)}
                </div>
              </section>
            )}

            {editors.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Editors</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{editors.length}</Badge>
                </div>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {editors.map(u => <CollaboratorCard key={u.id} user={u} isSelf={u.id === currentUser?.id} />)}
                </div>
              </section>
            )}

            {viewers.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Viewers</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{viewers.length}</Badge>
                </div>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {viewers.map(u => <CollaboratorCard key={u.id} user={u} isSelf={u.id === currentUser?.id} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Collaborators;
