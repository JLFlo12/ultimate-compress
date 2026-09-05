/** Shared types for the CompressX compression pipeline. */

export type CompressionMode = "max" | "balanced" | "fast" | "lossless";

export type FileCategory =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "archive"
  | "code"
  | "model3d"
  | "binary"
  | "unknown";

export type ImageOutputFormat = "auto" | "webp" | "jpeg" | "png" | "original";

/** User-tunable settings, persisted locally and overridable per file. */
export interface CompressionSettings {
  mode: CompressionMode;
  /** 0.1 – 1 quality for lossy image encoders. */
  imageQuality: number;
  imageFormat: ImageOutputFormat;
  /** Longest-edge cap in px; 0 keeps the original resolution. */
  maxDimension: number;
  /** Re-encoding always drops EXIF; when false we prefer lossless paths. */
  stripMetadata: boolean;
  /** Allow changing the container/format (e.g. PNG -> WebP). */
  allowFormatChange: boolean;
  /** Parallel workers used for the queue. */
  concurrency: number;
}

export const DEFAULT_SETTINGS: CompressionSettings = {
  mode: "balanced",
  imageQuality: 0.82,
  imageFormat: "auto",
  maxDimension: 0,
  stripMetadata: true,
  allowFormatChange: true,
  concurrency: 2,
};

export const MODE_LABELS: Record<CompressionMode, string> = {
  max: "Maximale",
  balanced: "Équilibrée",
  fast: "Rapide",
  lossless: "Sans perte",
};

export const CATEGORY_LABELS: Record<FileCategory, string> = {
  image: "Image",
  video: "Vidéo",
  audio: "Audio",
  document: "Document",
  archive: "Archive",
  code: "Code",
  model3d: "3D",
  binary: "Binaire",
  unknown: "Inconnu",
};

/** Outcome metadata attached to a finished job. */
export interface CompressionOutcome {
  /** Algorithm actually used, e.g. "WebP q82" or "Gzip niveau 9". */
  method: string;
  /** Human explanation shown in the UI (fallbacks, already-optimized, ...). */
  note?: string | undefined;
  /** True when no meaningful gain was possible and the original was kept. */
  alreadyOptimized: boolean;
  width?: number | undefined;
  height?: number | undefined;
}

export interface CompressionResult extends CompressionOutcome {
  blob: Blob;
  fileName: string;
}

export type JobStatus =
  | "queued"
  | "analyzing"
  | "compressing"
  | "done"
  | "error"
  | "canceled";

export interface Job {
  id: string;
  file: File;
  fileName: string;
  category: FileCategory;
  originalSize: number;
  status: JobStatus;
  /** 0 – 100. */
  progress: number;
  /** Bytes processed per second, live. */
  rate: number;
  /** Seconds remaining, live. */
  eta: number;
  finalSize?: number | undefined;
  outcome?: CompressionOutcome | undefined;
  resultUrl?: string | undefined;
  resultName?: string | undefined;
  error?: string | undefined;
  settings: CompressionSettings;
  /** Data URL preview for images (small files only). */
  previewUrl?: string | undefined;
  startedAt?: number | undefined;
  finishedAt?: number | undefined;
}

/* ---------- Worker message protocol ---------- */

export type WorkerRequest =
  | {
      type: "compress";
      id: string;
      file: File;
      category: FileCategory;
      settings: CompressionSettings;
    }
  | { type: "ping" };

export type WorkerResponse =
  | { type: "progress"; id: string; processed: number; total: number; phase: JobStatus }
  | { type: "done"; id: string; blob: Blob; fileName: string; outcome: CompressionOutcome }
  | { type: "error"; id: string; message: string }
  | { type: "pong" };
