import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { documentsService, BackendDocument } from '@/services';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Star, FileText, Loader2, Search, X, AlertCircle,
  FolderOpen, Calendar, HardDrive, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const EXT_COLOR: Record<string, string> = {
  pdf:  'text-red-500',
  doc:  'text-blue-500',  docx: 'text-blue-500',
  xls:  'text-green-500', xlsx: 'text-green-500',
  ppt:  'text-orange-500', pptx: 'text-orange-500',
};

function fileColor(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return EXT_COLOR[ext] ?? 'text-slate-400';
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const STATUS_STYLE: Record<string, string> = {
  published:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  draft:          'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  archived:       'bg-slate-100  text-slate-600  dark:bg-slate-800     dark:text-slate-400',
  pending_review: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

const StarredDocuments: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<BackendDocument[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [unstarring, setUnstarring] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const docs = await documentsService.list({ starred: true, limit: 200 });
      setDocuments(docs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load starred documents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUnstar = async (e: React.MouseEvent, doc: BackendDocument) => {
    e.preventDefault();
    e.stopPropagation();
    setUnstarring(doc.id);
    try {
      await documentsService.toggleStar(doc.id);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    } catch {
      // silently ignore — star state is unchanged
    } finally {
      setUnstarring(null);
    }
  };

  const filtered = search
    ? documents.filter(d =>
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        (d.folder_name ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : documents;

  return (
    <MainLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Starred</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? 'Loading…'
                  : `${documents.length} starred document${documents.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={load} title="Refresh" disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/documents">All Documents</Link>
            </Button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              {error}
              <Button variant="ghost" size="sm" onClick={load} className="ml-4 h-7">Retry</Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Content */}
        {!isLoading && !error && (
          <>
            {/* Search */}
            {documents.length > 0 && (
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search starred docs…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-9 h-9"
                />
                {search && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearch('')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Empty state */}
            {documents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border bg-card">
                <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
                  <Star className="h-8 w-8 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No starred documents</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                  Star important documents so you can find them quickly here.
                </p>
                <Button onClick={() => navigate('/documents')} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Browse Documents
                </Button>
              </div>
            )}

            {/* Search empty */}
            {documents.length > 0 && filtered.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                No starred documents match <strong>"{search}"</strong>
              </div>
            )}

            {/* Document list */}
            {filtered.length > 0 && (
              <div className="rounded-2xl border bg-card overflow-hidden divide-y">
                {filtered.map(doc => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 cursor-pointer transition-colors group"
                    onClick={() => navigate(`/documents/${doc.id}`)}
                  >
                    {/* File icon */}
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <FileText className={cn('h-5 w-5', fileColor(doc.file_name))} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{doc.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {doc.folder_name && (
                          <span className="flex items-center gap-1">
                            <FolderOpen className="h-3 w-3 text-amber-500" />
                            {doc.folder_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          {formatSize(doc.file_size)}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[11px] font-medium capitalize shrink-0 hidden sm:inline-flex',
                      STATUS_STYLE[doc.status] ?? STATUS_STYLE.draft
                    )}>
                      {doc.status.replace('_', ' ')}
                    </span>

                    {/* Unstar button */}
                    <button
                      type="button"
                      title="Remove star"
                      onClick={e => handleUnstar(e, doc)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1.5 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/30"
                      disabled={unstarring === doc.id}
                    >
                      {unstarring === doc.id
                        ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        : <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default StarredDocuments;
