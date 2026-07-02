import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tagsService, documentsService, BackendTag } from '@/services';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tag as TagIcon, Plus, Trash2, Edit2, AlertCircle, FileText,
  Search, Hash, ArrowRight, Loader2,
} from 'lucide-react';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e',
];

const ColorPicker: React.FC<{ value: string; onChange: (c: string) => void }> = ({ value, onChange }) => (
  <div className="flex gap-2 flex-wrap">
    {PRESET_COLORS.map(c => (
      <button
        key={c}
        type="button"
        className={`h-7 w-7 rounded-full border-2 transition-all hover:scale-110 ${
          value === c ? 'border-foreground scale-110 shadow-md' : 'border-transparent'
        }`}
        style={{ backgroundColor: c }}
        onClick={() => onChange(c)}
        aria-label={c}
      />
    ))}
  </div>
);

const TagsManagement: React.FC = () => {
  const navigate = useNavigate();

  const [tags, setTags]           = useState<BackendTag[]>([]);
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch]       = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen]     = useState(false);
  const [editingTag, setEditingTag]     = useState<BackendTag | null>(null);

  const [newName, setNewName]         = useState('');
  const [newColor, setNewColor]       = useState('#3b82f6');
  const [dialogError, setDialogError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [allTags, allDocs] = await Promise.all([
          tagsService.list(),
          documentsService.list(),
        ]);
        setTags(allTags);

        const counts: Record<string, number> = {};
        await Promise.all(
          allDocs.map(async doc => {
            const docTags = await tagsService.getDocumentTags(doc.id);
            docTags.forEach(t => { counts[t.id] = (counts[t.id] ?? 0) + 1; });
          })
        );
        setDocCounts(counts);
      } catch {
        // degrade silently — counts stay at 0
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const filtered = tags.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const resetCreate = () => { setNewName(''); setNewColor('#3b82f6'); setDialogError(''); };

  const handleCreate = async () => {
    setDialogError('');
    if (!newName.trim()) { setDialogError('Please enter a tag name'); return; }
    if (tags.some(t => t.name.toLowerCase() === newName.trim().toLowerCase())) {
      setDialogError('A tag with this name already exists'); return;
    }
    setIsSubmitting(true);
    try {
      const created = await tagsService.create({ name: newName.trim(), color: newColor });
      setTags(prev => [...prev, created]);
      resetCreate();
      setIsCreateOpen(false);
      window.dispatchEvent(new Event('tags-updated'));
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : 'Failed to create tag');
    } finally { setIsSubmitting(false); }
  };

  const handleEdit = async () => {
    if (!editingTag) return;
    setDialogError('');
    if (!editingTag.name.trim()) { setDialogError('Please enter a tag name'); return; }
    if (tags.some(t => t.id !== editingTag.id && t.name.toLowerCase() === editingTag.name.trim().toLowerCase())) {
      setDialogError('A tag with this name already exists'); return;
    }
    setIsSubmitting(true);
    try {
      const updated = await tagsService.update(editingTag.id, { name: editingTag.name.trim(), color: editingTag.color });
      setTags(prev => prev.map(t => t.id === updated.id ? updated : t));
      setIsEditOpen(false);
      window.dispatchEvent(new Event('tags-updated'));
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : 'Failed to update tag');
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (tag: BackendTag) => {
    if (!globalThis.confirm(`Delete tag "${tag.name}"? It will be removed from all documents.`)) return;
    try {
      await tagsService.delete(tag.id);
      setTags(prev => prev.filter(t => t.id !== tag.id));
      window.dispatchEvent(new Event('tags-updated'));
    } catch (e) {
      globalThis.alert(e instanceof Error ? e.message : 'Failed to delete tag');
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
              <TagIcon className="h-5 w-5 text-pink-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Tags</h1>
              <p className="text-sm text-muted-foreground">
                {tags.length} {tags.length === 1 ? 'tag' : 'tags'} · organise documents by topic
              </p>
            </div>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={open => { setIsCreateOpen(open); if (!open) resetCreate(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                New Tag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Tag</DialogTitle>
                <DialogDescription>Add a new tag to organise your documents</DialogDescription>
              </DialogHeader>
              {dialogError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{dialogError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium text-white shadow-sm"
                    style={{ backgroundColor: newColor }}
                  >
                    <Hash className="h-3 w-3" />
                    {newName || 'preview'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tag-name">Name</Label>
                  <Input
                    id="tag-name"
                    placeholder="e.g. Invoices, Reports, HR"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Colour</Label>
                  <ColorPicker value={newColor} onChange={setNewColor} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button onClick={handleCreate} disabled={isSubmitting}>
                  {isSubmitting
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</>
                    : 'Create Tag'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── Search bar ── */}
        {tags.length > 0 && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search tags…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* ── Loading ── */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* ── Empty state ── */}
        {!isLoading && tags.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-4">
              <TagIcon className="h-8 w-8 text-pink-500" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No tags yet</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              Create tags to categorise your documents and find them faster.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create your first tag
            </Button>
          </div>
        )}

        {/* ── No search results ── */}
        {!isLoading && tags.length > 0 && filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No tags match <strong>"{search}"</strong>
          </div>
        )}

        {/* ── Tag grid ── */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(tag => {
              const count = docCounts[tag.id] ?? 0;
              return (
                <div
                  key={tag.id}
                  className="group relative rounded-2xl border bg-card overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer"
                  onClick={() => navigate(`/tags/${tag.id}`)}
                >
                  {/* coloured top stripe */}
                  <div className="h-1.5 w-full" style={{ backgroundColor: tag.color }} />

                  <div className="p-4 space-y-3">
                    {/* tag pill + action buttons */}
                    <div className="flex items-center justify-between">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white shadow-sm"
                        style={{ backgroundColor: tag.color }}
                      >
                        <Hash className="h-3 w-3" />
                        {tag.name}
                      </span>

                      <div
                        className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => { setEditingTag(tag); setDialogError(''); setIsEditOpen(true); }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:text-destructive"
                          onClick={() => handleDelete(tag)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* doc count */}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{count} {count === 1 ? 'document' : 'documents'}</span>
                    </div>

                    {/* created date */}
                    <p className="text-[11px] text-muted-foreground/70">
                      Created {new Date(tag.created_at).toLocaleDateString()}
                    </p>

                    {/* footer row */}
                    <div className="pt-1 flex items-center justify-between border-t">
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        style={{ borderColor: tag.color, color: tag.color }}
                      >
                        {count} docs
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 group-hover:text-foreground transition-colors">
                        View <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Edit dialog ── */}
        <Dialog open={isEditOpen} onOpenChange={open => { setIsEditOpen(open); setDialogError(''); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Tag</DialogTitle>
              <DialogDescription>Update tag name and colour</DialogDescription>
            </DialogHeader>
            {dialogError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{dialogError}</AlertDescription>
              </Alert>
            )}
            {editingTag && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: editingTag.color }}
                  >
                    <Hash className="h-3 w-3" />
                    {editingTag.name || 'preview'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editingTag.name}
                    onChange={e => setEditingTag({ ...editingTag, name: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') handleEdit(); }}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Colour</Label>
                  <ColorPicker
                    value={editingTag.color}
                    onChange={c => setEditingTag({ ...editingTag, color: c })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleEdit} disabled={isSubmitting}>
                {isSubmitting
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                  : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </MainLayout>
  );
};

export default TagsManagement;
