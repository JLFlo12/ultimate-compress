/**
 * The compression engine. Runs inside a Web Worker (see worker.ts) but stays
 * DOM-free so it can also run on the main thread as a fallback.
 *
 * Design rules:
 *  - never read a whole file into memory: everything is chunk-streamed;
 *  - real codecs where the browser has one (image bitmap re-encoding);
 *  - automatic lossless archive fallback everywhere else;
 *  - if a "compressed" output is not smaller, keep the original and say so.
 */

import { Gzip } from "fflate";

import { baseName, fileExtension, sanitizeFileName } from "../format";
import { canDecodeAsBitmap, isAlreadyCompressed, levelForMode, qualityForMode } from "./detect";
import { canDecodeGifFrames, isAnimatedGif, reencodeGif } from "./gif";
import type { CompressionResult, CompressionSettings, FileCategory, JobStatus } from "./types";

const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB streaming window
const PROBE_SIZE = 2 * 1024 * 1024; // sample used to decide if a gain is possible

export type ProgressFn = (processed: number, total: number, phase: JobStatus) => void;

/* ------------------------------------------------------------------ */
/* Streaming gzip                                                      */
/* ------------------------------------------------------------------ */

/** Gzips a blob chunk by chunk, reporting progress; never buffers the input. */
async function gzipBlob(
  blob: Blob,
  level: number,
  onProgress?: (processed: number) => void,
): Promise<Blob> {
  const parts: BlobPart[] = [];
  const gz = new Gzip({ level: level as 0 | 1 | 6 | 9 });
  gz.ondata = (chunk) => {
    parts.push(chunk as unknown as BlobPart);
  };

  if (blob.size === 0) {
    gz.push(new Uint8Array(0), true);
    return new Blob(parts, { type: "application/gzip" });
  }

  let offset = 0;
  while (offset < blob.size) {
    const end = Math.min(offset + CHUNK_SIZE, blob.size);
    const buffer = new Uint8Array(await blob.slice(offset, end).arrayBuffer());
    gz.push(buffer, end >= blob.size);
    offset = end;
    onProgress?.(offset);
    await Promise.resolve();
  }

  return new Blob(parts, { type: "application/gzip" });
}

/**
 * Compresses a small sample to estimate whether the whole file can shrink.
 * Avoids burning minutes on multi-gigabyte MP4/ZIP files for a 0.2 % gain.
 */
async function probeRatio(blob: Blob): Promise<number> {
  const sample = blob.slice(0, Math.min(PROBE_SIZE, blob.size));
  const out = await gzipBlob(sample, 6);
  return out.size / Math.max(1, sample.size);
}

/* ------------------------------------------------------------------ */
/* Lossless archive path                                               */
/* ------------------------------------------------------------------ */

async function archiveLossless(
  file: File,
  settings: CompressionSettings,
  onProgress: ProgressFn,
  options: { note?: string; skipProbe?: boolean } = {},
): Promise<CompressionResult> {
  const level = levelForMode(settings.mode);
  const name = sanitizeFileName(file.name);

  // Entropy-coded input: probe a sample instead of grinding through gigabytes.
  if (!options.skipProbe && isAlreadyCompressed(file.name) && file.size > PROBE_SIZE) {
    onProgress(0, file.size, "analyzing");
    const ratio = await probeRatio(file);
    if (ratio > 0.97) {
      onProgress(file.size, file.size, "compressing");
      return {
        blob: file,
        fileName: name,
        method: "Déjà optimisé",
        note: "Ce format est déjà compressé : aucune réduction utile n'est possible, le fichier original est conservé.",
        alreadyOptimized: true,
      };
    }
  }

  const out = await gzipBlob(file, level, (processed) =>
    onProgress(processed, file.size, "compressing"),
  );

  if (out.size >= file.size) {
    return {
      blob: file,
      fileName: name,
      method: "Déjà optimisé",
      note: "L'archivage n'apporte aucun gain : le fichier original est conservé.",
      alreadyOptimized: true,
    };
  }

  return {
    blob: out,
    fileName: `${name}.gz`,
    method: `Gzip niveau ${level}`,
    note: options.note,
    alreadyOptimized: false,
  };
}

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */

function pickImageTarget(
  file: File,
  settings: CompressionSettings,
): { mime: string; ext: string } {
  const ext = fileExtension(file.name);
  const format = settings.imageFormat;

  if (format === "webp") return { mime: "image/webp", ext: "webp" };
  if (format === "jpeg") return { mime: "image/jpeg", ext: "jpg" };
  if (format === "png") return { mime: "image/png", ext: "png" };
  if (format === "original" || !settings.allowFormatChange) {
    if (ext === "png") return { mime: "image/png", ext: "png" };
    if (ext === "webp") return { mime: "image/webp", ext: "webp" };
    return { mime: "image/jpeg", ext: "jpg" };
  }
  // auto: WebP is the best broadly-supported encoder available in-browser.
  return { mime: "image/webp", ext: "webp" };
}

