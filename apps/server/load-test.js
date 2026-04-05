import http from "k6/http";
import { check } from "k6";

export const options = {
  scenarios: {
    chunk_uploads: {
      executor: "constant-arrival-rate",
      rate: 5000, // 5,000 req/s
      timeUnit: "1s",
      duration: "1m", // → 300K requests in 60s
      preAllocatedVUs: 500,
      maxVUs: 1000,
    },
  },
};

export default function () {
  const payload = JSON.stringify({
    chunkId: `chunk-${__VU}-${__ITER}`,
    sessionId: "test-session",
    // We send a tiny dummy file payload equivalent for the test 
    // Wait, the API expects a File! To simulate a File in k6 form data:
    // Actually our server uses `const body = await c.req.parseBody()`. If it's pure JSON, it fails!
    // We must send multipart/form-data.
  });

  const formData = {
    chunkId: `chunk-${__VU}-${__ITER}`,
    sessionId: "test-session",
    file: http.file("x".repeat(1024), "dummy.wav", "audio/wav")
  };

  const res = http.post("http://localhost:3000/api/chunks/upload", formData);

  check(res, {
    "status 200": (r) => r.status === 200,
  });
}
