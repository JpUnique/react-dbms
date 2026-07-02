import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { documentsService } from '@/services';
import type { BackendDocument } from '@/services';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Search as SearchIcon } from 'lucide-react';
import { format } from 'date-fns';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: 'text-red-500',
  doc: 'text-blue-500', docx: 'text-blue-500',
  xls: 'text-green-500', xlsx: 'text-green-500',
  ppt: 'text-orange-500', pptx: 'text-orange-500',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  published: 'default',
  draft: 'secondary',
  archived: 'outline',
};

const Search: React.FC = () => {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';

  const [results, setResults] = useState<BackendDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setIsLoading(true);
    setSearched(false);
    documentsService
      .list({ search: q })
      .then(docs => {
        setResults(docs);
        setSearched(true);
      })
      .catch(() => {
        setResults([]);
        setSearched(true);
      })
      .finally(() => setIsLoading(false));
  }, [q]);

  const ext = (doc: BackendDocument) => doc.file_name.split('.').pop()?.toLowerCase() ?? '';

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Search Results</h1>
          {q && (
            <p className="text-muted-foreground mt-1">
              {isLoading
                ? `Searching for "${q}"…`
                : searched
                  ? `${results.length} result${results.length !== 1 ? 's' : ''} for "${q}"`
                  : `"${q}"`}
            </p>
          )}
          {!q && (
            <p className="text-muted-foreground mt-1">Enter a search term in the top bar to find documents</p>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && searched && results.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <SearchIcon className="h-14 w-14 mx-auto mb-4 text-muted-foreground opacity-40" />
              <h3 className="text-lg font-semibold">No documents found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                No results for "{q}". Try a different search term.
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && results.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {results.map(doc => {
                  const fileExt = ext(doc);
                  return (
                    <Link
                      key={doc.id}
                      to={`/documents/${doc.id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-muted/40 transition-colors group"
                    >
                      <FileText
                        className={`h-9 w-9 shrink-0 ${FILE_TYPE_COLORS[fileExt] ?? 'text-muted-foreground'}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {doc.title}
                        </p>
                        {doc.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{doc.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">{doc.file_name}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{formatBytes(doc.file_size)}</span>
                          {doc.owner_name && (
                            <>
                              <span className="text-xs text-muted-foreground">·</span>
                              <span className="text-xs text-muted-foreground">{doc.owner_name}</span>
                            </>
                          )}
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(doc.updated_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs capitalize hidden sm:flex">
                          {fileExt || 'file'}
                        </Badge>
                        <Badge variant={STATUS_VARIANT[doc.status] ?? 'outline'} className="text-xs capitalize hidden sm:flex">
                          {doc.status}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {!q && (
          <div className="text-center py-8">
            <SearchIcon className="h-14 w-14 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">Use the search bar at the top to find documents</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Search;