async function compressImage(
  file: File,
  settings: CompressionSettings,
  onProgress: ProgressFn,
): Promise<CompressionResult> {
  const ext = fileExtension(file.name);

  // SVG is text: minify, then gzip if minification alone is not enough.
  if (ext === "svg") {
    const text = await file.text();
    const minified = text
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/>\s+</g, "><")
      .replace(/\s{2,}/g, " ")
      .trim();
    const minBlob = new Blob([minified], { type: "image/svg+xml" });
    onProgress(file.size, file.size, "compressing");
    if (minBlob.size < file.size * 0.98) {
      return {
        blob: minBlob,
        fileName: sanitizeFileName(file.name),
        method: "SVG minifié",
        alreadyOptimized: false,
      };
    }
    const gz = await gzipBlob(minBlob, 9);
    return {
      blob: gz,
      fileName: `${sanitizeFileName(file.name)}.gz`,
      method: "SVG + Gzip 9",
      note: "Le balisage était déjà compact : archive sans perte appliquée.",
      alreadyOptimized: false,
    };
  }

  const lossless = settings.mode === "lossless";

  // Animated GIF: decode every frame and re-encode a real animated GIF.
  if (ext === "gif" && !lossless && (await isAnimatedGif(file))) {
    if (!canDecodeGifFrames()) {
      return archiveLossless(file, settings, onProgress, {
        note: "Ce navigateur ne peut pas décoder les images animées : archive sans perte appliquée.",
      });
    }
    try {
      const out = await reencodeGif(
        file,
        {
          mode: settings.mode,
          quality: qualityForMode(settings),
          maxDimension: settings.maxDimension,
        },
        (done, total) =>
          onProgress(Math.round((done / Math.max(1, total)) * file.size), file.size, "compressing"),
      );
      onProgress(file.size, file.size, "compressing");
      if (out.blob.size >= file.size) {
        return {
          blob: file,
          fileName: sanitizeFileName(file.name),
          method: "Aucun gain possible",
          note: "Ce GIF animé est déjà optimisé : le fichier original est conservé.",
          alreadyOptimized: true,
        };
      }
      return {
        blob: out.blob,
        fileName: `${baseName(sanitizeFileName(file.name))}.gif`,
        method: `GIF ${out.colors} couleurs · ${out.frames} images${
          out.width !== 0 ? ` · ${out.width}×${out.height}` : ""
        }`,
        note: "Animation conservée : palette réduite et images ré-encodées.",
        alreadyOptimized: false,
        width: out.width,
        height: out.height,
      };
    } catch {
      return archiveLossless(file, settings, onProgress, {
        note: "Ré-encodage de l'animation impossible : archive sans perte appliquée.",
      });
    }
  }

  const decodable =
    canDecodeAsBitmap(file.name, file.type) &&
    typeof createImageBitmap === "function" &&
    typeof OffscreenCanvas === "function";

  if (lossless || !decodable) {
    return archiveLossless(file, settings, onProgress, {
      note: lossless
        ? "Mode sans perte : pixels et métadonnées conservés à l'identique."
        : "Format non décodable par le navigateur : archive sans perte appliquée.",
    });
  }

  const bitmap = await createImageBitmap(file);
  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;
  let width = sourceWidth;
  let height = sourceHeight;
  const cap = settings.maxDimension;
  if (cap > 0 && Math.max(width, height) > cap) {
    const scale = cap / Math.max(width, height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return archiveLossless(file, settings, onProgress, {
      note: "Canvas indisponible : archive sans perte appliquée.",
    });
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  onProgress(Math.round(file.size * 0.6), file.size, "compressing");

  const target = pickImageTarget(file, settings);
  const quality = qualityForMode(settings);
  const encoded = await canvas.convertToBlob(
    target.mime === "image/png" ? { type: target.mime } : { type: target.mime, quality },
  );
  onProgress(file.size, file.size, "compressing");

  const resized = width !== sourceWidth || height !== sourceHeight;
  if (encoded.size >= file.size && !resized) {
    return {
      blob: file,
      fileName: sanitizeFileName(file.name),
      method: "Aucun gain possible",
      note: "Cette image est déjà optimisée : le fichier original est conservé.",
      alreadyOptimized: true,
      width: sourceWidth,
      height: sourceHeight,
    };
  }

  return {
    blob: encoded,
    fileName: `${baseName(sanitizeFileName(file.name))}.${target.ext}`,
    method: `${target.ext.toUpperCase()} q${Math.round(quality * 100)}${
      resized ? ` · ${width}×${height}` : ""
    }`,
    note: settings.stripMetadata ? "Métadonnées EXIF supprimées." : undefined,
    alreadyOptimized: false,
    width,
    height,
  };
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

/** Compresses one file according to its category and the given settings. */
export async function compressFile(
  file: File,
  category: FileCategory,
  settings: CompressionSettings,
  onProgress: ProgressFn,
): Promise<CompressionResult> {
  onProgress(0, file.size, "analyzing");

  switch (category) {
    case "image":
      return compressImage(file, settings, onProgress);

    case "video":
      return archiveLossless(file, settings, onProgress, {
        note: "Le transcodage vidéo n'est pas effectué dans le navigateur : archive sans perte appliquée.",
      });

    case "audio":
      return archiveLossless(file, settings, onProgress, {
        note:
          fileExtension(file.name) === "wav"
            ? "PCM non compressé : archivage sans perte, aucune dégradation audio."
            : "Audio déjà encodé : archive sans perte appliquée.",
      });

    case "code":
    case "document":
      return archiveLossless(file, settings, onProgress, { skipProbe: true });

    default:
      return archiveLossless(file, settings, onProgress);
  }
}
