"use client";

import { useEffect, useRef, useState } from "react";

export function useUploader() {
  const [syncing, setSyncing] = useState(false);
  const [syncedCount, setSyncedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function syncChunks() {
      if (syncing) return;
      setSyncing(true);
      
      try {
        const root = await navigator.storage.getDirectory();
        const uploadDir = await root.getDirectoryHandle("uploads", { create: true });
        
        let pending = 0;
        const uploadTasks = [];
        
        for await (const [name, handle] of uploadDir.entries()) {
          if (handle.kind === "file") {
            pending++;
            uploadTasks.push(async () => {
              try {
                // 1. Get file
                const fileHandle = handle as FileSystemFileHandle;
                const file = await fileHandle.getFile();
                const chunkId = name.replace(".wav", "").replace(".raw", ""); // Strip extensions
                
                // 2. Upload file
                const formData = new FormData();
                formData.append("chunkId", chunkId);
                formData.append("sessionId", "session-current"); // Optional
                formData.append("file", file);
                
                const response = await fetch("http://localhost:3000/api/chunks/upload", {
                  method: "POST",
                  body: formData,
                });
                
                const result = await response.json();
                
                if (result.success) {
                  // 3. Delete from OPFS unconditionally on success
                  await uploadDir.removeEntry(name);
                  setSyncedCount((prev) => prev + 1);
                }
              } catch (err) {
                console.error("Failed to upload chunk:", name, err);
              }
            });
          }
        }
        
        setPendingCount(pending);
        
        // Run uploads sequentially to avoid blowing up the network
        for (const task of uploadTasks) {
          await task();
        }
        
      } catch (err) {
        console.error("Error accessing OPFS:", err);
      } finally {
        setSyncing(false);
      }
    }

    // Sync every 5 seconds
    timerRef.current = setInterval(syncChunks, 5000);
    syncChunks(); // Initial run

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { syncing, syncedCount, pendingCount };
}
