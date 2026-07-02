import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsService, foldersService, BackendFolder } from '@/services';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  FileText, FileImage, FileSpreadsheet, Presentation,
  Upload, X, AlertCircle, FolderOpen, ShieldCheck, ShieldAlert,
  Loader2, CheckCircle2, ArrowLeft, FilePlus2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Security pre-flight ───────────────────────────────────────────────────────

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'com', 'dll', 'sys', 'drv', 'ocx',
  'sh', 'bash', 'zsh', 'fish', 'csh', 'ps1', 'psm1', 'psd1',
  'vbs', 'vbe', 'jse', 'wsf', 'wsh', 'msi', 'msp', 'msu',
  'scr', 'pif', 'reg', 'jar', 'class', 'hta',
]);

async function hasDangerousMagicBytes(file: File): Promise<boolean> {
  const buf = await file.slice(0, 4).arrayBuffer();
  const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return ['4d5a', '7f454c46', 'cafebabe', 'feedface', 'feedfacf', 'cefaedfe', 'cffaedfe']
    .some(sig => hex.startsWith(sig));
}

interface FileValidation { file: File; error?: string }

async function validateFiles(files: File[]): Promise<FileValidation[]> {
  return Promise.all(files.map(async file => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (BLOCKED_EXTENSIONS.has(ext))
      return { file, error: `".${ext}" files are not permitted` };
    if (file.size > MAX_FILE_SIZE)
      return { file, error: `Exceeds 50 MB (${(file.size / 1048576).toFixed(1)} MB)` };
    if (await hasDangerousMagicBytes(file))
      return { file, error: 'Executable content detected' };
    return { file };
  }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
};

const FileTypeIcon = ({ name, className }: { name: string; className?: string }) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext))
    return <FileImage className={cn('text-purple-500', className)} />;
  if (['xls', 'xlsx', 'csv'].includes(ext))
    return <FileSpreadsheet className={cn('text-green-600', className)} />;
  if (['ppt', 'pptx'].includes(ext))
    return <Presentation className={cn('text-orange-500', className)} />;
  if (['pdf'].includes(ext))
    return <FileText className={cn('text-red-500', className)} />;
  if (['doc', 'docx', 'txt', 'md'].includes(ext))
    return <FileText className={cn('text-blue-500', className)} />;
  return <FileText className={cn('text-slate-400', className)} />;
};

const EXT_COLOR: Record<string, string> = {
  pdf: 'bg-red-100 text-red-700', doc: 'bg-blue-100 text-blue-700',
  docx: 'bg-blue-100 text-blue-700', xls: 'bg-green-100 text-green-700',
  xlsx: 'bg-green-100 text-green-700', ppt: 'bg-orange-100 text-orange-700',
  pptx: 'bg-orange-100 text-orange-700', png: 'bg-purple-100 text-purple-700',
  jpg: 'bg-purple-100 text-purple-700', jpeg: 'bg-purple-100 text-purple-700',
};

// ─────────────────────────────────────────────────────────────────────────────

const NO_FOLDER = '__none__';

