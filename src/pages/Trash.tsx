import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { trashService } from '@/services';
import type { BackendDocument } from '@/services';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Trash2, RotateCcw, FileText, AlertCircle, Loader2, PackageOpen,
} from 'lucide-react';
import { format } from 'date-fns';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: 'text-red-500',
  doc: 'text-blue-500', docx: 'text-blue-500',
  xls: 'text-green-500', xlsx: 'text-green-500',
  ppt: 'text-orange-500', pptx: 'text-orange-500',
};

const TrashPage: React.FC = () => {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<BackendDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [isEmptying, setIsEmptying] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setDocs(await trashService.list());
    } catch {
      setError('Failed to load trash');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRestore = async (id: string) => {
    setActionId(id);
    try {
      await trashService.restore(id);
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch {
      globalThis.alert('Failed to restore document');
    } finally {
      setActionId(null);
    }
  };

  const handlePurge = async (id: string, title: string) => {
    if (!globalThis.confirm(`Permanently delete "${title}"? This cannot be undone.`)) return;
    setActionId(id);
    try {
      await trashService.purge(id);
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch {
      globalThis.alert('Failed to delete document');
    } finally {
      setActionId(null);
    }
  };

  const handleEmpty = async () => {
    if (!globalThis.confirm(`Permanently delete all ${docs.length} documents in trash? This cannot be undone.`)) return;
    setIsEmptying(true);
    try {
      await trashService.empty();
      setDocs([]);
    } catch {
      globalThis.alert('Failed to empty trash');
    } finally {
      setIsEmptying(false);
    }
  };

  const ext = (doc: BackendDocument) => doc.file_name.split('.').pop()?.toLowerCase() ?? '';

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Recycle Bin</h1>
            <p className="text-muted-foreground mt-1">
              {docs.length > 0
                ? `${docs.length} deleted document${docs.length !== 1 ? 's' : ''}`
                : 'Deleted documents appear here'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/documents')}>
              All Documents
            </Button>
            {docs.length > 0 && (
              <Button variant="destructive" onClick={handleEmpty} disabled={isEmptying}>
                {isEmptying
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Emptying…</>
                  : <><Trash2 className="h-4 w-4 mr-2" />Empty Trash</>}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && docs.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <PackageOpen className="h-14 w-14 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold">Trash is empty</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Documents you delete will appear here before being permanently removed
              </p>
              <Button className="mt-6" variant="outline" onClick={() => navigate('/documents')}>
                Go to Documents
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && docs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Deleted Documents</CardTitle>
              <CardDescription>Restore documents or remove them permanently</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {docs.map(doc => {
                  const fileExt = ext(doc);
                  const isActing = actionId === doc.id;
                  return (
                    <div key={doc.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/40 transition-colors">
                      <FileText className={`h-9 w-9 shrink-0 ${FILE_TYPE_COLORS[fileExt] ?? 'text-muted-foreground'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">{doc.file_name}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{formatBytes(doc.file_size)}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">
                            Deleted {format(new Date(doc.updated_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs capitalize hidden sm:flex">
                          {fileExt || 'file'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isActing}
                          onClick={() => handleRestore(doc.id)}
                          title="Restore"
                        >
                          {isActing
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <><RotateCcw className="h-3.5 w-3.5 mr-1" />Restore</>}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isActing}
                          onClick={() => handlePurge(doc.id, doc.title)}
                          title="Delete permanently"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default TrashPage;
