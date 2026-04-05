import { serve } from "@hono/node-server";
import { env } from "@my-better-t-app/env/server";
import { createClient } from "@deepgram/sdk";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { db, chunks } from "@my-better-t-app/db";
import { eq } from "drizzle-orm";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
  }),
);

app.get("/", (c) => {
  return c.text("OK");
});

// Setup mock bucket directory
const UPLOADS_DIR = join(process.cwd(), "uploads");
if (!existsSync(UPLOADS_DIR)) {
  mkdir(UPLOADS_DIR, { recursive: true }).catch(console.error);
}

app.post("/api/chunks/upload", async (c) => {
  try {
    const body = await c.req.parseBody();
    const chunkId = body["chunkId"];
    const sessionId = (body["sessionId"] as string) || "default-session";
    const file = body["file"];

    if (!chunkId || typeof chunkId !== "string" || !(file instanceof File)) {
      return c.json({ error: "Invalid payload" }, 400);
    }

    // 1. Save to "Bucket"
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(UPLOADS_DIR, `${chunkId}.wav`), buffer);

    // 2. Transcribe (Actual Deepgram logic)
    let finalSpeaker = "Speaker";
    let finalText = `Transcription failed for chunk ${chunkId}`;

    try {
      if (!env.DEEPGRAM_API_KEY) {
        throw new Error("Missing DEEPGRAM_API_KEY");
      }
      const deepgram = createClient(env.DEEPGRAM_API_KEY);

      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        buffer,
        {
          model: "nova-2",
          smart_format: true,
          diarize: true,
          punctuate: true,
          utterances: true,
        }
      );

      if (error) {
        console.error("Deepgram Error:", error);
      } else if (result?.results?.channels?.[0]?.alternatives?.[0]) {
        const alt = result.results.channels[0].alternatives[0];

        if (alt.words && alt.words.length > 0) {
          let currentSpeaker = alt.words[0]?.speaker ?? 0;
          let currentPhrase = "";
          const transcriptLines = [];

          for (const word of alt.words) {
            const wordSpeaker = word.speaker ?? 0;
            if (wordSpeaker !== currentSpeaker) {
              transcriptLines.push(`[User ${currentSpeaker + 1}]: ${currentPhrase.trim()}`);
              currentSpeaker = wordSpeaker;
              currentPhrase = "";
            }
            currentPhrase += word.punctuated_word + " ";
          }

          // Push the final segment
          if (currentPhrase.trim()) {
            transcriptLines.push(`[User ${currentSpeaker + 1}]: ${currentPhrase.trim()}`);
          }

          if (transcriptLines.length > 1) {
            finalSpeaker = "Multiple Speakers";
            finalText = transcriptLines.join("\n");
          } else {
            finalSpeaker = `User ${currentSpeaker + 1}`;
            finalText = currentPhrase.trim();
          }
        } else {
          finalText = alt.transcript || "";
        }
      }
    } catch (err) {
      console.error("Deepgram exception:", err);
    }

    if (!finalText.trim()) {
      finalText = "[Silence]";
    }

    const finalTranscription = finalSpeaker === "Multiple Speakers" ? finalText : `[${finalSpeaker}]: ${finalText}`;
    console.log("Transcribed:", finalTranscription);

    // 3. Ack to DB
    await db.insert(chunks).values({
      id: chunkId,
      sessionId,
      speaker: finalSpeaker,
      transcription: finalText,
      isAcknowledged: true,
      uploadedAt: new Date(),
    }).onConflictDoUpdate({
      target: chunks.id,
      set: { isAcknowledged: true, speaker: finalSpeaker, transcription: finalText }
    });

    return c.json({ success: true, chunkId, transcription: finalTranscription });
  } catch (error) {
    console.error("Upload error:", error);
    return c.json({ error: "Upload failed" }, 500);
  }
});

app.post("/api/chunks/reconcile", async (c) => {
  try {
    const { chunkIds } = await c.req.json();
    if (!Array.isArray(chunkIds)) {
      return c.json({ error: "Invalid payload" }, 400);
    }

    const missing = [];
    for (const id of chunkIds) {
      // Check Bucket
      if (!existsSync(join(UPLOADS_DIR, `${id}.wav`))) {
        missing.push(id);
        continue;
      }
      // Check DB
      const record = await db.query.chunks.findFirst({
        where: eq(chunks.id, id)
      });
      if (!record || !record.isAcknowledged) {
        missing.push(id);
      }
    }

    return c.json({ missingChunkIds: missing });
  } catch (error) {
    console.error("Reconcile error:", error);
    return c.json({ error: "Reconcile failed" }, 500);
  }
});

app.get("/api/chunks/transcriptions", async (c) => {
  try {
    const sessionId = c.req.query("sessionId");

    if (!sessionId) {
      return c.json({ error: "Missing sessionId" }, 400);
    }

    // Fetch all transcriptions for session ordered by uploaded time
    const results = await db.query.chunks.findMany({
      where: eq(chunks.sessionId, sessionId),
      orderBy: (chunks, { asc }) => [asc(chunks.uploadedAt)],
      columns: {
        id: true,
        speaker: true,
        transcription: true,
        uploadedAt: true
      }
    });

    return c.json({ transcriptions: results });
  } catch (error) {
    console.error("Transcriptions fetch error:", error);
    return c.json({ error: "Fetch failed" }, 500);
  }
});

app.delete("/api/chunks/transcriptions/:id", async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ error: "Missing chunk ID" }, 400);
    }

    // Delete from DB
    await db.delete(chunks).where(eq(chunks.id, id));

    // Delete physical file if it exists
    const filePath = join(UPLOADS_DIR, `${id}.wav`);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Delete transcription error:", error);
    return c.json({ error: "Delete failed" }, 500);
  }
});

app.delete("/api/chunks/transcriptions/session/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");

    const records = await db.query.chunks.findMany({
      where: eq(chunks.sessionId, sessionId),
      columns: { id: true }
    });

    await db.delete(chunks).where(eq(chunks.sessionId, sessionId));

    for (const record of records) {
      const filePath = join(UPLOADS_DIR, `${record.id}.wav`);
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Clear session error:", error);
    return c.json({ error: "Clear failed" }, 500);
  }
});

serve({
  fetch: app.fetch,
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
});

export default app;
