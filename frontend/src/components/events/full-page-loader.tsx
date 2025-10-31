'use client';

import Loader2 from 'lucide-react/icons/loader-2';

export function FullPageLoader() {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading event details...</p>
      </div>
    </div>
  );
}
