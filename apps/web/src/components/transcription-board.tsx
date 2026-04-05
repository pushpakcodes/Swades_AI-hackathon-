"use client";

import { useEffect, useRef } from "react";
import { useTranscriptions } from "@/hooks/use-transcriptions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@my-better-t-app/ui/components/card";
import { Button } from "@my-better-t-app/ui/components/button";
import { X, Trash2 } from "lucide-react";

function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
}

export function TranscriptionBoard({ sessionId }: { sessionId: string }) {
  const { transcriptions, deleteTranscription, clearTranscriptions } = useTranscriptions(sessionId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcriptions]);

  return (
    <Card className="w-full mt-6 h-96 flex flex-col">
      <CardHeader className="py-4 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-4">
            Live Transcription
            <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Real-time
            </span>
          </CardTitle>
          {transcriptions.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearTranscriptions} className="text-destructive h-8 px-2 gap-1.5">
              <Trash2 className="size-3" />
              Clear all
            </Button>
          )}
        </div>
        <CardDescription>Session ID: {sessionId}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {transcriptions.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic">
            Waiting for speakers...
          </div>
        ) : null}

        {transcriptions.map((t, index) => {
          const parsedLines = t.transcription.split('\n').filter(Boolean).map((line) => {
            const match = line.match(/^\[(.*?)\]:\s*(.*)$/);
            if (match) return { speaker: match[1], text: match[2] };
            return { speaker: t.speaker === "Multiple Speakers" ? "Unknown" : t.speaker, text: line };
          });

          return (
            <div key={t.id} className="flex flex-col animate-in fade-in slide-in-from-bottom-2 relative group gap-3 mb-2">
              {parsedLines.map((lineObj, i) => (
                <div key={`${t.id}-${i}`} className="flex flex-col relative">
                  <span className="text-xs font-semibold mb-1 flex items-center gap-2" style={{ color: stringToColor(lineObj.speaker) }}>
                    <span>{lineObj.speaker}</span>
                    {i === 0 && (
                      <>
                        <span className="text-[10px] text-muted-foreground font-normal border rounded px-1 hidden group-hover:inline-block transition-opacity">
                          Chunk #{index + 1}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-normal ml-auto">
                          {new Date(t.uploadedAt).toLocaleTimeString()}
                        </span>
                      </>
                    )}
                  </span>
                  <div className="bg-muted/40 border p-2.5 rounded-lg text-sm text-foreground shadow-sm relative w-fit min-w-[200px] max-w-[85%] pr-8">
                    {lineObj.text}
                    {i === 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTranscription(t.id)}
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        <div ref={bottomRef} className="h-1" />
      </CardContent>
    </Card>
  );
}
