import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Share2, Shield, Users } from 'lucide-react';

const PermissionsManagement: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/documents/${documentId}`)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Document
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold">Document Access</h1>
          <p className="text-muted-foreground mt-1">Control who can access this document</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role-Based Access
            </CardTitle>
            <CardDescription>
              Access is managed at the system level through user roles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <Users className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Admin</p>
                  <p className="text-sm text-muted-foreground">Full access — can view, edit, delete, and manage all documents</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <Users className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Editor</p>
                  <p className="text-sm text-muted-foreground">Can upload, edit, and manage their own documents</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Viewer</p>
                  <p className="text-sm text-muted-foreground">Read-only access to documents they have been granted access to</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              To manage user roles, go to <strong>User Management</strong>. To share this document with external users or generate access links, use <strong>Share Document</strong>.
            </p>
            <Button className="w-full" onClick={() => navigate(`/documents/${documentId}/share`)}>
              <Share2 className="h-4 w-4 mr-2" />
              Go to Share Document
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PermissionsManagement;
