"use client";

import { useUploader } from "@/hooks/use-uploader";

export function BackgroundUploader() {
  const { syncing, pendingCount } = useUploader();

  if (pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-muted text-muted-foreground text-xs px-3 py-1.5 rounded-full border shadow-sm z-50 flex items-center gap-2">
      {syncing ? (
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
        </span>
      ) : (
        <span className="h-2 w-2 rounded-full bg-muted-foreground/30"></span>
      )}
      Syncing {pendingCount} chunk(s)...
    </div>
  );
}
