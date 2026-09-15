/**
 * Real GIF compression.
 *
 * Animated GIFs are decoded frame by frame with WebCodecs `ImageDecoder`,
 * optionally downscaled, colour-quantized (palette reduction) and re-encoded
 * as a genuine animated GIF with `gifenc`. Animation, timing and looping are
 * preserved. When the browser cannot decode the animation we fall back to the
 * lossless archive path handled by the caller.
 */

import { GIFEncoder, applyPalette, quantize } from "gifenc";

import type { CompressionMode } from "./types";

interface ImageDecoderCtor {
  new (init: { data: ArrayBuffer | Uint8Array; type: string }): ImageDecoderLike;
  isTypeSupported?: (type: string) => Promise<boolean>;
}

interface ImageDecoderLike {
  completed: Promise<void>;
  tracks: {
    selectedTrack?: { frameCount: number; animated: boolean; repetitionCount: number } | undefined;
    ready: Promise<void>;
  };
  decode(options?: { frameIndex?: number }): Promise<{
    image: { displayWidth: number; displayHeight: number; duration: number | null; close(): void };
  }>;
  close(): void;
}

function decoderCtor(): ImageDecoderCtor | undefined {
  const ctor = (globalThis as unknown as { ImageDecoder?: ImageDecoderCtor }).ImageDecoder;
  return typeof ctor === "function" ? ctor : undefined;
}

export function canDecodeGifFrames(): boolean {
  return (
    decoderCtor() !== undefined &&
    typeof OffscreenCanvas === "function" &&
    typeof GIFEncoder === "function"
  );
}

/** Counts graphic-control extensions to spot an animation without decoding. */
export async function isAnimatedGif(file: File): Promise<boolean> {
  try {
    const bytes = new Uint8Array(await file.slice(0, 2 * 1024 * 1024).arrayBuffer());
    let frames = 0;
    for (let i = 0; i < bytes.length - 3; i += 1) {
      if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9 && bytes[i + 2] === 0x04) {
        frames += 1;
        if (frames > 1) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/** Palette size and frame-skipping aggressiveness per compression mode. */
function tuning(mode: CompressionMode, quality: number) {
  const colorsFromQuality = Math.max(16, Math.min(256, Math.round(quality * 256)));
  switch (mode) {
    case "max":
      return { colors: Math.min(64, colorsFromQuality), frameStep: 2, scale: 0.8 };
    case "fast":
      return { colors: 256, frameStep: 1, scale: 1 };
    default:
      return { colors: Math.min(128, colorsFromQuality), frameStep: 1, scale: 1 };
  }
}

export interface GifEncodeOptions {
  mode: CompressionMode;
  quality: number;
  /** Longest-edge cap in px; 0 keeps the source resolution. */
  maxDimension: number;
}

export interface GifEncodeOutput {
  blob: Blob;
  width: number;
  height: number;
  frames: number;
  colors: number;
}

/** Decodes, downscales, quantizes and re-encodes an animated GIF. */
export async function reencodeGif(
  file: File,
  options: GifEncodeOptions,
  onFrame?: (done: number, total: number) => void,
): Promise<GifEncodeOutput> {
  const Ctor = decoderCtor();
  if (!Ctor) throw new Error("ImageDecoder indisponible");

  const decoder = new Ctor({ data: await file.arrayBuffer(), type: "image/gif" });
  try {
    await decoder.tracks.ready;
    await decoder.completed;
    const track = decoder.tracks.selectedTrack;
    const frameCount = Math.max(1, track?.frameCount ?? 1);

    const first = await decoder.decode({ frameIndex: 0 });
    const sourceWidth = first.image.displayWidth;
    const sourceHeight = first.image.displayHeight;
    first.image.close();

    const { colors, frameStep, scale } = tuning(options.mode, options.quality);
    let width = Math.max(1, Math.round(sourceWidth * scale));
    let height = Math.max(1, Math.round(sourceHeight * scale));
    const cap = options.maxDimension;
    if (cap > 0 && Math.max(width, height) > cap) {
      const factor = cap / Math.max(width, height);
      width = Math.max(1, Math.round(width * factor));
      height = Math.max(1, Math.round(height * factor));
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas indisponible");

    const encoder = GIFEncoder();
    const step = frameCount > 2 ? frameStep : 1;
    let written = 0;

    for (let index = 0; index < frameCount; index += step) {
      const { image } = await decoder.decode({ frameIndex: index });
      // Accumulated delay when frames are skipped, so the timing stays right.
      let delayUs = image.duration ?? 100_000;
      for (let extra = 1; extra < step && index + extra < frameCount; extra += 1) {
        const skipped = await decoder.decode({ frameIndex: index + extra });
        delayUs += skipped.image.duration ?? 100_000;
        skipped.image.close();
      }

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(image as unknown as CanvasImageSource, 0, 0, width, height);
      image.close();

      const { data } = ctx.getImageData(0, 0, width, height);
      const palette = quantize(data, colors, { format: "rgb444", oneBitAlpha: true });
      const indexed = applyPalette(data, palette, "rgb444");

      encoder.writeFrame(indexed, width, height, {
        palette,
        delay: Math.max(20, Math.round(delayUs / 1000)),
        transparent: true,
        ...(written === 0 ? { first: true, repeat: track?.repetitionCount === 0 ? -1 : 0 } : {}),
      });
      written += 1;
      onFrame?.(index + step, frameCount);
    }

    encoder.finish();
    const bytes = encoder.bytes();
    return {
      blob: new Blob([bytes as unknown as BlobPart], { type: "image/gif" }),
      width,
      height,
      frames: written,
      colors,
    };
  } finally {
    decoder.close();
  }
}
