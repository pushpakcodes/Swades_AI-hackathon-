"use client";

import { useState, useCallback } from "react";
import { Button } from "@my-better-t-app/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@my-better-t-app/ui/components/card";
import { TranscriptionBoard } from "@/components/transcription-board";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      // Simulate reading and chunking via OPFS
      const root = await navigator.storage.getDirectory();
      const uploadDir = await root.getDirectoryHandle("uploads", { create: true });
      
      const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);
        
        const chunkId = `upload-${file.name}-${i}-${Date.now()}`;
        const fileHandle = await uploadDir.getFileHandle(chunkId, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(chunkBlob);
        await writable.close();
        
        setProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
      
      alert("File successfully chunked into OPFS. The background uploader will pick it up!");
    } catch (e) {
      console.error(e);
      alert("Error processing file check console.");
    } finally {
      setUploading(false);
      setFile(null);
    }
  }, [file]);

  return (
    <div className="container mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Upload Audio File</CardTitle>
          <CardDescription>Upload an existing audio file for transcription</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
          
          {file && (
            <div className="text-sm font-mono p-2 bg-muted rounded">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
          
          <Button 
            onClick={handleUpload} 
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? `Processing... ${progress}%` : 'Process & Upload'}
          </Button>
        </CardContent>
      </Card>
      
      <TranscriptionBoard sessionId="session-current" />
    </div>
  );
}
