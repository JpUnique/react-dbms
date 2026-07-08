import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { documentsService, foldersService, tagsService, bulkService } from '@/services';
import type { BackendDocument, BackendFolder, BackendTag } from '@/services';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, MoreHorizontal,
  FilePlus, FolderPlus, FileText, Trash, Download, Star, SlidersHorizontal,
  Search, X, Loader2, Archive, FolderInput, LayoutGrid, List, RefreshCw,
  FolderOpen, Files, ArrowRight, Share2,
} from 'lucide-react';

type SortField = 'title' | 'file_size' | 'created_at' | 'status';
type SortDir   = 'asc' | 'desc';
type ViewMode  = 'table' | 'grid';

const EXT_COLORS: Record<string, string> = {
  pdf: 'text-red-500',
  doc: 'text-blue-500', docx: 'text-blue-500',
  xls: 'text-green-500', xlsx: 'text-green-500',
  ppt: 'text-orange-500', pptx: 'text-orange-500',
};

const fileExt = (fileName: string) => fileName.split('.').pop()?.toLowerCase() ?? '';

const FileIcon = ({ fileName, size = 'sm' }: { fileName: string; size?: 'sm' | 'lg' }) => {
  const cls = size === 'lg' ? 'h-10 w-10' : 'h-4 w-4';
  return <FileText className={`${cls} ${EXT_COLORS[fileExt(fileName)] ?? 'text-gray-500'}`} />;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  published: 'default', draft: 'secondary', archived: 'outline',
};

const ITEMS_PER_PAGE = 20;

