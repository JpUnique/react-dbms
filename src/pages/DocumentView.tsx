import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  documentsService,
  tagsService,
  versionsService,
  commentsService,
  reviewsService,
  watchersService,
  BackendDocument,
  BackendTag,
  DocumentVersion,
  DocumentComment,
  DocumentReview,
  API_BASE_URL,
  tokenStorage,
} from '@/services';
import { useAuth } from '@/context/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import DocumentViewer from '@/components/document/DocumentViewer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Badge,
} from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText,
  ChevronRight,
  Download,
  Star,
  MoreHorizontal,
  Trash,
  Trash2,
  Clock,
  Tag as TagIcon,
  ArrowLeft,
  StarOff,
  Loader2,
  History,
  Upload,
  MessageSquare,
  Send,
  Eye,
  EyeOff,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const fileTypeIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const colors: Record<string, string> = {
    pdf: 'text-red-500',
    doc: 'text-blue-500', docx: 'text-blue-500',
    xls: 'text-green-500', xlsx: 'text-green-500',
    ppt: 'text-orange-500', pptx: 'text-orange-500',
  };
  return <FileText className={cn('h-12 w-12', colors[ext] ?? 'text-gray-500')} />;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString() + ' at ' +
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const DocumentView: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [doc, setDoc] = useState<BackendDocument | null>(null);
  const [docTags, setDocTags] = useState<BackendTag[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [allTags, setAllTags] = useState<BackendTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionNote, setVersionNote] = useState('');
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  const [reviews, setReviews] = useState<DocumentReview[]>([]);
  const [isWatching, setIsWatching] = useState(false);
  const [watcherCount, setWatcherCount] = useState(0);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (!documentId) return;
    setIsLoading(true);
    setPreviewUrl(null);
    Promise.allSettled([
      documentsService.get(documentId),
      tagsService.getDocumentTags(documentId),
      versionsService.list(documentId),
      tagsService.list(),
      commentsService.list(documentId),
      reviewsService.getByDocument(documentId),
      watchersService.status(documentId),
    ])
      .then(([docR, tagsR, versR, allR, cmtsR, revsR, watchR]) => {
        if (docR.status === 'rejected') { setDoc(null); return; }
        const document = docR.value;
        setDoc(document);
        if (tagsR.status === 'fulfilled') setDocTags(tagsR.value ?? []);
        if (versR.status === 'fulfilled') setVersions(versR.value ?? []);
        if (allR.status  === 'fulfilled') setAllTags(allR.value ?? []);
        if (cmtsR.status === 'fulfilled') setComments(cmtsR.value);
        if (revsR.status === 'fulfilled') setReviews(revsR.value);
        if (watchR.status === 'fulfilled') {
          setIsWatching(watchR.value.watching);
          setWatcherCount(watchR.value.watcher_count);
        }
        const token = tokenStorage.getAccessToken();
        if (token) setPreviewUrl(`${API_BASE_URL}/documents/${document.id}/stream?token=${token}`);
      })
      .finally(() => setIsLoading(false));
  }, [documentId]);

  const handleToggleStar = async () => {
    if (!doc) return;
    await documentsService.toggleStar(doc.id);
    setDoc(prev => prev ? { ...prev, is_starred: !prev.is_starred } : prev);
  };

  const handleDelete = async () => {
    if (!doc) return;
    await documentsService.delete(doc.id);
    setIsDeleteDialogOpen(false);
    navigate('/documents');
  };

  const handleDownload = () => {
    if (!doc) return;
    documentsService.download(doc.id, doc.file_name);
  };

  const handleAttachTag = async (tagId: string) => {
    if (!doc) return;
    await tagsService.attachToDocument(doc.id, tagId);
    const updated = await tagsService.getDocumentTags(doc.id);
    setDocTags(updated);
  };

  const loadPreview = () => {
    if (!doc || previewUrl) return;
    const token = tokenStorage.getAccessToken();
    if (token) setPreviewUrl(`${API_BASE_URL}/documents/${doc.id}/stream?token=${token}`);
  };

  const handleUploadVersion = async () => {
    if (!doc || !versionFile) return;
    setIsUploadingVersion(true);
    try {
      const newVersion = await versionsService.upload(doc.id, versionFile, versionNote || undefined);
      setVersions(prev => [newVersion, ...prev]);
      setIsVersionDialogOpen(false);
      setVersionFile(null);
      setVersionNote('');
    } catch (e) {
      globalThis.alert(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setIsUploadingVersion(false);
    }
  };

  const handleDetachTag = async (tagId: string) => {
    if (!doc) return;
    await tagsService.detachFromDocument(doc.id, tagId);
    setDocTags(prev => prev.filter(t => t.id !== tagId));
  };

  const handleAddComment = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!doc || !commentText.trim()) return;
    setIsPostingComment(true);
    try {
      const c = await commentsService.create(doc.id, commentText.trim());
      setComments(prev => [...prev, c]);
      setCommentText('');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!doc) return;
    await commentsService.remove(doc.id, commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  const handleToggleWatch = async () => {
    if (!doc) return;
    const { watching } = await watchersService.toggle(doc.id);
    setIsWatching(watching);
    setWatcherCount(prev => watching ? prev + 1 : Math.max(0, prev - 1));
  };

  const handleSubmitForReview = async () => {
    if (!doc) return;
    setIsSubmittingReview(true);
    try {
      const rev = await reviewsService.submit(doc.id);
      setReviews(prev => [rev, ...prev]);
      setDoc(prev => prev ? { ...prev, status: 'pending_review' } : prev);
    } catch (e) {
      globalThis.alert(e instanceof Error ? e.message : 'Failed to submit for review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleReviewDecision = async () => {
    if (!doc || !reviewAction) return;
    setIsSubmittingReview(true);
    try {
      const rev = reviewAction === 'approve'
        ? await reviewsService.approve(doc.id, reviewNote)
        : await reviewsService.reject(doc.id, reviewNote);
      setReviews(prev => [rev, ...prev]);
      setDoc(prev => prev ? { ...prev, status: reviewAction === 'approve' ? 'published' : 'draft' } : prev);
      setIsReviewDialogOpen(false);
      setReviewNote('');
      setReviewAction(null);
    } catch (e) {
      globalThis.alert(e instanceof Error ? e.message : 'Failed to submit decision');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const fileExt = doc?.file_name.split('.').pop() ?? '';
  const unattachedTags = allTags.filter(t => !docTags.some(dt => dt.id === t.id));

  if (isLoading) {
    return (
      <MainLayout>
        <div className="h-100 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!doc) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Document not found</h2>
          <p className="text-muted-foreground mb-6">The document you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/documents">Go to Documents</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-muted-foreground gap-1">
          <Button variant="ghost" size="sm" className="gap-1 px-1" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <ChevronRight className="h-4 w-4" />
          <Link to="/documents" className="hover:text-foreground transition-colors">Documents</Link>
          {doc.folder_name && doc.folder_id && (
            <>
              <ChevronRight className="h-4 w-4" />
              <Link to={`/folders/${doc.folder_id}`} className="hover:text-foreground transition-colors">
                {doc.folder_name}
              </Link>
            </>
          )}
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium truncate">{doc.title}</span>
        </div>

        {/* Header with actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {fileTypeIcon(doc.file_name)}
            <div>
              <h1 className="text-2xl font-bold">{doc.title}</h1>
              <p className="text-sm text-muted-foreground">
                Uploaded {formatDate(doc.created_at)} · {(doc.file_size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Watch toggle */}
            <Button variant="outline" size="sm" onClick={handleToggleWatch}
              className={isWatching ? 'text-primary border-primary/40' : ''}>
              {isWatching ? <EyeOff className="h-4 w-4 mr-1.5" /> : <Eye className="h-4 w-4 mr-1.5" />}
              {isWatching ? 'Unwatch' : 'Watch'}
              {watcherCount > 0 && (
                <span className="ml-1.5 flex items-center gap-0.5 text-muted-foreground text-xs">
                  <Users className="h-3 w-3" />{watcherCount}
                </span>
              )}
            </Button>

            {/* Owner: submit draft for review */}
            {currentUser?.id === doc.owner_id && doc.status === 'draft' && (
              <Button size="sm" variant="outline" onClick={handleSubmitForReview} disabled={isSubmittingReview}>
                {isSubmittingReview ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ClipboardCheck className="h-4 w-4 mr-1.5" />}
                Submit for Review
              </Button>
            )}

            {/* Admin: approve / reject when pending */}
            {currentUser?.role === 'admin' && doc.status === 'pending_review' && (
              <>
                <Button size="sm" variant="outline"
                  className="border-green-500/40 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                  onClick={() => { setReviewAction('approve'); setIsReviewDialogOpen(true); }}>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Approve
                </Button>
                <Button size="sm" variant="outline"
                  className="border-red-400/40 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={() => { setReviewAction('reject'); setIsReviewDialogOpen(true); }}>
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Reject
                </Button>
              </>
            )}

            <Button variant="outline" size="icon" onClick={handleToggleStar}>
              {doc.is_starred
                ? <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                : <StarOff className="h-4 w-4" />}
            </Button>

            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-destructive flex items-center gap-2"
                >
                  <Trash className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status & description */}
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="capitalize">{doc.status}</Badge>
          {doc.description && (
            <p className="text-sm text-muted-foreground">{doc.description}</p>
          )}
        </div>

        {/* Tags row */}
        {docTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {docTags.map(tag => (
              <div
                key={tag.id}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs cursor-pointer hover:opacity-70"
                style={{ backgroundColor: `${tag.color}20` }}
                onClick={() => handleDetachTag(tag.id)}
                title="Click to remove tag"
              >
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="preview" className="space-y-4" onValueChange={v => { if (v === 'preview') loadPreview(); }}>
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center gap-1">
              <TagIcon className="h-3.5 w-3.5" />
              Tags
              {docTags.length > 0 && (
                <span className="ml-1 bg-primary/10 text-primary text-xs px-1.5 rounded-full">
                  {docTags.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1">
              <History className="h-3.5 w-3.5" />
              History
              {versions.length > 0 && (
                <span className="ml-1 bg-primary/10 text-primary text-xs px-1.5 rounded-full">
                  {versions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              Comments
              {comments.length > 0 && (
                <span className="ml-1 bg-primary/10 text-primary text-xs px-1.5 rounded-full">
                  {comments.length}
                </span>
              )}
            </TabsTrigger>
            {reviews.length > 0 && (
              <TabsTrigger value="reviews" className="flex items-center gap-1">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Reviews
                <span className="ml-1 bg-primary/10 text-primary text-xs px-1.5 rounded-full">
                  {reviews.length}
                </span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="preview">
            <Card>
              <CardContent className="p-6">
                <DocumentViewer
                  fileType={fileExt}
                  previewUrl={previewUrl}
                  isLoading={isPreviewLoading}
                  onDownload={handleDownload}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tags">
            <Card>
              <CardHeader>
                <CardTitle>Manage Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {docTags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Applied tags</p>
                    <div className="flex flex-wrap gap-2">
                      {docTags.map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleDetachTag(tag.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs hover:opacity-70"
                          style={{ backgroundColor: `${tag.color}20` }}
                          title="Click to remove"
                        >
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                          {tag.name} ×
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {unattachedTags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Add tags</p>
                    <div className="flex flex-wrap gap-2">
                      {unattachedTags.map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleAttachTag(tag.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs border hover:opacity-70"
                        >
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                          {tag.name} +
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {allTags.length === 0 && (
                  <div className="text-center py-8">
                    <TagIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No tags available. Create tags in Tags Management.</p>
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link to="/tags">Manage Tags</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Version History</CardTitle>
                <Button size="sm" onClick={() => setIsVersionDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-1" />
                  Upload New Version
                </Button>
              </CardHeader>
              <CardContent>
                {versions.length > 0 && (
                  <div className="space-y-3">
                    {versions.map(v => (
                      <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">Version {v.version}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(v.created_at)}</span>
                          </div>
                          {v.uploaded_by_name && (
                            <p className="text-xs text-muted-foreground">by {v.uploaded_by_name}</p>
                          )}
                          {v.change_note && (
                            <p className="text-xs text-muted-foreground mt-0.5 italic">{v.change_note}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => versionsService.download(doc.id, v.id, doc.file_name)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {versions.length === 0 && (
                  <div className="text-center py-8">
                    <History className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No version history yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments">
            <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing comments */}
                {comments.length > 0 ? (
                  <div className="space-y-3">
                    {comments.map(c => (
                      <div key={c.id} className="flex gap-3 group">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                          {c.user_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{c.user_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {(currentUser?.id === c.user_id || currentUser?.role === 'admin') && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(c.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                aria-label="Delete comment"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                    <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment.</p>
                  </div>
                )}

                {/* New comment form */}
                <form onSubmit={handleAddComment} className="flex gap-2 pt-2 border-t">
                  <Textarea
                    placeholder="Add a comment…"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    rows={2}
                    className="resize-none"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleAddComment(e as unknown as React.SyntheticEvent<HTMLFormElement>);
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!commentText.trim() || isPostingComment}
                    className="shrink-0 self-end"
                    aria-label="Post comment"
                  >
                    {isPostingComment
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <Card>
              <CardHeader><CardTitle className="text-base">Review History</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {reviews.map(rev => (
                  <div key={rev.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                    <div className={cn(
                      'mt-0.5 h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-sm',
                      rev.decision === 'approved' ? 'bg-green-100 text-green-700' :
                      rev.decision === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    )}>
                      {rev.decision === 'approved' ? '✓' : rev.decision === 'rejected' ? '✗' : '…'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium capitalize">{rev.decision}</span>
                        {rev.reviewer_name && (
                          <span className="text-xs text-muted-foreground">by {rev.reviewer_name}</span>
                        )}
                        {rev.decision === 'pending' && (
                          <span className="text-xs text-muted-foreground">· submitted by {rev.submitter_name}</span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(rev.reviewed_at ?? rev.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {rev.note && <p className="text-sm text-muted-foreground mt-1">{rev.note}</p>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{doc.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isVersionDialogOpen} onOpenChange={open => { setIsVersionDialogOpen(open); if (!open) { setVersionFile(null); setVersionNote(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload New Version</DialogTitle>
            <DialogDescription>
              Replace the current file with a new version. The old file is preserved in history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">File</label>
              <Input
                type="file"
                onChange={e => setVersionFile(e.target.files?.[0] ?? null)}
                className="cursor-pointer"
              />
              {versionFile && (
                <p className="text-xs text-muted-foreground">{versionFile.name} — {(versionFile.size / 1024 / 1024).toFixed(2)} MB</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Change note (optional)</label>
              <Textarea
                placeholder="Describe what changed in this version…"
                value={versionNote}
                onChange={e => setVersionNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUploadVersion} disabled={!versionFile || isUploadingVersion}>
              {isUploadingVersion ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Review decision dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={open => { setIsReviewDialogOpen(open); if (!open) { setReviewNote(''); setReviewAction(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{reviewAction} document</DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve'
                ? 'Approving will publish this document and notify the owner.'
                : 'Rejecting will return this document to draft status and notify the owner.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              id="review-note"
              placeholder="Add a note (optional)…"
              value={reviewNote}
              onChange={e => setReviewNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleReviewDecision}
              disabled={isSubmittingReview}
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
            >
              {isSubmittingReview && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {reviewAction === 'approve' ? 'Approve & Publish' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default DocumentView;