const DocumentUpload: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [folders, setFolders] = useState<BackendFolder[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [validations, setValidations] = useState<FileValidation[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState(NO_FOLDER);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    foldersService.list().then(setFolders).catch(() => {});
  }, []);

  const applyFiles = useCallback(async (selected: File[]) => {
    setFiles(selected);
    setError('');
    if (selected.length === 1 && !title) setTitle(selected[0].name.replace(/\.[^.]+$/, ''));
    setIsScanning(true);
    const results = await validateFiles(selected);
    setValidations(results);
    setIsScanning(false);
  }, [title]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0)
      void applyFiles(Array.from(e.target.files));
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0)
      void applyFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (idx: number) => {
    const next = files.filter((_, i) => i !== idx);
    const nextV = validations.filter((_, i) => i !== idx);
    setFiles(next);
    setValidations(nextV);
    if (next.length === 0 && fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (files.length === 0) { setError('Please select at least one file'); return; }
    if (!title.trim()) { setError('Please enter a title'); return; }
    const blocked = validations.filter(v => v.error);
    if (blocked.length) { setError(`${blocked.length} file(s) failed security check`); return; }

    setError('');
    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        await documentsService.upload(files[i], {
          title: files.length === 1 ? title.trim() : files[i].name.replace(/\.[^.]+$/, ''),
          description: description.trim() || undefined,
          folder_id: folderId !== NO_FOLDER ? folderId : undefined,
          status,
        });
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }
      navigate('/documents');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const blockedCount = validations.filter(v => v.error).length;
  const allClean    = validations.length > 0 && blockedCount === 0;
  const totalSize   = files.reduce((s, f) => s + f.size, 0);
  const canSubmit   = files.length > 0 && !isUploading && !isScanning && blockedCount === 0;

  // Status banner ── extracted from nested ternaries to keep JSX readable
  const bannerClass = isScanning || blockedCount === 0
    ? 'bg-muted text-muted-foreground'
    : allClean
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
      : 'bg-destructive/10 text-destructive';

  const bannerContent = isScanning
    ? <><Loader2 className="h-4 w-4 animate-spin" />Scanning {files.length} file{files.length > 1 ? 's' : ''}…</>
    : allClean
      ? <><ShieldCheck className="h-4 w-4" />All files passed security check</>
      : blockedCount > 0
        ? <><ShieldAlert className="h-4 w-4" />{blockedCount} file{blockedCount > 1 ? 's' : ''} blocked — remove to continue</>
        : null;

  const submitLabel = isUploading
    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</>
    : isScanning
      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scanning…</>
      : <><Upload className="h-4 w-4 mr-2" />{files.length > 1 ? `Upload ${files.length} Files` : 'Upload Document'}</>;

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6 pb-10">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Upload Document</h1>
            <p className="text-muted-foreground text-sm">Files are scanned before upload · Max 50 MB each</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Drop zone ─────────────────────────────── */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload files"
            className={cn(
              'relative border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer',
              dragActive
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30',
              files.length > 0 && 'border-solid border-border bg-card',
            )}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
            onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              id="file-upload-input"
              type="file"
              className="hidden"
              multiple
              onChange={handleFileChange}
            />

            {files.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <FilePlus2 className="h-8 w-8 text-primary" />
                </div>
                <p className="font-semibold text-base">Drop files here or click to browse</p>
                <p className="text-sm text-muted-foreground mt-1">PDF, Word, Excel, PowerPoint, images and more</p>
                <Button type="button" size="sm" className="mt-5 pointer-events-none gap-2">
                  <Upload className="h-4 w-4" />
                  Choose Files
                </Button>
              </div>
            ) : (
              /* File list */
              <div className="p-4 space-y-3" onClick={e => e.stopPropagation()}>
                {/* Scan / status banner */}
                <div className={cn('flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg', bannerClass)}>
                  {bannerContent}
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    {files.length} file{files.length > 1 ? 's' : ''} · {fmtSize(totalSize)}
                  </span>
                </div>

                {/* Individual file rows */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {files.map((file, idx) => {
                    const v = validations[idx];
                    const ext = file.name.split('.').pop()?.toUpperCase() ?? '';
                    return (
                      <div
                        key={`${file.name}-${idx}`}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border bg-background',
                          v?.error ? 'border-destructive/40 bg-destructive/5' : 'border-border',
                        )}
                      >
                        <FileTypeIcon name={file.name} className="h-8 w-8 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{fmtSize(file.size)}</span>
                            {ext && (
                              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', EXT_COLOR[ext.toLowerCase()] ?? 'bg-muted text-muted-foreground')}>
                                {ext}
                              </span>
                            )}
                            {v?.error && (
                              <span className="text-xs text-destructive truncate">· {v.error}</span>
                            )}
                          </div>
                        </div>
                        {v && !v.error && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                        {v?.error && <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />}
                        <button
                          type="button"
                          className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                          onClick={() => removeFile(idx)}
                          aria-label="Remove file"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Add more files */}
                <button
                  type="button"
                  className="w-full text-xs text-muted-foreground hover:text-foreground border border-dashed rounded-lg py-2 transition-colors hover:border-primary/40"
                  onClick={() => fileInputRef.current?.click()}
                >
                  + Add more files
                </button>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* ── Metadata ──────────────────────────────── */}
          <div className="space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Document Details</h2>

            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Give this document a name"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="folder">
                  <FolderOpen className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                  Folder
                </Label>
                <Select value={folderId} onValueChange={setFolderId}>
                  <SelectTrigger id="folder">
                    <SelectValue placeholder="No folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_FOLDER}>No folder</SelectItem>
                    {folders.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Publish status</Label>
                <Select value={status} onValueChange={v => setStatus(v as 'draft' | 'published')}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
                        Draft
                      </div>
                    </SelectItem>
                    <SelectItem value="published">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                        Published
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What is this document about?"
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          {/* ── Upload progress ────────────────────────── */}
          {isUploading && files.length > 1 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading…</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1.5" />
            </div>
          )}

          {/* ── Actions ───────────────────────────────── */}
          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isUploading}>
              Cancel
            </Button>

            <div className="flex items-center gap-3">
              {allClean && (
                <Badge variant="secondary" className="text-emerald-600 bg-emerald-50 border-emerald-200 gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {files.length} file{files.length > 1 ? 's' : ''} clean
                </Badge>
              )}
              <Button type="submit" disabled={!canSubmit} className="min-w-32">
                {submitLabel}
              </Button>
            </div>
          </div>

        </form>
      </div>
    </MainLayout>
  );
};

export default DocumentUpload;
