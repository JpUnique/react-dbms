import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { departmentsService } from '@/services';
import type { BackendDocument } from '@/services';
import { DEPARTMENTS } from '@/config/departments';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Building2, ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const DEPT_COLORS = [
  'text-blue-500', 'text-violet-500', 'text-emerald-500', 'text-amber-500',
  'text-rose-500', 'text-teal-500', 'text-indigo-500', 'text-orange-500',
  'text-pink-500', 'text-cyan-500',
];

const Departments: React.FC = () => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);

  const [selected, setSelected] = useState<string | null>(null);
  const [documents, setDocuments] = useState<BackendDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    departmentsService.counts()
      .then(setCounts)
      .catch(() => setCounts({}))
      .finally(() => setIsLoadingCounts(false));
  }, []);

  const openDepartment = useCallback((dept: string) => {
    setSelected(dept);
    setIsLoadingDocs(true);
    setError('');
    departmentsService.listDocuments(dept)
      .then(({ documents }) => setDocuments(documents))
      .catch(() => setError('Failed to load documents for this department'))
      .finally(() => setIsLoadingDocs(false));
  }, []);

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Departments</h1>
            <p className="text-sm text-muted-foreground">
              Browse every document uploaded under each department, and who uploaded it
            </p>
          </div>
        </div>

        {!selected ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {DEPARTMENTS.map((dept, i) => (
              <Card
                key={dept}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openDepartment(dept)}
              >
                <CardContent className="p-4">
                  <div className={`text-sm font-medium ${DEPT_COLORS[i % DEPT_COLORS.length]}`}>{dept}</div>
                  <div className="mt-1 text-2xl font-bold">
                    {isLoadingCounts ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (counts[dept] ?? 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">documents</div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setSelected(null)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-lg font-semibold">{selected}</h2>
                  <Badge variant="secondary">{documents.length} document{documents.length === 1 ? '' : 's'}</Badge>
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              {isLoadingDocs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mb-2" />
                  <p className="text-sm">No documents uploaded under {selected} yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Uploaded by</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            {doc.title}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{doc.owner_name ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{formatBytes(doc.file_size)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(doc.updated_at), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default Departments;