const DocumentList: React.FC = () => {
  const navigate = useNavigate();

  // Data
  const [documents, setDocuments]     = useState<BackendDocument[]>([]);
  const [folders, setFolders]         = useState<BackendFolder[]>([]);
  const [tags, setTags]               = useState<BackendTag[]>([]);
  const [isLoading, setIsLoading]     = useState(true);

  // Filters (server-side)
  const [searchQuery, setSearchQuery]     = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showFilters, setShowFilters]       = useState(false);

  // Filters (client-side)
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [fileTypeFilter, setFileType] = useState('');

  // Sort
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir]     = useState<SortDir>('desc');

  // View
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Selection + pagination
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [currentPage, setCurrentPage]             = useState(1);

  // Bulk actions
  const [isMoveDialogOpen, setIsMoveDialogOpen]     = useState(false);
  const [moveTargetFolder, setMoveTargetFolder]     = useState('');
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [bulkStatus, setBulkStatus]                 = useState('');
  const [isBulkActing, setIsBulkActing]             = useState(false);
  const [isZipping, setIsZipping]                   = useState(false);

  // ── Load ────────────────────────────────────────────────
  const load = useCallback(async () => {
    setIsLoading(true);
    const [docsResult, folsResult, tgsResult] = await Promise.allSettled([
      documentsService.list({
        search: searchQuery || undefined,
        folder_id: selectedFolder || undefined,
        status: selectedStatus || undefined,
      }),
      foldersService.list(null),
      tagsService.list(),
    ]);
    if (docsResult.status === 'fulfilled') setDocuments(docsResult.value);
    if (folsResult.status === 'fulfilled') setFolders(folsResult.value);
    if (tgsResult.status  === 'fulfilled') setTags(tgsResult.value);
    setSelectedDocuments([]);
    setCurrentPage(1);
    setIsLoading(false);
  }, [searchQuery, selectedFolder, selectedStatus]);

  useEffect(() => { load(); }, [load]);

  // ── Sort + date filter (client-side) ────────────────────
  const processedDocs = useMemo(() => {
    let result = [...documents];

    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      result = result.filter(d => new Date(d.created_at).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86399999; // end of day
      result = result.filter(d => new Date(d.created_at).getTime() <= to);
    }
    if (fileTypeFilter) {
      const typeMap: Record<string, string[]> = {
        pdf:   ['pdf'],
        word:  ['doc', 'docx', 'rtf'],
        excel: ['xls', 'xlsx', 'csv'],
        ppt:   ['ppt', 'pptx'],
        image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
        video: ['mp4', 'webm', 'mov', 'avi', 'mkv'],
        audio: ['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg'],
        text:  ['txt', 'md', 'json', 'xml', 'yaml', 'yml', 'csv', 'html', 'css', 'js', 'ts'],
      };
      const allowed = typeMap[fileTypeFilter] ?? [fileTypeFilter];
      result = result.filter(d => {
        const ext = d.file_name.split('.').pop()?.toLowerCase() ?? '';
        return allowed.includes(ext);
      });
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'title')      cmp = a.title.localeCompare(b.title);
      else if (sortField === 'file_size') cmp = a.file_size - b.file_size;
      else if (sortField === 'status')    cmp = a.status.localeCompare(b.status);
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [documents, dateFrom, dateTo, sortField, sortDir]);

  const totalPages  = Math.ceil(processedDocs.length / ITEMS_PER_PAGE);
  const indexOfFirst = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageDocs    = processedDocs.slice(indexOfFirst, indexOfFirst + ITEMS_PER_PAGE);

  // ── Selection ────────────────────────────────────────────
  const toggleSelectAll = () =>
    setSelectedDocuments(
      selectedDocuments.length === pageDocs.length ? [] : pageDocs.map(d => d.id)
    );
  const toggleSelect = (id: string) =>
    setSelectedDocuments(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ── Sort helper ──────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field
      ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
      : <ChevronDown className="h-3 w-3 opacity-30" />;

  // ── Actions ──────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!globalThis.confirm('Delete this document?')) return;
    await documentsService.delete(id);
    load();
  };

  const handleBulkDelete = async () => {
    if (!globalThis.confirm(`Delete ${selectedDocuments.length} selected documents?`)) return;
    setIsBulkActing(true);
    try { await bulkService.deleteDocuments(selectedDocuments); } finally { setIsBulkActing(false); }
    load();
  };

  const handleBulkArchive = async () => {
    if (!globalThis.confirm(`Archive ${selectedDocuments.length} selected documents?`)) return;
    setIsBulkActing(true);
    try { await bulkService.archiveDocuments(selectedDocuments); } finally { setIsBulkActing(false); }
    load();
  };

  const handleBulkMove = async () => {
    setIsBulkActing(true);
    try {
      await bulkService.moveDocuments(selectedDocuments, moveTargetFolder || null);
      setIsMoveDialogOpen(false);
      setMoveTargetFolder('');
      window.dispatchEvent(new Event('folders-updated'));
    } finally { setIsBulkActing(false); }
    load();
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus) return;
    setIsBulkActing(true);
    try {
      await bulkService.updateDocuments(selectedDocuments, { status: bulkStatus });
      setIsUpdateDialogOpen(false);
      setBulkStatus('');
    } finally { setIsBulkActing(false); }
    load();
  };

  const handleDownloadZip = async () => {
    if (selectedDocuments.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      await Promise.all(
        selectedDocuments.map(async id => {
          const doc = documents.find(d => d.id === id);
          const { url } = await documentsService.getPresignedUrl(id);
          const res = await fetch(url);
          const blob = await res.blob();
          zip.file(doc?.file_name ?? `${id}.bin`, blob);
        })
      );
      const content = await zip.generateAsync({ type: 'blob' });
      const anchor = globalThis.document.createElement('a');
      anchor.href = URL.createObjectURL(content);
      anchor.download = `documents-${new Date().toISOString().slice(0, 10)}.zip`;
      anchor.click();
      URL.revokeObjectURL(anchor.href);
    } finally {
      setIsZipping(false);
    }
  };

  const handleToggleStar = async (id: string) => {
    await documentsService.toggleStar(id);
    load();
  };

  const handleDownload = (doc: BackendDocument) => {
    documentsService.download(doc.id, doc.file_name);
  };

  const resetFilters = () => {
    setSearchQuery(''); setSelectedFolder(''); setSelectedStatus('');
    setDateFrom(''); setDateTo(''); setFileType('');
  };

  // ── Row action menu ──────────────────────────────────────
  const ActionMenu = ({ doc }: { doc: BackendDocument }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleToggleStar(doc.id)} className="gap-2">
          <Star className={`h-4 w-4 ${doc.is_starred ? 'text-yellow-500 fill-yellow-500' : ''}`} />
          {doc.is_starred ? 'Remove star' : 'Add star'}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setSelectedDocuments([doc.id]);
            setMoveTargetFolder(doc.folder_id ?? '');
            setIsMoveDialogOpen(true);
          }}
          className="gap-2"
        >
          <FolderInput className="h-4 w-4" /> Move to Folder
        </DropdownMenuItem>
        {doc.folder_id && (
          <DropdownMenuItem
            onClick={async () => {
              await documentsService.moveToFolder(doc.id, null);
              window.dispatchEvent(new Event('folders-updated'));
              load();
            }}
            className="gap-2"
          >
            <FolderOpen className="h-4 w-4" /> Remove from Folder
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => handleDownload(doc)} className="gap-2">
          <Download className="h-4 w-4" /> Download
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/documents/${doc.id}/share`)} className="gap-2">
          <Share2 className="h-4 w-4" /> Share
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDelete(doc.id)} className="text-destructive gap-2">
          <Trash className="h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // ── Render ───────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
              <Files className="h-5 w-5 text-sky-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Loading…' : `${processedDocs.length} document${processedDocs.length !== 1 ? 's' : ''}${folders.length > 0 ? ` · ${folders.length} folder${folders.length !== 1 ? 's' : ''}` : ''}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center border rounded-md overflow-hidden">
              <Button
                variant="ghost" size="icon"
                className={`rounded-none h-8 w-8 ${viewMode === 'table' ? 'bg-primary/10 text-primary' : ''}`}
                onClick={() => setViewMode('table')}
                title="Table view"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost" size="icon"
                className={`rounded-none h-8 w-8 ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="ghost" size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-primary/10 text-primary' : ''}
              title="Filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <Button variant="outline" asChild>
              <Link to="/folders/root" className="flex items-center gap-2">
                <FolderPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Folders</span>
              </Link>
            </Button>
            <Button asChild>
              <Link to="/documents/new" className="flex items-center gap-2">
                <FilePlus className="h-4 w-4" />
                <span className="hidden sm:inline">Upload</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search documents..."
              className="pl-9 pr-10"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-4 border rounded-md bg-accent/20">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={selectedStatus || '__all__'} onValueChange={v => setSelectedStatus(v === '__all__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>File Type</Label>
                <Select value={fileTypeFilter || '__all__'} onValueChange={v => setFileType(v === '__all__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All types</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="word">Word (doc/docx)</SelectItem>
                    <SelectItem value="excel">Excel (xls/xlsx)</SelectItem>
                    <SelectItem value="ppt">PowerPoint</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="text">Text / Code</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Folder</Label>
                <Select value={selectedFolder || '__all__'} onValueChange={v => setSelectedFolder(v === '__all__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="All folders" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All folders</SelectItem>
                    {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Upload from</Label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Upload to</Label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <Select disabled>
                  <SelectTrigger><SelectValue placeholder={`${tags.length} tags available`} /></SelectTrigger>
                  <SelectContent>
                    {tags.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                          {t.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="ghost" onClick={resetFilters} className="gap-2">
                  <X className="h-4 w-4" /> Reset filters
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Bulk action bar */}
        {selectedDocuments.length > 0 && (
          <div className="bg-primary/5 p-2 rounded-md flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm px-2 font-medium">{selectedDocuments.length} selected</span>
            <div className="flex gap-1 flex-wrap">
              <Button variant="ghost" size="sm" onClick={handleBulkArchive} disabled={isBulkActing}>
                {isBulkActing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Archive className="h-4 w-4 mr-1" />}
                Archive
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsMoveDialogOpen(true)} disabled={isBulkActing}>
                <FolderInput className="h-4 w-4 mr-1" /> Move
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsUpdateDialogOpen(true)} disabled={isBulkActing}>
                <RefreshCw className="h-4 w-4 mr-1" /> Change Status
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDownloadZip} disabled={isBulkActing || isZipping}>
                {isZipping ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                Download ZIP
              </Button>
              <Button variant="ghost" size="sm" disabled={isBulkActing} onClick={handleBulkDelete}
                className="text-destructive hover:text-destructive">
                <Trash className="h-4 w-4 mr-1" /> Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDocuments([])}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Results count */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground">
            {processedDocs.length} document{processedDocs.length !== 1 ? 's' : ''}
            {(dateFrom || dateTo || fileTypeFilter) && ' (filtered)'}
          </p>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* ── TABLE VIEW ─────────────────────────────────── */}
        {!isLoading && viewMode === 'table' && (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedDocuments.length === pageDocs.length && pageDocs.length > 0}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="w-10" />
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center gap-1">Name <SortIcon field="title" /></div>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Folder</TableHead>
                  <TableHead
                    className="hidden md:table-cell cursor-pointer select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">Status <SortIcon field="status" /></div>
                  </TableHead>
                  <TableHead
                    className="hidden md:table-cell cursor-pointer select-none"
                    onClick={() => handleSort('file_size')}
                  >
                    <div className="flex items-center gap-1">Size <SortIcon field="file_size" /></div>
                  </TableHead>
                  <TableHead
                    className="hidden md:table-cell cursor-pointer select-none"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">Uploaded <SortIcon field="created_at" /></div>
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* ── Folder rows (always shown at top, no pagination) ── */}
                {folders.length > 0 && (
                  <>
                    <TableRow className="hover:bg-transparent pointer-events-none">
                      <TableCell colSpan={8} className="py-1 pb-0">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-1">Folders</span>
                      </TableCell>
                    </TableRow>
                    {folders
                      .filter(f => !selectedFolder || f.id === selectedFolder)
                      .map(folder => (
                        <TableRow
                          key={`folder-${folder.id}`}
                          className="cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-950/20 group"
                          onClick={() => { window.location.href = `/folders/${folder.id}`; }}
                        >
                          <TableCell />
                          <TableCell>
                            <FolderOpen className="h-4 w-4 text-amber-500" />
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-sm group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                              {folder.name}
                            </span>
                            {folder.document_count != null && (
                              <span className="ml-2 text-xs text-muted-foreground">{folder.document_count} docs</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm">—</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-xs text-muted-foreground">Folder</span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm">—</TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {folder.created_at ? new Date(folder.created_at).toLocaleDateString() : '—'}
                          </TableCell>
                          <TableCell>
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </TableCell>
                        </TableRow>
                      ))}
                    <TableRow className="hover:bg-transparent pointer-events-none">
                      <TableCell colSpan={8} className="py-1 pb-0">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-1">Documents</span>
                      </TableCell>
                    </TableRow>
                  </>
                )}
                {/* ── Document rows ── */}
                {pageDocs.length > 0 ? pageDocs.map(doc => (
                  <TableRow key={doc.id} className={selectedDocuments.includes(doc.id) ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedDocuments.includes(doc.id)}
                        onCheckedChange={() => toggleSelect(doc.id)}
                        aria-label={`Select ${doc.title}`}
                      />
                    </TableCell>
                    <TableCell><FileIcon fileName={doc.file_name} /></TableCell>
                    <TableCell>
                      <Link to={`/documents/${doc.id}`} className="font-medium hover:underline">
                        {doc.title}
                      </Link>
                      <div className="text-xs text-muted-foreground md:hidden">
                        {doc.folder_name || '—'} · {new Date(doc.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{doc.folder_name || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={STATUS_VARIANT[doc.status] ?? 'outline'} className="text-xs capitalize">
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{formatSize(doc.file_size)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell><ActionMenu doc={doc} /></TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center py-8">
                        <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                        <p className="text-lg font-medium">No documents found</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          {searchQuery || selectedFolder || selectedStatus || dateFrom || dateTo || fileTypeFilter
                            ? 'Try adjusting your filters'
                            : 'Upload your first document to get started'}
                        </p>
                        {!searchQuery && !selectedFolder && !selectedStatus && !dateFrom && !dateTo && !fileTypeFilter && (
                          <Button asChild>
                            <Link to="/documents/new">Upload Document</Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {processedDocs.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {indexOfFirst + 1}–{Math.min(indexOfFirst + ITEMS_PER_PAGE, processedDocs.length)} of {processedDocs.length}
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">{currentPage} / {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GRID VIEW ──────────────────────────────────── */}
        {!isLoading && viewMode === 'grid' && (
          <>
            {/* Folder cards */}
            {folders.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2 px-1">Folders</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
                  {folders
                    .filter(f => !selectedFolder || f.id === selectedFolder)
                    .map(folder => (
                      <Link
                        key={`folder-grid-${folder.id}`}
                        to={`/folders/${folder.id}`}
                        className="group border rounded-xl p-3 hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all bg-card flex flex-col gap-2"
                      >
                        <FolderOpen className="h-8 w-8 text-amber-500 group-hover:scale-110 transition-transform" />
                        <p className="text-xs font-semibold truncate">{folder.name}</p>
                        {folder.document_count != null && (
                          <p className="text-[10px] text-muted-foreground">{folder.document_count} docs</p>
                        )}
                        {folder.created_at && (
                          <p className="text-[10px] text-muted-foreground">{new Date(folder.created_at).toLocaleDateString()}</p>
                        )}
                      </Link>
                    ))}
                </div>
              </div>
            )}
            {folders.length > 0 && pageDocs.length > 0 && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2 px-1">Documents</p>
            )}
            {pageDocs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-3 opacity-40" />
                <p className="font-medium">No documents found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery || selectedFolder || selectedStatus || dateFrom || dateTo || fileTypeFilter
                    ? 'Try adjusting your filters'
                    : 'Upload your first document to get started'}
                </p>
              </div>
            )}
            {pageDocs.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {pageDocs.map(doc => (
                  <div
                    key={doc.id}
                    className={`group border rounded-lg p-3 hover:shadow-md transition-shadow bg-card relative flex flex-col gap-2 ${
                      selectedDocuments.includes(doc.id) ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <Checkbox
                        checked={selectedDocuments.includes(doc.id)}
                        onCheckedChange={() => toggleSelect(doc.id)}
                        aria-label={`Select ${doc.title}`}
                      />
                      <ActionMenu doc={doc} />
                    </div>

                    <Link to={`/documents/${doc.id}`} className="flex flex-col items-center gap-2 flex-1">
                      <FileIcon fileName={doc.file_name} size="lg" />
                      <p className="text-xs font-medium text-center line-clamp-2 leading-tight">{doc.title}</p>
                    </Link>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant={STATUS_VARIANT[doc.status] ?? 'outline'} className="text-[10px] px-1 py-0 capitalize">
                          {doc.status}
                        </Badge>
                        {doc.is_starred && <Star className="h-3 w-3 fill-amber-500 text-amber-500" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{formatSize(doc.file_size)}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {processedDocs.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Change Status dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change status for {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>New status</Label>
            <Select value={bulkStatus || '__pick__'} onValueChange={v => setBulkStatus(v === '__pick__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__pick__" disabled>Select a status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkUpdate} disabled={isBulkActing || !bulkStatus}>
              {isBulkActing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to Folder dialog */}
      <Dialog open={isMoveDialogOpen} onOpenChange={open => { setIsMoveDialogOpen(open); if (!open) setMoveTargetFolder(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderInput className="h-5 w-5 text-amber-500" />
              Move {selectedDocuments.length === 1 ? 'document' : `${selectedDocuments.length} documents`} to folder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Target folder</Label>
            <Select value={moveTargetFolder || '__root__'} onValueChange={v => setMoveTargetFolder(v === '__root__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select a folder" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__">
                  <span className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" /> Root (no folder)
                  </span>
                </SelectItem>
                {folders.map(f => (
                  <SelectItem key={f.id} value={f.id}>
                    <span className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-amber-500" /> {f.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkMove} disabled={isBulkActing}>
              {isBulkActing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default DocumentList;
