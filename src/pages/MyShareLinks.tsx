import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sharesService, documentsService, BackendShare, BackendDocument } from '@/services';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Share2, FileText, Link2, Eye, Download, Edit, Clock,
  Loader2, Copy, Check, Trash2, ExternalLink, Users,
  ArrowRight, AlertCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const PERMISSION_CONFIG = {
  view:     { label: 'View only',  icon: Eye,      color: 'text-blue-500',    bg: 'bg-blue-500/10'    },
  edit:     { label: 'Can edit',   icon: Edit,     color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  download: { label: 'Download',   icon: Download, color: 'text-violet-500',  bg: 'bg-violet-500/10'  },
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const isExpired = (expiresAt: string | null | undefined) =>
  !!expiresAt && new Date(expiresAt) < new Date();

interface ShareRow { share: BackendShare; doc: BackendDocument | null }

const MyShareLinks: React.FC = () => {
  const navigate = useNavigate();

  const [rows, setRows]         = useState<ShareRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [copied, setCopied]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError('');

    Promise.all([
      sharesService.list(),
      documentsService.list().catch(() => [] as BackendDocument[]),
    ])
      .then(([shares, docs]) => {
        if (cancelled) return;
        const docMap = Object.fromEntries(docs.map(d => [d.id, d]));
        setRows((shares ?? []).map(s => ({ share: s, doc: docMap[s.document_id] ?? null })));
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not connect to the server. Check your connection.');
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const handleCopy = (token: string) => {
    const url = sharesService.buildShareUrl(token);
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRevoke = async (shareId: string) => {
    if (!globalThis.confirm('Revoke this share link? Anyone with the link will lose access.')) return;
    try {
      await sharesService.revoke(shareId);
      setRows(prev => prev.filter(r => r.share.id !== shareId));
    } catch {
      globalThis.alert('Failed to revoke share');
    }
  };

  const active  = rows.filter(r => !isExpired(r.share.expires_at));
  const expired = rows.filter(r =>  isExpired(r.share.expires_at));

  return (
    <MainLayout>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
              <Share2 className="h-5 w-5 text-teal-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">My Share Links</h1>
              <p className="text-sm text-muted-foreground">Share links you've created for your documents</p>
            </div>
          </div>
          {rows.length > 0 && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/documents">
                <FileText className="h-4 w-4" />
                Go to Documents
              </Link>
            </Button>
          )}
        </div>

        {/* ── Loading ── */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* ── Network error (rare) ── */}
        {!isLoading && loadError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {/* ── Main content ── */}
        {!isLoading && !loadError && (
          <>
            {/* ── "How this works" notice ── */}
            <div className="rounded-2xl border bg-card p-5 flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-teal-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Public link sharing</p>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-lg">
                  Anyone with a link below can open the document, no account required. To share with a
                  specific person's account instead, use the "Share with a person" option on the document's
                  Share page.
                </p>
              </div>
            </div>

            {/* ── How to share CTA — shown when no shares exist ── */}
            {rows.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-border bg-card p-8 flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-teal-500/10 flex items-center justify-center">
                  <Link2 className="h-8 w-8 text-teal-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">No share links yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    You haven't created any share links yet. Open a document and click <strong>Share</strong> to create a link others can access.
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  <Button onClick={() => navigate('/documents')} className="gap-2">
                    <FileText className="h-4 w-4" />
                    Browse Documents
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/documents/new')} className="gap-2">
                    Upload &amp; Share
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* How-to steps */}
                <div className="mt-2 grid sm:grid-cols-3 gap-4 w-full max-w-lg text-left">
                  {[
                    { n: '1', title: 'Upload a document', desc: 'Use "New Document" to upload any file.' },
                    { n: '2', title: 'Open and click Share', desc: 'Inside the document view, click the Share button.' },
                    { n: '3', title: 'Copy the link', desc: 'Set permissions, then copy the link to share.' },
                  ].map(step => (
                    <div key={step.n} className="rounded-xl border bg-muted/30 p-4 space-y-1">
                      <div className="h-6 w-6 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 text-xs font-bold flex items-center justify-center">{step.n}</div>
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="text-xs text-muted-foreground">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Active share links ── */}
            {active.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                    Active Links
                  </span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{active.length}</Badge>
                </div>

                {active.map(({ share, doc }) => {
                  const perm = PERMISSION_CONFIG[share.permission] ?? PERMISSION_CONFIG.view;
                  const PermIcon = perm.icon;
                  return (
                    <div
                      key={share.id}
                      className="rounded-2xl border bg-card p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-teal-500" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          className="font-semibold text-sm text-left hover:text-primary transition-colors truncate block max-w-full"
                          onClick={() => doc && navigate(`/documents/${doc.id}`)}
                        >
                          {doc?.title ?? 'Unknown document'}
                        </button>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className={cn('inline-flex items-center gap-1 text-xs font-medium', perm.color)}>
                            <PermIcon className="h-3 w-3" />
                            {perm.label}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {share.access_count} {share.access_count === 1 ? 'view' : 'views'}
                          </span>
                          {share.expires_at && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Expires {fmt(share.expires_at)}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">Created {fmt(share.created_at)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Copy link"
                          onClick={() => handleCopy(share.share_token)}>
                          {copied === share.share_token
                            ? <Check className="h-4 w-4 text-emerald-500" />
                            : <Copy className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Open link"
                          onClick={() => globalThis.open(sharesService.buildShareUrl(share.share_token), '_blank')}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" title="Revoke"
                          onClick={() => handleRevoke(share.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {/* ── Expired share links ── */}
            {expired.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                    Expired Links
                  </span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground">{expired.length}</Badge>
                </div>

                {expired.map(({ share, doc }) => (
                  <div key={share.id}
                    className="rounded-2xl border bg-card/50 p-4 flex items-center gap-4 opacity-60">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{doc?.title ?? 'Unknown document'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expired {share.expires_at ? fmt(share.expires_at) : ''}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive shrink-0"
                      title="Remove" onClick={() => handleRevoke(share.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </section>
            )}
          </>
        )}

      </div>
    </MainLayout>
  );
};

export default MyShareLinks;
