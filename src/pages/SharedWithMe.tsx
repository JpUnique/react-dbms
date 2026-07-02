import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userSharesService } from '@/services';
import type { SharedDocument } from '@/services';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, Download, FileText, Loader2, AlertCircle, Users } from 'lucide-react';

const PERMISSION_CONFIG = {
  view:     { label: 'View only', icon: Eye,      color: 'text-blue-500' },
  download: { label: 'Download',  icon: Download, color: 'text-violet-500' },
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const SharedWithMe: React.FC = () => {
  const navigate = useNavigate();

  const [docs, setDocs] = useState<SharedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');

    userSharesService.sharedWithMe()
      .then(data => { if (!cancelled) setDocs(data); })
      .catch(() => { if (!cancelled) setError('Could not connect to the server. Check your connection.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, []);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-teal-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Shared with Me</h1>
            <p className="text-sm text-muted-foreground">Documents other people have shared directly with you</p>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && docs.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card p-8 flex flex-col items-center text-center gap-3">
            <div className="h-16 w-16 rounded-2xl bg-teal-500/10 flex items-center justify-center">
              <Users className="h-8 w-8 text-teal-500" />
            </div>
            <h3 className="text-lg font-semibold">No documents have been shared with you yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              When someone shares a document directly with your account, it'll show up here.
            </p>
          </div>
        )}

        {!isLoading && !error && docs.length > 0 && (
          <div className="space-y-3">
            {docs.map(doc => {
              const perm = PERMISSION_CONFIG[doc.permission] ?? PERMISSION_CONFIG.view;
              const PermIcon = perm.icon;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => navigate(`/documents/${doc.id}`)}
                  className="w-full text-left rounded-2xl border bg-card p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
                >
                  <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-teal-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{doc.title}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                      <span className={`inline-flex items-center gap-1 font-medium ${perm.color}`}>
                        <PermIcon className="h-3 w-3" />
                        {perm.label}
                      </span>
                      <span>Shared by {doc.shared_by_name}</span>
                      <span>{fmt(doc.shared_at)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default SharedWithMe;
