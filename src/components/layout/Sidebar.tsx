import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { foldersService, tagsService } from '@/services';
import type { BackendFolder, BackendTag } from '@/services';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Files, FolderOpen, Database, PlusCircle,
  ChevronRight, ChevronDown, UsersRound, Bookmark, History,
  Menu, X, Trash2, Shield, Settings2, LayoutDashboard, ClipboardCheck,
  Share2, Tag, LayoutGrid, UserCog, MessageSquare, BarChart3, Link2,
  Search, Building2,
} from 'lucide-react';

// ── Sub-components defined outside Sidebar to avoid re-definition on every render ──

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="px-3 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
    {children}
  </p>
);

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  iconColor?: string; // tailwind color class applied when inactive, e.g. "text-blue-500"
  label: string;
  count?: number;
  isAdmin?: boolean;
  userRole?: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon: Icon, iconColor, label, count, isAdmin, userRole }) => {
  const location = useLocation();
  if (isAdmin && userRole !== 'admin') return null;
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <span className={cn(
        'flex items-center justify-center h-6 w-6 rounded-md shrink-0 transition-colors',
        isActive ? 'bg-primary-foreground/15' : ''
      )}>
        <Icon size={15} className={isActive ? undefined : iconColor} />
      </span>
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && (
        <Badge variant={isActive ? 'secondary' : 'outline'} className="text-[10px] h-4 px-1.5">
          {count}
        </Badge>
      )}
    </Link>
  );
};

interface FolderTreeProps {
  folders: BackendFolder[];
  expandedFolders: string[];
  toggleFolder: (id: string) => void;
  depth?: number;
  parentId?: string | null;
}

const FolderTree: React.FC<FolderTreeProps> = ({
  folders, expandedFolders, toggleFolder, depth = 0, parentId = null,
}) => {
  const location = useLocation();
  const children = folders.filter(f => (f.parent_id ?? null) === parentId);

  return (
    <>
      {children.map(folder => {
        const isExpanded = expandedFolders.includes(folder.id);
        const hasChildren = folders.some(f => (f.parent_id ?? null) === folder.id);
        const isActive = location.pathname === `/folders/${folder.id}`;

        let expandIcon: React.ReactNode;
        if (!hasChildren) {
          expandIcon = <span className="w-3" />;
        } else if (isExpanded) {
          expandIcon = <ChevronDown size={12} className="text-muted-foreground" />;
        } else {
          expandIcon = <ChevronRight size={12} className="text-muted-foreground" />;
        }

        return (
          <div key={folder.id} style={{ paddingLeft: depth > 0 ? `${depth * 12}px` : undefined }}>
            <div
              className={cn(
                'flex items-center gap-1.5 py-1 px-1 rounded-md text-sm transition-colors',
                isActive ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
              )}
            >
              <button
                type="button"
                aria-label={isExpanded ? `Collapse ${folder.name}` : `Expand ${folder.name}`}
                className="p-0.5 hover:bg-primary/10 rounded shrink-0"
                onClick={() => toggleFolder(folder.id)}
              >
                {expandIcon}
              </button>
              <Link
                to={`/folders/${folder.id}`}
                className="flex items-center gap-1.5 flex-1 min-w-0 py-0.5"
                onClick={e => e.stopPropagation()}
              >
                <FolderOpen size={14} className="text-amber-500 shrink-0" />
                <span className="truncate text-xs">{folder.name}</span>
                {!!folder.document_count && (
                  <span className="text-[10px] text-muted-foreground ml-auto pr-1">{folder.document_count}</span>
                )}
              </Link>
            </div>
            {isExpanded && (
              <FolderTree
                folders={folders}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                depth={depth + 1}
                parentId={folder.id}
              />
            )}
          </div>
        );
      })}
    </>
  );
};

// ── Main Sidebar ─────────────────────────────────────────────────────────────

