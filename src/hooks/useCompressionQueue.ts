/**
 * Queue orchestration for CompressX.
 *
 * Owns the job list, a small pool of Web Workers, live rate/ETA maths and
 * the download helpers (single file or a streamed ZIP of everything).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Zip, ZipPassThrough } from "fflate";

import { detectCategory, sniffCategory } from "@/lib/compression/detect";
import { compressFile } from "@/lib/compression/engine";
import {
  DEFAULT_SETTINGS,
  type CompressionSettings,
  type Job,
  type WorkerResponse,
} from "@/lib/compression/types";
import { sanitizeFileName } from "@/lib/format";

const PREVIEW_LIMIT = 12 * 1024 * 1024;
const SETTINGS_KEY = "compressx.settings.v1";

interface Tick {
  time: number;
  processed: number;
}

export function useCompressionQueue() {
  const [settings, setSettings] = useState<CompressionSettings>(DEFAULT_SETTINGS);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [running, setRunning] = useState(false);

  const jobsRef = useRef<Job[]>([]);
  jobsRef.current = jobs;
  const ticksRef = useRef<Map<string, Tick>>(new Map());
  const canceledRef = useRef<Set<string>>(new Set());
  const runningRef = useRef(false);

  // Persisted settings (client-only read, after hydration).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch {
      /* ignore corrupted storage */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* storage may be unavailable */
    }
  }, [settings]);

  const patch = useCallback((id: string, next: Partial<Job>) => {
    setJobs((prev) => prev.map((job) => (job.id === id ? { ...job, ...next } : job)));
  }, []);

  /* ---------------- adding files ---------------- */

  const addFiles = useCallback(async (files: File[]) => {
    const incoming: Job[] = [];
    for (const file of files) {
      const guess = detectCategory(file);
      const category = await sniffCategory(file, guess);
      incoming.push({
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        fileName: sanitizeFileName(file.name),
        category,
        originalSize: file.size,
        status: "queued",
        progress: 0,
        rate: 0,
        eta: 0,
        settings: { ...settings },
        previewUrl:
          category === "image" && file.size <= PREVIEW_LIMIT && file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined,
      });
    }
    setJobs((prev) => [...prev, ...incoming]);
  }, [settings]);

  /* ---------------- worker plumbing ---------------- */

  const runJob = useCallback(
    (job: Job) =>
      new Promise<void>((resolve) => {
        if (canceledRef.current.has(job.id)) {
          patch(job.id, { status: "canceled" });
          resolve();
          return;
        }

        const startedAt = Date.now();
        ticksRef.current.set(job.id, { time: startedAt, processed: 0 });
        patch(job.id, { status: "analyzing", progress: 0, startedAt });

        const onProgress = (processed: number, total: number, phase: Job["status"]) => {
          const now = Date.now();
          const tick = ticksRef.current.get(job.id) ?? { time: startedAt, processed: 0 };
          const dt = (now - tick.time) / 1000;
          const rate = dt > 0.15 ? (processed - tick.processed) / dt : undefined;
          if (rate !== undefined) ticksRef.current.set(job.id, { time: now, processed });
          const pct = total > 0 ? Math.min(99, Math.round((processed / total) * 100)) : 0;
          setJobs((prev) =>
            prev.map((item) => {
              if (item.id !== job.id) return item;
              const nextRate = rate ?? item.rate;
              return {
                ...item,
                status: item.status === "canceled" ? item.status : phase,
                progress: Math.max(item.progress, pct),
                rate: nextRate,
                eta: nextRate > 0 ? Math.max(0, (total - processed) / nextRate) : item.eta,
              };
            }),
          );
        };

        const finish = (blob: Blob, fileName: string, outcome: Job["outcome"]) => {
          patch(job.id, {
            status: "done",
            progress: 100,
            finalSize: blob.size,
            outcome,
            resultUrl: URL.createObjectURL(blob),
            resultName: fileName,
            finishedAt: Date.now(),
            eta: 0,
          });
          resolve();
        };

        const fail = (message: string) => {
          patch(job.id, { status: "error", error: message, eta: 0 });
          resolve();
        };

        let worker: Worker | null = null;
        try {
          worker = new Worker(new URL("../lib/compression/worker.ts", import.meta.url), {
            type: "module",
          });
        } catch {
          worker = null;
        }

        if (!worker) {
          // Main-thread fallback keeps the app usable without worker support.
          compressFile(job.file, job.category, job.settings, onProgress)
            .then((result) =>
              finish(result.blob, result.fileName, {
                method: result.method,
                note: result.note,
                alreadyOptimized: result.alreadyOptimized,
                width: result.width,
                height: result.height,
              }),
            )
            .catch((error: unknown) =>
              fail(error instanceof Error ? error.message : "Erreur inconnue"),
            );
          return;
        }

        const activeWorker = worker;
        activeWorker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          const data = event.data;
          if (data.type === "progress") {
            onProgress(data.processed, data.total, data.phase);
          } else if (data.type === "done") {
            activeWorker.terminate();
            finish(data.blob, data.fileName, data.outcome);
          } else if (data.type === "error") {
            activeWorker.terminate();
            fail(data.message);
          }
        };
        activeWorker.onerror = () => {
          activeWorker.terminate();
          fail("Le worker de compression a échoué.");
        };
        activeWorker.postMessage({
          type: "compress",
          id: job.id,
          file: job.file,
          category: job.category,
          settings: job.settings,
        });
      }),
    [patch],
  );

  const start = useCallback(async () => {
    if (runningRef.current) return;
    const pending = jobsRef.current.filter((job) => job.status === "queued");
    if (pending.length === 0) return;

    runningRef.current = true;
    setRunning(true);
    canceledRef.current.clear();

    const queue = [...pending];
    // Refresh each job with the currently selected settings before running.
    setJobs((prev) =>
      prev.map((job) =>
        job.status === "queued" ? { ...job, settings: { ...settings } } : job,
      ),
    );

    const lanes = Math.max(1, Math.min(settings.concurrency, 6));
    const worker = async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) break;
        await runJob({ ...next, settings: { ...settings } });
      }
    };
    await Promise.all(Array.from({ length: lanes }, worker));

    runningRef.current = false;
    setRunning(false);
  }, [runJob, settings]);

  const cancelAll = useCallback(() => {
    jobsRef.current.forEach((job) => {
      if (job.status === "queued") canceledRef.current.add(job.id);
    });
    setJobs((prev) =>
      prev.map((job) => (job.status === "queued" ? { ...job, status: "canceled" } : job)),
    );
  }, []);

  const removeJob = useCallback((id: string) => {
    setJobs((prev) => {
      const target = prev.find((job) => job.id === id);
      if (target?.resultUrl) URL.revokeObjectURL(target.resultUrl);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((job) => job.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    jobsRef.current.forEach((job) => {
      if (job.resultUrl) URL.revokeObjectURL(job.resultUrl);
      if (job.previewUrl) URL.revokeObjectURL(job.previewUrl);
    });
    setJobs([]);
  }, []);

  const retry = useCallback((id: string) => {
    canceledRef.current.delete(id);
    patch(id, { status: "queued", progress: 0, error: undefined, rate: 0, eta: 0 });
  }, [patch]);

  /* ---------------- downloads ---------------- */

  const downloadJob = useCallback((job: Job) => {
    if (!job.resultUrl || !job.resultName) return;
    const link = document.createElement("a");
    link.href = job.resultUrl;
    link.download = job.resultName;
    link.click();
  }, []);

  /** Streams every finished result into one ZIP without buffering them twice. */
  const downloadAll = useCallback(async () => {
    const done = jobsRef.current.filter((job) => job.status === "done" && job.resultUrl);
    if (done.length === 0) return;
    if (done.length === 1) {
      downloadJob(done[0]!);
      return;
    }

    const parts: BlobPart[] = [];
    const used = new Set<string>();
    const zip = new Zip();
    zip.ondata = (err, chunk) => {
      if (!err && chunk) parts.push(chunk as unknown as BlobPart);
    };

    for (const job of done) {
      let name = job.resultName ?? job.fileName;
      let n = 2;
      while (used.has(name)) {
        name = `${n}-${job.resultName ?? job.fileName}`;
        n += 1;
      }
      used.add(name);
      // Contents are already compressed: store them to keep zipping instant.
      const entry = new ZipPassThrough(name);
      zip.add(entry);
      const blob = await fetch(job.resultUrl!).then((res) => res.blob());
      const buffer = new Uint8Array(await blob.arrayBuffer());
      entry.push(buffer, true);
    }
    zip.end();

    const url = URL.createObjectURL(new Blob(parts, { type: "application/zip" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "compressx.zip";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, [downloadJob]);

  /* ---------------- aggregate stats ---------------- */

  const stats = useMemo(() => {
    const totalOriginal = jobs.reduce((sum, job) => sum + job.originalSize, 0);
    const finished = jobs.filter((job) => job.status === "done");
    const doneOriginal = finished.reduce((sum, job) => sum + job.originalSize, 0);
    const doneFinal = finished.reduce((sum, job) => sum + (job.finalSize ?? job.originalSize), 0);
    const active = jobs.filter(
      (job) => job.status === "analyzing" || job.status === "compressing",
    );
    return {
      count: jobs.length,
      totalOriginal,
      doneCount: finished.length,
      doneOriginal,
      doneFinal,
      saved: Math.max(0, doneOriginal - doneFinal),
      rate: active.reduce((sum, job) => sum + job.rate, 0),
      queued: jobs.filter((job) => job.status === "queued").length,
      errors: jobs.filter((job) => job.status === "error").length,
    };
  }, [jobs]);

  return {
    jobs,
    settings,
    setSettings,
    addFiles,
    start,
    running,
    cancelAll,
    removeJob,
    clearAll,
    retry,
    downloadJob,
    downloadAll,
    stats,
  };
}
