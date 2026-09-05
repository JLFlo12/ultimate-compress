/// <reference lib="webworker" />
/**
 * Compression worker: keeps the heavy chunk-streaming work off the main thread.
 */

import { compressFile } from "./engine";
import type { WorkerRequest, WorkerResponse } from "./types";

const post = (message: WorkerResponse) => {
  (self as unknown as Worker).postMessage(message);
};

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type === "ping") {
    post({ type: "pong" });
    return;
  }

  const { id, file, category, settings } = request;
  let last = 0;
  try {
    const result = await compressFile(file, category, settings, (processed, total, phase) => {
      const now = Date.now();
      // Throttle: progress messages are cheap but not free.
      if (now - last < 80 && processed < total) return;
      last = now;
      post({ type: "progress", id, processed, total, phase });
    });
    post({
      type: "done",
      id,
      blob: result.blob,
      fileName: result.fileName,
      outcome: {
        method: result.method,
        note: result.note,
        alreadyOptimized: result.alreadyOptimized,
        width: result.width,
        height: result.height,
      },
    });
  } catch (error) {
    post({
      type: "error",
      id,
      message: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
};