const Sidebar = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [folders, setFolders] = useState<BackendFolder[]>([]);
  const [tags, setTags] = useState<BackendTag[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const refreshTags    = () => tagsService.list().then(setTags).catch(() => {});
  const refreshFolders = () => foldersService.list().then(setFolders).catch(() => {});

  useEffect(() => {
    refreshFolders();
    refreshTags();
  }, []);

  useEffect(() => {
    window.addEventListener('tags-updated',    refreshTags);
    window.addEventListener('folders-updated', refreshFolders);
    return () => {
      window.removeEventListener('tags-updated',    refreshTags);
      window.removeEventListener('folders-updated', refreshFolders);
    };
  }, []);

  useEffect(() => { setIsMobileOpen(false); }, [location.pathname]);

  const toggleFolder = (id: string) =>
    setExpandedFolders(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );

  const role = currentUser?.role;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-card border-r">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-linear-to-br from-primary to-primary/75 flex items-center justify-center shrink-0 shadow-sm">
            <Database className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-base tracking-tight">PetroData</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-7 w-7"
          onClick={() => setIsMobileOpen(false)}
        >
          <X size={16} />
        </Button>
      </div>

      {/* Upload CTA */}
      <div className="px-3 pb-3">
        <Button className="w-full gap-2 shadow-sm" asChild size="sm">
          <Link to="/documents/new">
            <PlusCircle size={15} />
            New Document
          </Link>
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        <SectionLabel>Main</SectionLabel>
        <div className="space-y-0.5">
          <NavItem to="/"                    icon={LayoutDashboard} iconColor="text-blue-500"   label="Dashboard"         userRole={role} />
          <NavItem to="/documents"           icon={Files}           iconColor="text-sky-500"   label="Documents"         userRole={role} />
          <NavItem to="/documents/browse"    icon={LayoutGrid}      iconColor="text-cyan-500"  label="Browse Documents"  userRole={role} />
          <NavItem to="/tags"                icon={Tag}             iconColor="text-pink-500"  label="Tags"              userRole={role} />
          <NavItem to="/starred"             icon={Bookmark}        iconColor="text-amber-500" label="Starred"           userRole={role} />
          <NavItem to="/recent"              icon={History}         iconColor="text-violet-500" label="Recent"           userRole={role} />
          <NavItem to="/trash"               icon={Trash2}          iconColor="text-red-500"   label="Trash"             userRole={role} />
          <NavItem to="/search"              icon={Search}          iconColor="text-lime-500"  label="Indexing"          userRole={role} />
        </div>

        <NavItem to="/chat" icon={MessageSquare} iconColor="text-violet-500" label="AI Chat" userRole={role} />

        <SectionLabel>Team</SectionLabel>
        <div className="space-y-0.5">
          <NavItem to="/users"            icon={UserCog}    iconColor="text-indigo-500"  label="User Management" isAdmin userRole={role} />
          <NavItem to="/collaborators"    icon={UsersRound} iconColor="text-emerald-500" label="Collaborators"   isAdmin userRole={role} />
          <NavItem to="/documents/shared" icon={Share2}     iconColor="text-teal-500"    label="Shared with Me"  userRole={role} />
          <NavItem to="/share-links"      icon={Link2}      iconColor="text-cyan-500"    label="My Share Links"  userRole={role} />
        </div>

        {role === 'admin' && (
          <>
            <SectionLabel>Admin</SectionLabel>
            <div className="space-y-0.5">
              <NavItem to="/departments"   icon={Building2}      iconColor="text-blue-500"    label="Departments"  isAdmin userRole={role} />
              <NavItem to="/review-queue" icon={ClipboardCheck} iconColor="text-purple-500"  label="Review Queue" isAdmin userRole={role} />
              <NavItem to="/audit"        icon={Shield}         iconColor="text-orange-500"  label="Audit Log"    isAdmin userRole={role} />
              <NavItem to="/reports"      icon={BarChart3}      iconColor="text-fuchsia-500" label="Reports"      isAdmin userRole={role} />
            </div>
          </>
        )}

        {folders.length > 0 && (
          <>
            <SectionLabel>Folders</SectionLabel>
            <div className="space-y-0.5 mb-1">
              <Link
                to="/folders/root"
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                  location.pathname === '/folders/root'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent'
                )}
              >
                <FolderOpen size={13} className="text-amber-500" />
                <span>All Files</span>
              </Link>
              <FolderTree
                folders={folders}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
              />
            </div>
          </>
        )}

        {tags.length > 0 && (
          <>
            <SectionLabel>
              <span className="flex items-center justify-between">
                Tags
                <Link to="/tags" className="text-primary normal-case tracking-normal font-medium hover:underline">
                  Manage
                </Link>
              </span>
            </SectionLabel>
            <div className="space-y-0.5 mb-4">
              {tags.map(tag => (
                <Link
                  key={tag.id}
                  to={`/tags/${tag.id}`}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                    location.pathname === `/tags/${tag.id}`
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent'
                  )}
                >
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                  <span className="truncate">{tag.name}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </ScrollArea>

      {/* Bottom: settings + profile */}
      <div className="border-t px-2 py-2 space-y-0.5">
        <Link
          to="/settings"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
            location.pathname === '/settings'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Settings2 size={16} className={location.pathname === '/settings' ? undefined : 'text-slate-500'} />
          <span>Settings</span>
        </Link>

        {currentUser && (
          <Link
            to="/profile"
            className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-accent transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-primary">
                {currentUser.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate leading-tight">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground truncate leading-tight">{currentUser.email}</p>
            </div>
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      {!isMobileOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-3 left-3 z-50 md:hidden h-9 w-9 bg-card border shadow-sm"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </Button>
      )}

      {/* Mobile overlay backdrop */}
      {isMobileOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 md:hidden',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Navigation"
      >
        {sidebarContent}
      </aside>

      {/* Desktop static sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col h-screen sticky top-0" aria-label="Navigation">
        {sidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;
