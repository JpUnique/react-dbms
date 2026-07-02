import React from 'react';
import { Button } from '@/components/ui/button';

interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
          <h2 className="text-xl font-semibold text-destructive">Something went wrong</h2>
          <pre className="text-xs text-muted-foreground bg-muted p-4 rounded-lg max-w-lg overflow-auto text-left">
            {this.state.error?.message}
          </pre>
          <Button onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/documents'; }}>
            Go to Documents
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
