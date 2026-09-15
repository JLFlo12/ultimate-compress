declare module "gifenc" {
  export interface GifEncoderFrameOptions {
    palette?: number[][] | undefined;
    delay?: number | undefined;
    transparent?: boolean | undefined;
    transparentIndex?: number | undefined;
    dispose?: number | undefined;
    repeat?: number | undefined;
    first?: boolean | undefined;
    colorDepth?: number | undefined;
  }

  export interface GifEncoderInstance {
    writeFrame(index: Uint8Array, width: number, height: number, options?: GifEncoderFrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    reset(): void;
  }

  export function GIFEncoder(options?: { auto?: boolean; initialCapacity?: number }): GifEncoderInstance;

  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: { format?: "rgb565" | "rgb444" | "rgba4444"; oneBitAlpha?: boolean; clearAlpha?: boolean },
  ): number[][];

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: number[][],
    format?: "rgb565" | "rgb444" | "rgba4444",
  ): Uint8Array;
}
