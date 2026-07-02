import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { documentsService, BackendDocument, usersService, User, userSharesService, ShareRecipient, SharePermission } from '@/services';
import { useAuth } from '@/context/AuthContext';
import { api, API_BASE_URL } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Share2, Copy, Link2, Clock, Eye, Download, Trash2,
  Users, AlertCircle, Loader2, Lock, LockOpen, UserPlus, X,
} from 'lucide-react';
import { format } from 'date-fns';

interface BackendShare {
  id: string;
  document_id: string;
  owner_name: string;
  share_token: string;
  shared_by: string;
  permission: 'view' | 'download';
  expires_at?: string | null;
  access_count: number;
  created_at: string;
}

const sharesService = {
  async create(payload: {
    document_id: string;
    permission: 'view' | 'download';
    expires_at?: string | null;
    password?: string;
  }): Promise<BackendShare> {
    const data = await api.post<{ share: BackendShare }>('/shares', payload);
    return data.share;
  },
  async list(): Promise<BackendShare[]> {
    const data = await api.get<{ shares: BackendShare[] }>('/shares');
    return data.shares ?? [];
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/shares/${id}`);
  },
};

const shareUrl = (token: string) => `${API_BASE_URL}/shares/public/${token}`;

const DocumentShare: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [doc, setDoc] = useState<BackendDocument | null>(null);
  const [shares, setShares] = useState<BackendShare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const [permission, setPermission] = useState<'view' | 'download'>('view');
  const [hasExpiration, setHasExpiration] = useState(true);
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');

  // ── Share with a person ──────────────────────────────────────
  const [directory, setDirectory] = useState<User[]>([]);
  const [recipients, setRecipients] = useState<ShareRecipient[]>([]);
  const [personSearch, setPersonSearch] = useState('');
  const [personPermission, setPersonPermission] = useState<SharePermission>('view');
  const [grantingUserId, setGrantingUserId] = useState<string | null>(null);
  const [personError, setPersonError] = useState('');

  const load = useCallback(async () => {
    if (!documentId) return;
    setIsLoading(true);
    try {
      const [document, allShares, dir, recips] = await Promise.all([
        documentsService.get(documentId),
        sharesService.list(),
        usersService.directory().catch(() => [] as User[]),
        userSharesService.listRecipients(documentId).catch(() => [] as ShareRecipient[]),
      ]);
      setDoc(document);
      setShares(allShares.filter(s => s.document_id === documentId));
      setDirectory(dir);
      setRecipients(recips);
    } catch {
      navigate('/documents');
    } finally {
      setIsLoading(false);
    }
  }, [documentId, navigate]);

  useEffect(() => { load(); }, [load]);

  const recipientIds = useMemo(() => new Set(recipients.map(r => r.user_id)), [recipients]);
  const searchResults = useMemo(() => {
    const q = personSearch.trim().toLowerCase();
    if (!q) return [];
    return directory
      .filter(u => u.id !== currentUser?.id && !recipientIds.has(u.id))
      .filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .slice(0, 6);
  }, [directory, personSearch, currentUser?.id, recipientIds]);

  const handleGrant = async (userId: string) => {
    if (!documentId) return;
    setGrantingUserId(userId);
    setPersonError('');
    try {
      await userSharesService.grant(documentId, userId, personPermission);
      const recips = await userSharesService.listRecipients(documentId);
      setRecipients(recips);
      setPersonSearch('');
    } catch (e) {
      setPersonError(e instanceof Error ? e.message : 'Failed to share with this person');
    } finally {
      setGrantingUserId(null);
    }
  };

  const handleRevokePerson = async (userId: string) => {
    if (!documentId) return;
    try {
      await userSharesService.revoke(documentId, userId);
      setRecipients(prev => prev.filter(r => r.user_id !== userId));
    } catch {
      globalThis.alert('Failed to remove access');
    }
  };

  const handleCreate = async () => {
    if (!documentId) return;
    setIsCreating(true);
    setError('');
    try {
      const expiresAt = hasExpiration
        ? new Date(Date.now() + parseInt(expiresInDays) * 86400000).toISOString()
        : null;
      const share = await sharesService.create({
        document_id: documentId,
        permission,
        expires_at: expiresAt,
        password: usePassword && password ? password : undefined,
      });
      setShares(prev => [share, ...prev]);
      await navigator.clipboard.writeText(shareUrl(share.share_token));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create share link');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl(token));
    } catch {
      globalThis.alert('Failed to copy — please copy the link manually');
    }
  };

  const handleRevoke = async (shareId: string) => {
    if (!globalThis.confirm('Revoke this share link? Anyone using it will lose access.')) return;
    try {
      await sharesService.delete(shareId);
      setShares(prev => prev.filter(s => s.id !== shareId));
    } catch (e) {
      globalThis.alert(e instanceof Error ? e.message : 'Failed to revoke share');
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="h-100 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!doc) return null;

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Share Document</h1>
            <p className="text-muted-foreground mt-1">Share "{doc.title}" via a secure link</p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/documents/${documentId}`)}>
            Back to Document
          </Button>
        </div>

        {/* Share with a person */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Share with a person
            </CardTitle>
            <CardDescription>Give a specific account access — they'll see it under "Shared with Me"</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {personError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{personError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Search by name or email…"
                value={personSearch}
                onChange={e => setPersonSearch(e.target.value)}
                className="flex-1"
              />
              <Select value={personPermission} onValueChange={v => setPersonPermission(v as SharePermission)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="flex items-center gap-2"><Eye className="h-4 w-4" />View only</div>
                  </SelectItem>
                  <SelectItem value="download">
                    <div className="flex items-center gap-2"><Download className="h-4 w-4" />View &amp; Download</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y overflow-hidden">
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleGrant(u.id)}
                    disabled={grantingUserId === u.id}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors disabled:opacity-50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    {grantingUserId === u.id
                      ? <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      : <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {recipients.length > 0 && (
              <div className="space-y-2 pt-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Shared with</Label>
                {recipients.map(r => (
                  <div key={r.user_id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="capitalize">
                        {r.permission === 'view' ? <><Eye className="h-3 w-3 mr-1" />View</> : <><Download className="h-3 w-3 mr-1" />Download</>}
                      </Badge>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Remove access" onClick={() => handleRevokePerson(r.user_id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create share */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Create Share Link
            </CardTitle>
            <CardDescription>Generate a new link — anyone with it can access the document</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Permission</Label>
              <Select value={permission} onValueChange={v => setPermission(v as 'view' | 'download')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      View only
                    </div>
                  </SelectItem>
                  <SelectItem value="download">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      View &amp; Download
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Link Expiration</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={hasExpiration} onCheckedChange={setHasExpiration} />
                  <span className="text-sm text-muted-foreground">
                    {hasExpiration ? 'Enabled' : 'Never expires'}
                  </span>
                </div>
              </div>
              {hasExpiration && (
                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Password Protection</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={usePassword} onCheckedChange={v => { setUsePassword(v); if (!v) setPassword(''); }} />
                  <span className="text-sm text-muted-foreground">
                    {usePassword ? <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Protected</span> : <span className="flex items-center gap-1"><LockOpen className="h-3 w-3" /> No password</span>}
                  </span>
                </div>
              </div>
              {usePassword && (
                <Input
                  type="password"
                  placeholder="Enter a password for this link"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              )}
            </div>

            <Button onClick={handleCreate} disabled={isCreating || (usePassword && !password)} className="w-full">
              <Link2 className="h-4 w-4 mr-2" />
              {isCreating ? 'Creating…' : 'Create & Copy Link'}
            </Button>
          </CardContent>
        </Card>

        {/* Active shares */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Share Links ({shares.length})
            </CardTitle>
            <CardDescription>Manage existing links for this document</CardDescription>
          </CardHeader>
          <CardContent>
            {shares.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Share2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No active share links yet</p>
                <p className="text-sm">Create one above to get started</p>
              </div>
            )}
            {shares.length > 0 && (
              <div className="space-y-4">
                {shares.map(share => (
                  <div key={share.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="capitalize">
                            {share.permission === 'view'
                              ? <><Eye className="h-3 w-3 mr-1" />View</>
                              : <><Download className="h-3 w-3 mr-1" />Download</>}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Created {format(new Date(share.created_at), 'MMM d, yyyy')}</span>
                          </div>
                          {share.expires_at && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>· Expires {format(new Date(share.expires_at), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            · {share.access_count} view{share.access_count !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="outline" title="Copy link" onClick={() => handleCopy(share.share_token)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" title="Revoke" onClick={() => handleRevoke(share.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Separator />
                    <div className="bg-muted px-3 py-2 rounded text-xs font-mono break-all text-muted-foreground">
                      {shareUrl(share.share_token)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default DocumentShare;
