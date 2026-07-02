import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reviewsService, type DocumentReview } from '@/services';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ClipboardList, FileText, User, Clock, ArrowRight } from 'lucide-react';

const statusColor = (decision: DocumentReview['decision']) => {
  if (decision === 'approved') return 'bg-green-100 text-green-700 border-green-200';
  if (decision === 'rejected') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
};

const ReviewQueue: React.FC = () => {
  const [queue, setQueue] = useState<DocumentReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    reviewsService.pendingQueue()
      .then(setQueue)
      .catch(() => setQueue([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Documents awaiting your approval
            </p>
          </div>
          {queue.length > 0 && (
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {queue.length} pending
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : queue.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-lg mb-1">All caught up</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                No documents are waiting for review right now.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {queue.map(item => (
              <Card key={item.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{item.document_title ?? 'Untitled'}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize shrink-0 ${statusColor(item.decision)}`}
                      >
                        {item.decision}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {item.submitter_name ?? 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <Button asChild size="sm" variant="outline" className="shrink-0">
                    <Link to={`/documents/${item.document_id}`}>
                      Review
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ReviewQueue;
