import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usersService, User } from '@/services';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  UserPlus, Edit2, Trash2, Key, CheckCircle, XCircle, AlertCircle,
  Search, Loader2, ShieldCheck, ShieldOff, Users, Lock, UserCog,
  ShieldAlert, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DEPARTMENTS = [
  'Finance', 'HR', 'Procurement', 'Inventory', 'Project Management',
  'Assets/Maintenance', 'Logistics', 'IT', 'Operations', 'Administration',
];

type Role = 'admin' | 'editor' | 'viewer';

const ROLE_STYLE: Record<string, { label: string; className: string }> = {
  admin:  { label: 'Admin',  className: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' },
  editor: { label: 'Editor', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700' },
  viewer: { label: 'Viewer', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700' },
};

const DEPT_COLORS = [
  'text-blue-500', 'text-violet-500', 'text-emerald-500', 'text-amber-500',
  'text-rose-500', 'text-teal-500', 'text-indigo-500', 'text-orange-500',
  'text-pink-500', 'text-cyan-500',
];

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-indigo-500',
];

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// Default permission set derived from role
function defaultPermsForRole(role: string) {
  const isAdmin  = role === 'admin';
  const isEditor = role === 'editor' || isAdmin;
  return {
    canRead:       true,
    canWrite:      isEditor,
    canDelete:     isAdmin,
    canShare:      isEditor,
    canManageUsers: isAdmin,
    canManagePerms: isAdmin,
  };
}

type Perms = ReturnType<typeof defaultPermsForRole>;

const UserManagement: React.FC = () => {
  const [users, setUsers]       = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [flash, setFlash]       = useState('');
  const [actionError, setActionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialogs
  const [isAddOpen, setIsAddOpen]         = useState(false);
  const [isEditOpen, setIsEditOpen]       = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isPermsOpen, setIsPermsOpen]     = useState(false);
  const [selectedUser, setSelectedUser]   = useState<User | null>(null);
  const [perms, setPerms]                 = useState<Perms>(defaultPermsForRole('viewer'));

  // Add-user form
  const [newUser, setNewUser] = useState({
    name: '', email: '', password: '', role: 'viewer' as Role, department: '',
  });

  // Password reset form
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const showFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(''), 3000);
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const fetched = await usersService.list();
      setUsers(fetched ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Department stats computed from users list (always in sync) ────────────
  const deptStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const dept of DEPARTMENTS) counts[dept] = 0;
    for (const u of users) {
      if (u.department && counts[u.department] !== undefined) {
        counts[u.department]++;
      }
    }
    return DEPARTMENTS.map(d => ({ department: d, count: counts[d] }));
  }, [users]);

  // ── Filtered users ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.department ?? '').toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const handleAddUser = async () => {
    setActionError('');
    if (!newUser.name || !newUser.email || !newUser.password) {
      setActionError('Name, email and password are required');
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await usersService.create({
        name: newUser.name, email: newUser.email,
        password: newUser.password, role: newUser.role,
        department: newUser.department || undefined,
      });
      setUsers(prev => [created, ...prev]);
      setNewUser({ name: '', email: '', password: '', role: 'viewer', department: '' });
      setIsAddOpen(false);
      showFlash(`User "${created.name}" created successfully`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to create user');
    } finally { setIsSubmitting(false); }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setActionError('');
    setIsSubmitting(true);
    try {
      const updated = await usersService.update(selectedUser.id, {
        name: selectedUser.name,
        email: selectedUser.email,
        role: selectedUser.role,
        department: selectedUser.department,
      });
      setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
      setIsEditOpen(false);
      showFlash('User updated');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to update user');
    } finally { setIsSubmitting(false); }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword || newPassword !== confirmPassword) return;
    setIsSubmitting(true);
    try {
      await usersService.resetPassword(selectedUser.id, newPassword);
      setIsPasswordOpen(false);
      setNewPassword(''); setConfirmPassword('');
      showFlash('Password reset successfully');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to reset password');
    } finally { setIsSubmitting(false); }
  };

  const handleToggleStatus = async (user: User) => {
    const next = user.status === 'active' ? 'inactive' : 'active';
    try {
      const updated = await usersService.toggleStatus(user.id, next as 'active' | 'inactive');
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: updated.status } : u));
      showFlash(`User ${next === 'active' ? 'activated' : 'deactivated'}`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to update status');
    }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!globalThis.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await usersService.delete(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      showFlash('User deleted');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to delete user');
    }
  };

  const openPerms = (user: User) => {
    setSelectedUser(user);
    setPerms(defaultPermsForRole(user.role));
    setIsPermsOpen(true);
  };

  // ── Loading / error screens ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (loadError) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={load}>Retry</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <UserCog className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
              <p className="text-sm text-muted-foreground">Manage users, roles, and permissions</p>
            </div>
          </div>

          {/* Add User dialog */}
          <Dialog open={isAddOpen} onOpenChange={open => { setIsAddOpen(open); if (!open) setActionError(''); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>Create a new user account</DialogDescription>
              </DialogHeader>
              {actionError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{actionError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="add-name">Full Name</Label>
                  <Input id="add-name" value={newUser.name}
                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Jane Doe" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-email">Email</Label>
                  <Input id="add-email" type="email" value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="jane@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-password">Password</Label>
                  <Input id="add-password" type="password" value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="••••••••" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select value={newUser.role} onValueChange={v => setNewUser({ ...newUser, role: v as Role })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Department</Label>
                    <Select value={newUser.department} onValueChange={v => setNewUser({ ...newUser, department: v })}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button onClick={handleAddUser} disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</> : 'Create User'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── Flash / action error ── */}
        {flash && (
          <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-800 dark:text-emerald-300">{flash}</AlertDescription>
          </Alert>
        )}
        {actionError && !isAddOpen && !isEditOpen && !isPasswordOpen && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        {/* ── Department stats (computed from users — always current) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {deptStats.map((stat, i) => (
            <Card
              key={stat.department}
              className={cn(
                'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all border-border/60',
                searchQuery === stat.department && 'ring-2 ring-primary'
              )}
              onClick={() => setSearchQuery(prev => prev === stat.department ? '' : stat.department)}
            >
              <CardContent className="p-4">
                <p className={cn('text-xs font-semibold uppercase tracking-wide mb-1 truncate', DEPT_COLORS[i % DEPT_COLORS.length])}>
                  {stat.department}
                </p>
                <p className="text-2xl font-bold">{stat.count}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {stat.count === 1 ? 'user' : 'users'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="users">
          <TabsList className="h-9">
            <TabsTrigger value="users" className="gap-2 text-sm">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="credentials" className="gap-2 text-sm">
              <Lock className="h-4 w-4" />
              Credentials
            </TabsTrigger>
          </TabsList>

          {/* ══════════════ USERS TAB ══════════════ */}
          <TabsContent value="users" className="mt-4">
            <div className="rounded-2xl border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div>
                  <p className="font-semibold">All Users</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {filtered.length} of {users.length} users
                  </p>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search by name, email, dept…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9 h-9"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[220px]">Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[100px]">Role</TableHead>
                    <TableHead className="w-[160px]">Department</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(user => {
                    const roleConf = ROLE_STYLE[user.role] ?? ROLE_STYLE.viewer;
                    const isActive = user.status === 'active';
                    return (
                      <TableRow key={user.id} className="hover:bg-muted/40">
                        {/* Name */}
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold shrink-0', avatarColor(user.name))}>
                              {initials(user.name)}
                            </div>
                            <span className="font-medium text-sm">{user.name}</span>
                          </div>
                        </TableCell>
                        {/* Email */}
                        <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                        {/* Role */}
                        <TableCell>
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', roleConf.className)}>
                            {roleConf.label}
                          </span>
                        </TableCell>
                        {/* Department */}
                        <TableCell className="text-sm">{user.department ?? '—'}</TableCell>
                        {/* Status */}
                        <TableCell>
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                              <CheckCircle className="h-3 w-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              <XCircle className="h-3 w-3" /> Inactive
                            </span>
                          )}
                        </TableCell>
                        {/* Actions */}
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            {/* 1 — Edit user */}
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit user"
                              onClick={() => { setSelectedUser(user); setActionError(''); setIsEditOpen(true); }}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            {/* 2 — Grant permissions */}
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Grant permissions"
                              onClick={() => openPerms(user)}>
                              <ShieldAlert className="h-3.5 w-3.5 text-indigo-500" />
                            </Button>
                            {/* 3 — Change password */}
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Reset password"
                              onClick={() => { setSelectedUser(user); setActionError(''); setNewPassword(''); setConfirmPassword(''); setIsPasswordOpen(true); }}>
                              <Key className="h-3.5 w-3.5" />
                            </Button>
                            {/* 4 — Activate / Deactivate */}
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              title={isActive ? 'Deactivate user' : 'Activate user'}
                              onClick={() => handleToggleStatus(user)}
                            >
                              {isActive
                                ? <XCircle className="h-3.5 w-3.5 text-orange-500" />
                                : <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
                            </Button>
                            {/* 5 — Delete */}
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive"
                              title="Delete user" onClick={() => handleDelete(user.id, user.name)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-sm">
                        {searchQuery ? `No users match "${searchQuery}"` : 'No users found'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ══════════════ CREDENTIALS TAB ══════════════ */}
          <TabsContent value="credentials" className="mt-4">
            <div className="rounded-2xl border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b">
                <p className="font-semibold">User Credentials</p>
                <p className="text-xs text-muted-foreground mt-0.5">View and manage authentication details</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[180px]">Password</TableHead>
                    <TableHead className="w-[140px]">2FA</TableHead>
                    <TableHead className="w-[180px]">Last Active</TableHead>
                    <TableHead className="w-[160px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => {
                    const twoFA = (user as User & { two_factor_enabled?: boolean }).two_factor_enabled;
                    const lastActive = user.updated_at
                      ? new Date(user.updated_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—';
                    return (
                      <TableRow key={user.id} className="hover:bg-muted/40">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-semibold shrink-0', avatarColor(user.name))}>
                              {initials(user.name)}
                            </div>
                            <span className="text-sm font-medium">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-base tracking-widest text-muted-foreground select-none">••••••••</span>
                        </TableCell>
                        <TableCell>
                          {twoFA ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-700 gap-1 font-medium">
                              <ShieldCheck className="h-3 w-3" /> Enabled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-muted-foreground font-medium">
                              <ShieldOff className="h-3 w-3" /> Disabled
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{lastActive}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs font-medium"
                            onClick={() => { setSelectedUser(user); setActionError(''); setNewPassword(''); setConfirmPassword(''); setIsPasswordOpen(true); }}>
                            <Key className="h-3.5 w-3.5" />
                            Reset Password
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-sm">No users found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Edit user dialog ── */}
      <Dialog open={isEditOpen} onOpenChange={open => { setIsEditOpen(open); if (!open) setActionError(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and role</DialogDescription>
          </DialogHeader>
          {actionError && (
            <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{actionError}</AlertDescription></Alert>
          )}
          {selectedUser && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={selectedUser.name} onChange={e => setSelectedUser({ ...selectedUser, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={selectedUser.email} onChange={e => setSelectedUser({ ...selectedUser, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={selectedUser.role} onValueChange={v => setSelectedUser({ ...selectedUser, role: v as Role })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Select value={selectedUser.department ?? ''} onValueChange={v => setSelectedUser({ ...selectedUser, department: v })}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleUpdateUser} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reset password dialog ── */}
      <Dialog open={isPasswordOpen} onOpenChange={open => { setIsPasswordOpen(open); if (!open) setActionError(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Set a new password for <strong>{selectedUser?.name}</strong></DialogDescription>
          </DialogHeader>
          {actionError && (
            <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{actionError}</AlertDescription></Alert>
          )}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm Password</Label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>Passwords do not match</AlertDescription></Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={!newPassword || newPassword !== confirmPassword || isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Resetting…</> : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Grant permissions dialog ── */}
      <Dialog open={isPermsOpen} onOpenChange={setIsPermsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Permissions</DialogTitle>
            <DialogDescription>Configure access permissions for <strong>{selectedUser?.name}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {([
              { key: 'canRead',        label: 'Can Read Documents' },
              { key: 'canWrite',       label: 'Can Write / Edit Documents' },
              { key: 'canDelete',      label: 'Can Delete Documents' },
              { key: 'canShare',       label: 'Can Share Documents' },
              { key: 'canManageUsers', label: 'Can Manage Users' },
              { key: 'canManagePerms', label: 'Can Manage Permissions' },
            ] as { key: keyof Perms; label: string }[]).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="font-normal text-sm">{label}</Label>
                <Switch
                  checked={perms[key]}
                  onCheckedChange={val => setPerms(p => ({ ...p, [key]: val }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermsOpen(false)}>Cancel</Button>
            <Button onClick={() => { setIsPermsOpen(false); showFlash(`Permissions updated for ${selectedUser?.name}`); }}>
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default UserManagement;
