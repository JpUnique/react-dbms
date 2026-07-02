import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { documentsService, BackendDocument } from '@/services';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, FileText, Loader2 } from 'lucide-react';

const fileTypeIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const colors: Record<string, string> = {
    pdf: 'text-red-500',
    doc: 'text-blue-500', docx: 'text-blue-500',
    xls: 'text-green-500', xlsx: 'text-green-500',
    ppt: 'text-orange-500', pptx: 'text-orange-500',
  };
  return <FileText className={`h-10 w-10 ${colors[ext] ?? 'text-gray-500'}`} />;
};

const DocumentCard: React.FC<{ doc: BackendDocument }> = ({ doc }) => (
  <Link to={`/documents/${doc.id}`}>
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {fileTypeIcon(doc.file_name)}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{doc.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(doc.created_at).toLocaleDateString()} • {(doc.file_size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </Link>
);

const RecentDocuments: React.FC = () => {
  const [documents, setDocuments] = useState<BackendDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    documentsService.list()
      .then(docs => {
        const sorted = [...docs].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setDocuments(sorted.slice(0, 20));
      })
      .catch(() => setError('Failed to load recent documents'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Clock className="h-8 w-8" />
              Recent Documents
            </h1>
            <p className="text-muted-foreground mt-1">Your most recently uploaded documents</p>
          </div>
          <Button asChild>
            <Link to="/documents/new">Upload New Document</Link>
          </Button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && error && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && documents.length > 0 && (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {documents.map(doc => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}

        {!isLoading && !error && documents.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No recent documents</h3>
              <p className="text-sm text-muted-foreground mb-4">Upload a document to see it here</p>
              <Button asChild>
                <Link to="/documents/new">Upload Document</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default RecentDocuments;
