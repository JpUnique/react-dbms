import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { tagsService, BackendTag, BackendDocument } from '@/services';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft, FileText, Calendar, User, Loader2, AlertCircle,
  Hash, Tag as TagIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const FILE_ICON_COLOR: Record<string, string> = {
  pdf:  'text-red-500',
  doc:  'text-blue-600',
  docx: 'text-blue-600',
  xls:  'text-emerald-600',
  xlsx: 'text-emerald-600',
  ppt:  'text-orange-500',
  pptx: 'text-orange-500',
  txt:  'text-slate-500',
};

function fileColor(fileType: string) {
  const ext = fileType.split('/').pop()?.toLowerCase() ?? '';
  return FILE_ICON_COLOR[ext] ?? 'text-muted-foreground';
}

const STATUS_STYLE: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  draft:     'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  archived:  'bg-slate-100  text-slate-600  dark:bg-slate-800     dark:text-slate-400',
};

const TagView: React.FC = () => {
  const { tagId } = useParams<{ tagId: string }>();
  const navigate  = useNavigate();

  const [tag, setTag]           = useState<BackendTag | null>(null);
  const [docs, setDocs]         = useState<BackendDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!tagId) return;
    setIsLoading(true);
    setError('');

    Promise.all([
      tagsService.list(),
      tagsService.getDocumentsByTag(tagId),
    ])
      .then(([allTags, tagDocs]) => {
        const found = allTags.find(t => t.id === tagId);
        if (!found) { setError('Tag not found'); return; }
        setTag(found);
        setDocs(tagDocs);
      })
      .catch(() => setError('Failed to load tag'))
      .finally(() => setIsLoading(false));
  }, [tagId]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center gap-4 py-24">
          <Alert variant="destructive" className="max-w-sm">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => navigate('/tags')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tags
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${tag!.color}20` }}
              >
                <TagIcon className="h-5 w-5" style={{ color: tag!.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: tag!.color }}
                  >
                    <Hash className="h-3 w-3" />
                    {tag!.name}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {docs.length} {docs.length === 1 ? 'document' : 'documents'}
                </p>
              </div>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/tags">Manage Tags</Link>
          </Button>
        </div>

        {/* Empty */}
        {docs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border bg-card">
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: `${tag!.color}15` }}
            >
              <FileText className="h-8 w-8" style={{ color: tag!.color }} />
            </div>
            <h3 className="text-lg font-semibold mb-1">No documents yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              No documents have been tagged with <strong>"{tag!.name}"</strong> yet.
            </p>
            <Button asChild>
              <Link to="/documents/new">Upload Document</Link>
            </Button>
          </div>
        )}

        {/* Document list */}
        {docs.length > 0 && (
          <div className="rounded-2xl border bg-card overflow-hidden divide-y">
            {docs.map(doc => {
              const statusClass = STATUS_STYLE[doc.status] ?? STATUS_STYLE.draft;
              const sizeMB = (doc.file_size / 1024 / 1024).toFixed(2);
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 cursor-pointer transition-colors"
                  onClick={() => navigate(`/documents/${doc.id}`)}
                >
                  {/* Icon */}
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className={cn('h-5 w-5', fileColor(doc.file_type))} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.title}</p>
                    {doc.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{doc.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      {doc.owner_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> {doc.owner_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                      <span>{sizeMB} MB</span>
                    </div>
                  </div>

                  {/* Status */}
                  <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium capitalize shrink-0', statusClass)}>
                    {doc.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default TagView;
