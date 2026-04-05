# Reliable Recording & Multi-Speaker Transcription Pipeline

An end-to-end robust recording and chunking system that incorporates **real-time AI speaker diarization** using Deepgram. It ensures recording data stays accurate in all cases (no data loss) and accurately identifies multiple speakers on a single microphone.

## Features

- **Zero-Loss Chunking Pipeline**: Client-side audio is chunked, stored durably in OPFS, and uploaded, with automatic reconciliation for any network failures.
- **Microphone Hardware Optimization**: Bypasses aggressive browser DSP (echo cancellation/noise suppression) so raw multi-person audio is captured without artificial muffling.
- **Multi-Speaker Diarization (Deepgram)**: Employs Deepgram's `nova-2` model utilizing structural parsing (`diarize: true`, `utterances: true`, `punctuate: true`) on properly-sized 10-second contextual audio chunks.
- **Dynamic Speaker Separation UI**: Intelligently parses raw transcription outputs into separated, color-coded chat bubbles formatted distinctly for "User 1", "User 2", etc.

## How The Chunking Works

```text
Client (Browser)
    │
    ├── 1. Record & chunk raw uncompressed data on the client side
    ├── 2. Store chunks in OPFS (Origin Private File System)
    ├── 3. Upload chunks to a storage bucket
    ├── 4. Transcribe accurately via Deepgram 
    ├── 5. On success → acknowledge (ack) to the database
    │
    └── Recovery: if DB has ack but chunk is missing from bucket
        └── Re-send from OPFS → bucket
```

**Main objective:** In all cases, the recording data stays accurate. OPFS acts as the durable client-side buffer — chunks are only cleared after the bucket and DB are both confirmed in sync.

## Tech Stack

- **Next.js** — Frontend (App Router)
- **Hono** — Backend API server
- **Bun / Node.js** — Runtime
- **Deepgram** — AI Speech-to-Text & Diarization
- **Drizzle ORM + PostgreSQL** — Database
- **TailwindCSS + shadcn/ui** — UI
- **Turborepo** — Monorepo build system

## Getting Started

```bash
npm install
```

### 1. Database Setup

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` with your PostgreSQL connection details.
3. Apply the schema:

```bash
npm run db:push
```

### 2. Deepgram Setup (Transcription & Diarization)

1. Create a free account at [Deepgram](https://deepgram.com/).
2. Generate an API Key in the Deepgram Console.
3. Open `apps/server/.env` and add your key:

```env
DEEPGRAM_API_KEY=your_api_key_here
```

### 3. Run Development

```bash
npm run dev
```

- Web app (Recorder UI): [http://localhost:3001](http://localhost:3001)
- API server: [http://localhost:3000](http://localhost:3000)

## Load Testing

Target: **300,000 requests** to validate the chunking pipeline under heavy load.

### Setup
Use a load testing tool like [k6](https://k6.io), [autocannon](https://github.com/mcollina/autocannon), or [artillery](https://artillery.io) to simulate concurrent chunk uploads.

Example with **k6**:

```js
import http from "k6/http";
import { check } from "k6";

export const options = {
  scenarios: {
    chunk_uploads: {
      executor: "constant-arrival-rate",
      rate: 5000,           // 5,000 req/s
      timeUnit: "1s",
      duration: "1m",       // → 300K requests in 60s
      preAllocatedVUs: 500,
      maxVUs: 1000,
    },
  },
};

export default function () {
  const payload = JSON.stringify({
    chunkId: `chunk-${__VU}-${__ITER}`,
    file: "mock_file_buffer",
  });

  const res = http.post("http://localhost:3000/api/chunks/upload", payload, {
    headers: { "Content-Type": "application/json" },
  });

  check(res, {
    "status 200": (r) => r.status === 200,
  });
}
```

Run:

```bash
k6 run load-test.js
```

## Project Structure

```text
recoding-assignment/
├── apps/
│   ├── web/         # Target Frontend — audio capture without DSP, UI parsing
│   └── server/      # Backend API — Deepgram diarization, bucket upload, DB ack
├── packages/
│   ├── ui/          # Shared shadcn/ui components
│   ├── db/          # Drizzle ORM schema
│   └── config/      # Shared configs
```
