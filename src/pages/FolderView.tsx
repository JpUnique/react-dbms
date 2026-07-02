import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { foldersService, documentsService, BackendFolder, BackendDocument } from '@/services';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Folder,
  ChevronRight,
  MoreHorizontal,
  FilePlus,
  FileText,
  Trash,
  Pencil,
  Loader2,
  FolderPlus,
} from 'lucide-react';

const ROOT_FOLDER: BackendFolder = {
  id: 'root',
  name: 'Root',
  parent_id: null,
  created_at: '',
  updated_at: '',
};

const FolderView: React.FC = () => {
  const { folderId = 'root' } = useParams<{ folderId: string }>();
  const navigate = useNavigate();

  const [currentFolder, setCurrentFolder] = useState<BackendFolder>(ROOT_FOLDER);
  const [childFolders, setChildFolders] = useState<BackendFolder[]>([]);
  const [folderDocs, setFolderDocs] = useState<BackendDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      if (folderId === 'root') {
        const [folders, docs] = await Promise.all([
          foldersService.list(null),
          documentsService.list(),
        ]);
        setCurrentFolder(ROOT_FOLDER);
        setChildFolders(folders);
        setFolderDocs(docs.filter(d => !d.folder_id));
      } else {
        const [folder, subfolders, docs] = await Promise.all([
          foldersService.get(folderId),
          foldersService.list(folderId),
          documentsService.list({ folder_id: folderId }),
        ]);
        setCurrentFolder(folder);
        setChildFolders(subfolders);
        setFolderDocs(docs);
      }
    } catch {
      // stay on current data
    } finally {
      setIsLoading(false);
    }
  }, [folderId]);

  useEffect(() => { load(); }, [load]);

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    setIsSubmitting(true);
    setActionError('');
    try {
      await foldersService.create({
        name: folderName.trim(),
        parent_id: folderId === 'root' ? null : folderId,
      });
      setFolderName('');
      setIsNewFolderDialogOpen(false);
      window.dispatchEvent(new Event('folders-updated'));
      load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to create folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenameFolder = async () => {
    if (!folderName.trim() || folderId === 'root') return;
    setIsSubmitting(true);
    setActionError('');
    try {
      await foldersService.update(folderId, { name: folderName.trim() });
      setIsRenameDialogOpen(false);
      window.dispatchEvent(new Event('folders-updated'));
      load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to rename folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (folderId === 'root') return;
    if (!globalThis.confirm(`Delete folder "${currentFolder.name}"? This cannot be undone.`)) return;
    try {
      await foldersService.delete(folderId);
      window.dispatchEvent(new Event('folders-updated'));
      const parentId = currentFolder.parent_id;
      navigate(parentId ? `/folders/${parentId}` : '/folders/root');
    } catch (e) {
      globalThis.alert(e instanceof Error ? e.message : 'Failed to delete folder');
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="h-100 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  const parentId = currentFolder.parent_id;
  const parentLink = parentId ? `/folders/${parentId}` : null;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/folders/root" className="hover:text-foreground">Root</Link>
          {folderId !== 'root' && (
            <>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-foreground">{currentFolder.name}</span>
            </>
          )}
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">{currentFolder.name}</h1>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { setFolderName(''); setIsNewFolderDialogOpen(true); }}>
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </Button>

            <Button asChild>
              <Link
                to="/documents/new"
                state={{ folderId: folderId === 'root' ? null : folderId }}
                className="flex items-center"
              >
                <FilePlus className="h-4 w-4 mr-2" />
                Upload
              </Link>
            </Button>

            {folderId !== 'root' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setFolderName(currentFolder.name); setIsRenameDialogOpen(true); }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDeleteFolder} className="text-destructive">
                    <Trash className="h-4 w-4 mr-2" />
                    Delete Folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Contents */}
        <Card>
          {(childFolders.length > 0 || folderDocs.length > 0) && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Modified</TableHead>
                  <TableHead className="hidden md:table-cell">Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parentLink && (
                  <TableRow>
                    <TableCell><Folder className="h-4 w-4 text-muted-foreground" /></TableCell>
                    <TableCell>
                      <Link to={parentLink} className="text-muted-foreground hover:text-foreground">..</Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">Folder</TableCell>
                    <TableCell className="hidden md:table-cell">—</TableCell>
                    <TableCell className="hidden md:table-cell">—</TableCell>
                  </TableRow>
                )}

                {childFolders.map(folder => (
                  <TableRow key={folder.id}>
                    <TableCell><Folder className="h-4 w-4 text-blue-500" /></TableCell>
                    <TableCell>
                      <Link to={`/folders/${folder.id}`} className="font-medium hover:underline">
                        {folder.name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">Folder</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {new Date(folder.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {folder.document_count ?? 0} items
                    </TableCell>
                  </TableRow>
                ))}

                {folderDocs.map(doc => {
                  const ext = doc.file_name.split('.').pop()?.toUpperCase() ?? '—';
                  return (
                    <TableRow key={doc.id}>
                      <TableCell><FileText className="h-4 w-4 text-gray-500" /></TableCell>
                      <TableCell>
                        <Link to={`/documents/${doc.id}`} className="font-medium hover:underline">
                          {doc.title}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{ext}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(doc.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {childFolders.length === 0 && folderDocs.length === 0 && (
            <div className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">This folder is empty</h3>
              <p className="text-muted-foreground mb-6">Upload documents or create subfolders to get started</p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => { setFolderName(''); setIsNewFolderDialogOpen(true); }}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Folder
                </Button>
                <Button asChild>
                  <Link to="/documents/new" state={{ folderId: folderId === 'root' ? null : folderId }}>
                    <FilePlus className="h-4 w-4 mr-2" />
                    Upload Document
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* New folder dialog */}
      <Dialog open={isNewFolderDialogOpen} onOpenChange={open => { setIsNewFolderDialogOpen(open); setActionError(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new folder</DialogTitle>
            <DialogDescription>Enter a name for the new folder inside "{currentFolder.name}"</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Input
              placeholder="Folder name"
              value={folderName}
              onChange={e => setFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); }}
              autoFocus
            />
            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isSubmitting}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreateFolder} disabled={!folderName.trim() || isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={open => { setIsRenameDialogOpen(open); setActionError(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Input
              placeholder="Folder name"
              value={folderName}
              onChange={e => setFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRenameFolder(); }}
              autoFocus
            />
            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isSubmitting}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleRenameFolder} disabled={!folderName.trim() || isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default FolderView;
