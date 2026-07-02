import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { sharesService } from '@/services';
import type { BackendDocument } from '@/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BRANDING } from '@/config/branding';
import {
  FileText, Download, Loader2, AlertTriangle, Lock, Eye, EyeOff, Shield,
} from 'lucide-react';

type PageState = 'loading' | 'ready' | 'error' | 'downloading';

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const EXT_COLORS: Record<string, string> = {
  pdf:  'text-red-500',
  doc:  'text-blue-500', docx: 'text-blue-500',
  xls:  'text-green-500', xlsx: 'text-green-500',
  ppt:  'text-orange-500', pptx: 'text-orange-500',
};

const FileIcon = ({ fileName }: { fileName: string }) => {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return <FileText className={`h-16 w-16 ${EXT_COLORS[ext] ?? 'text-gray-400'}`} />;
};

const PublicShare: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [state, setState]       = useState<PageState>('loading');
  const [doc, setDoc]           = useState<BackendDocument | null>(null);
  const [permission, setPermission] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (!token) { setState('error'); setErrorMsg('Invalid share link.'); return; }
    sharesService.publicAccess(token)
      .then(res => {
        setDoc(res.document);
        setPermission(res.permission);
        setState('ready');
      })
      .catch(() => {
        setState('error');
        setErrorMsg('This share link is no longer available or has expired.');
      });
  }, [token]);

  const handleDownload = async () => {
    if (!token) return;
    setState('downloading');
    setPasswordError('');
    try {
      const { url, file_name } = await sharesService.publicDownload(token, password || undefined);
      const a = globalThis.document.createElement('a');
      a.href = url;
      a.download = file_name;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Download failed';
      if (msg.includes('password')) {
        setPasswordError('Incorrect password. Please try again.');
      } else if (msg.includes('not allowed')) {
        setPasswordError('Download is not permitted for this share.');
      } else {
        setPasswordError(msg);
      }
    } finally {
      setState('ready');
    }
  };

  const canDownload = permission === 'download' || permission === 'edit';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b px-6 py-4 flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg">{BRANDING.appName}</span>
        <Badge variant="secondary" className="text-xs">Shared Document</Badge>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        {state === 'loading' && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin" />
            <p>Loading shared document…</p>
          </div>
        )}

        {state === 'error' && (
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="flex justify-center mb-2">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle>Link unavailable</CardTitle>
              <CardDescription>{errorMsg}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The link may have expired or been revoked by the owner.
              </p>
            </CardContent>
          </Card>
        )}

        {(state === 'ready' || state === 'downloading') && doc && (
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-3">
                <FileIcon fileName={doc.file_name} />
              </div>
              <CardTitle className="text-xl">{doc.title}</CardTitle>
              {doc.description && (
                <CardDescription>{doc.description}</CardDescription>
              )}
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3 text-sm border rounded-lg p-4 bg-muted/30">
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">File name</p>
                  <p className="font-medium truncate">{doc.file_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Size</p>
                  <p className="font-medium">{formatSize(doc.file_size)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Type</p>
                  <p className="font-medium uppercase">{doc.file_name.split('.').pop()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Permission</p>
                  <Badge variant={canDownload ? 'default' : 'secondary'} className="text-xs capitalize">
                    {canDownload ? 'Download allowed' : 'View only'}
                  </Badge>
                </div>
              </div>

              {/* View-only message */}
              {!canDownload && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm">
                  <Eye className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-amber-700 dark:text-amber-400">
                    This share link is view-only. The owner has not granted download permission.
                  </p>
                </div>
              )}

              {/* Download section */}
              {canDownload && (
                <div className="space-y-3">
                  {/* Optional password field */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-sm">
                      <Lock className="h-3.5 w-3.5" />
                      Password (if required)
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Leave blank if no password"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
                        className={passwordError ? 'border-destructive pr-10' : 'pr-10'}
                        onKeyDown={e => { if (e.key === 'Enter') handleDownload(); }}
                      />
                      <button
                        type="button"
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(v => !v)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="text-xs text-destructive">{passwordError}</p>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleDownload}
                    disabled={state === 'downloading'}
                  >
                    {state === 'downloading'
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Preparing download…</>
                      : <><Download className="h-4 w-4 mr-2" /> Download {doc.file_name}</>
                    }
                  </Button>
                </div>
              )}

              <p className="text-xs text-center text-muted-foreground">
                Shared securely via {BRANDING.appName}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default PublicShare;
