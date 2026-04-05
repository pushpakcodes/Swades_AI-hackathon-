"use client";

import { useEffect, useState } from "react";

export type TranscriptionRecord = {
  id: string;
  speaker: string;
  transcription: string;
  uploadedAt: string;
};

export function useTranscriptions(sessionId: string) {
  const [transcriptions, setTranscriptions] = useState<TranscriptionRecord[]>([]);

  useEffect(() => {
    let active = true;

    async function fetchTranscriptions() {
      if (!sessionId) return;
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
        const res = await fetch(`${baseUrl}/api/chunks/transcriptions?sessionId=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (active && data.transcriptions) {
            setTranscriptions(data.transcriptions);
          }
        }
      } catch (err) {
        console.error("Failed to fetch transcriptions", err);
      }
    }

    const timer = setInterval(fetchTranscriptions, 3000); // Poll every 3 seconds
    fetchTranscriptions();

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [sessionId]);

  const deleteTranscription = async (id: string) => {
    setTranscriptions((prev) => prev.filter((t) => t.id !== id));
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
      await fetch(`${baseUrl}/api/chunks/transcriptions/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error(err);
    }
  };

  const clearTranscriptions = async () => {
    setTranscriptions([]);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
      await fetch(`${baseUrl}/api/chunks/transcriptions/session/${sessionId}`, { method: "DELETE" });
    } catch (err) {
      console.error(err);
    }
  };

  return { transcriptions, deleteTranscription, clearTranscriptions };
}
