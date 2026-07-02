import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsService, tagsService, BackendDocument, BackendTag } from '@/services';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText, FileImage, Film, Music, Archive, Sheet,
  Presentation, Search, Download, Star, StarOff, Eye,
  Loader2, LayoutGrid, SlidersHorizontal, X, Hash,
  CalendarDays, HardDrive, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── File type helpers ──────────────────────────────────────────────────────────

const EXT_META: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  pdf:  { icon: FileText,     color: 'text-red-500',    bg: 'bg-red-500/10',    label: 'PDF' },
  doc:  { icon: FileText,     color: 'text-blue-500',   bg: 'bg-blue-500/10',   label: 'Word' },
  docx: { icon: FileText,     color: 'text-blue-500',   bg: 'bg-blue-500/10',   label: 'Word' },
  xls:  { icon: Sheet,        color: 'text-green-500',  bg: 'bg-green-500/10',  label: 'Excel' },
  xlsx: { icon: Sheet,        color: 'text-green-500',  bg: 'bg-green-500/10',  label: 'Excel' },
  ppt:  { icon: Presentation, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'PPT' },
  pptx: { icon: Presentation, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'PPT' },
  png:  { icon: FileImage,    color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Image' },
  jpg:  { icon: FileImage,    color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Image' },
  jpeg: { icon: FileImage,    color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Image' },
  gif:  { icon: FileImage,    color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Image' },
  webp: { icon: FileImage,    color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Image' },
  mp4:  { icon: Film,         color: 'text-pink-500',   bg: 'bg-pink-500/10',   label: 'Video' },
  mov:  { icon: Film,         color: 'text-pink-500',   bg: 'bg-pink-500/10',   label: 'Video' },
  mp3:  { icon: Music,        color: 'text-indigo-500', bg: 'bg-indigo-500/10', label: 'Audio' },
  zip:  { icon: Archive,      color: 'text-amber-500',  bg: 'bg-amber-500/10',  label: 'Archive' },
  rar:  { icon: Archive,      color: 'text-amber-500',  bg: 'bg-amber-500/10',  label: 'Archive' },
};

const DEFAULT_META = { icon: FileText, color: 'text-slate-500', bg: 'bg-slate-500/10', label: 'File' };

const getExt = (fileName: string) => fileName.split('.').pop()?.toLowerCase() ?? '';
const getMeta = (fileName: string) => EXT_META[getExt(fileName)] ?? DEFAULT_META;

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const STATUS_COLORS: Record<string, string> = {
  published: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  draft:     'bg-amber-500/10  text-amber-600  border-amber-200',
  archived:  'bg-slate-500/10  text-slate-500  border-slate-200',
};

// ── File-type filter tabs ─────────────────────────────────────────────────────

const TYPE_TABS = [
  { key: 'all',     label: 'All',     exts: null },
  { key: 'pdf',     label: 'PDF',     exts: ['pdf'] },
  { key: 'word',    label: 'Word',    exts: ['doc', 'docx'] },
  { key: 'excel',   label: 'Excel',   exts: ['xls', 'xlsx'] },
  { key: 'image',   label: 'Images',  exts: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
  { key: 'other',   label: 'Other',   exts: null /* catch-all */ },
];

// ── Component ─────────────────────────────────────────────────────────────────

const DocumentBrowser: React.FC = () => {
  const navigate = useNavigate();

  const [docs, setDocs]         = useState<BackendDocument[]>([]);
  const [tagMap, setTagMap]     = useState<Record<string, BackendTag[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [search, setSearch]       = useState('');
  const [typeTab, setTypeTab]     = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy]       = useState<'date' | 'name' | 'size'>('date');
  const [showFilters, setShowFilters] = useState(false);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      // fetch up to 200 docs so all are available for client-side filtering
      const allDocs = await documentsService.list({ limit: 200 });
      setDocs(allDocs);

      // load tags per document in parallel (best-effort)
      const entries = await Promise.all(
        allDocs.map(async d => {
          try {
            const tags = await tagsService.getDocumentTags(d.id);
            return [d.id, tags] as [string, BackendTag[]];
          } catch {
            return [d.id, []] as [string, BackendTag[]];
          }
        })
      );
      setTagMap(Object.fromEntries(entries));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let result = docs;

    // text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(d =>
        d.title.toLowerCase().includes(q) || d.file_name.toLowerCase().includes(q)
      );
    }

    // file-type tab
    const tab = TYPE_TABS.find(t => t.key === typeTab);
    if (tab && tab.exts !== null) {
      const knownExts = new Set(Object.keys(EXT_META));
      result = result.filter(d => {
        const ext = getExt(d.file_name);
        if (typeTab === 'other') return !knownExts.has(ext);
        return tab.exts!.includes(ext);
      });
    }

    // status
    if (statusFilter !== 'all') {
      result = result.filter(d => d.status === statusFilter);
    }

    // sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      if (sortBy === 'size') return b.file_size - a.file_size;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [docs, search, typeTab, statusFilter, sortBy]);

  const handleDownload = async (e: React.MouseEvent, doc: BackendDocument) => {
    e.stopPropagation();
    try {
      const { url, file_name } = await documentsService.getPresignedUrl(doc.id);
      const a = Object.assign(document.createElement('a'), { href: url, download: file_name || doc.file_name });
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      // silently ignore
    }
  };

  const handleStar = async (e: React.MouseEvent, doc: BackendDocument) => {
    e.stopPropagation();
    try {
      const isStarred = await documentsService.toggleStar(doc.id);
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, is_starred: isStarred } : d));
    } catch {
      // silently ignore
    }
  };

  return (
    <MainLayout>
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <LayoutGrid className="h-5 w-5 text-cyan-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Browse Documents</h1>
              <p className="text-sm text-muted-foreground">
                {docs.length} {docs.length === 1 ? 'document' : 'documents'} in your library
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowFilters(v => !v)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {(statusFilter !== 'all' || sortBy !== 'date') && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Button>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by title or filename…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch('')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Filter row ── */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 p-3 rounded-xl border bg-muted/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Status</span>
              {(['all', 'published', 'draft', 'archived'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                    statusFilter === s
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:border-primary/40'
                  )}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs font-medium text-muted-foreground">Sort</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                    {sortBy === 'date' ? 'Newest' : sortBy === 'name' ? 'Name' : 'Largest'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy('date')}>Newest first</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('name')}>Name A → Z</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('size')}>Largest first</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {/* ── File-type tabs ── */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {TYPE_TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTypeTab(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                typeTab === tab.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Loading ── */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* ── Error ── */}
        {!isLoading && loadError && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
              <X className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Failed to load documents</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm font-mono">{loadError}</p>
            <Button onClick={load} className="gap-2">
              <Loader2 className="h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        {/* ── Empty ── */}
        {!isLoading && !loadError && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4">
              <LayoutGrid className="h-8 w-8 text-cyan-500" />
            </div>
            <h3 className="text-lg font-semibold mb-1">
              {docs.length === 0 ? 'No documents yet' : 'No results'}
            </h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              {docs.length === 0
                ? 'Upload your first document to get started.'
                : 'Try adjusting your search or filters.'}
            </p>
            {docs.length === 0 && (
              <Button onClick={() => navigate('/documents/new')} className="gap-2">
                Upload Document
              </Button>
            )}
            {docs.length > 0 && (
              <Button variant="outline" onClick={() => { setSearch(''); setTypeTab('all'); setStatusFilter('all'); }}>
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* ── Document grid ── */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(doc => {
              const meta = getMeta(doc.file_name);
              const Icon = meta.icon;
              const docTags = tagMap[doc.id] ?? [];

              return (
                <div
                  key={doc.id}
                  role="button"
                  tabIndex={0}
                  className="group relative rounded-2xl border bg-card hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
                  onClick={() => navigate(`/documents/${doc.id}`)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/documents/${doc.id}`); }}
                >
                  {/* starred indicator strip */}
                  {doc.is_starred && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-400" />
                  )}

                  {/* top section: icon + quick actions */}
                  <div className="p-4 pb-3">
                    <div className="flex items-start justify-between mb-3">
                      {/* file icon */}
                      <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center shrink-0', meta.bg)}>
                        <Icon className={cn('h-6 w-6', meta.color)} />
                      </div>

                      {/* quick actions — visible on hover */}
                      <div
                        className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => e.stopPropagation()}
                        role="group"
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={doc.is_starred ? 'Unstar' : 'Star'}
                          onClick={e => handleStar(e, doc)}
                        >
                          {doc.is_starred
                            ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            : <StarOff className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="View"
                          onClick={e => { e.stopPropagation(); navigate(`/documents/${doc.id}`); }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Download"
                          onClick={e => handleDownload(e, doc)}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* title */}
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                      {doc.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate">{doc.file_name}</p>
                  </div>

                  {/* divider */}
                  <div className="mx-4 border-t" />

                  {/* bottom metadata */}
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] px-1.5 h-5 border font-medium', STATUS_COLORS[doc.status] ?? STATUS_COLORS.draft)}
                      >
                        {doc.status}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {meta.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {formatSize(doc.file_size)}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {formatDate(doc.created_at)}
                      </span>
                    </div>

                    {/* tags */}
                    {docTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {docTags.slice(0, 3).map(tag => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white"
                            style={{ backgroundColor: tag.color }}
                            onClick={e => { e.stopPropagation(); navigate(`/tags/${tag.id}`); }}
                          >
                            <Hash className="h-2.5 w-2.5" />
                            {tag.name}
                          </span>
                        ))}
                        {docTags.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{docTags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Result count ── */}
        {!isLoading && filtered.length > 0 && (
          <p className="text-xs text-muted-foreground text-center pb-2 flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" />
            Showing {filtered.length} of {docs.length} documents
          </p>
        )}
      </div>
    </MainLayout>
  );
};

export default DocumentBrowser;
