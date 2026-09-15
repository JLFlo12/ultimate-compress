/**
 * File-type detection and strategy planning.
 *
 * Detection is extension-first with a MIME cross-check, then a magic-byte
 * sniff for the formats where a wrong guess would waste a lot of work.
 */

import { fileExtension } from "../format";
import type { CompressionMode, CompressionSettings, FileCategory } from "./types";

const EXTENSIONS: Record<FileCategory, string[]> = {
  image: ["jpg", "jpeg", "png", "webp", "gif", "svg", "tif", "tiff", "bmp", "ico", "avif", "heic"],
  video: ["mp4", "mkv", "avi", "mov", "webm", "flv", "m4v", "mpg", "mpeg", "wmv", "ts"],
  audio: ["mp3", "wav", "flac", "aac", "ogg", "m4a", "opus", "wma", "aiff", "mid"],
  document: [
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf", "odt", "ods",
    "odp", "epub", "md", "log", "tex",
  ],
  archive: ["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "zst", "tgz", "iso", "dmg", "jar"],
  code: [
    "js", "mjs", "cjs", "ts", "tsx", "jsx", "html", "htm", "css", "scss", "less", "json",
    "xml", "yaml", "yml", "toml", "ini", "c", "h", "cpp", "hpp", "cc", "java", "kt", "py",
    "php", "rb", "go", "rs", "swift", "sh", "bash", "sql", "vue", "svelte", "dart", "lua",
  ],
  model3d: ["obj", "fbx", "glb", "gltf", "stl", "blend", "dae", "ply", "3ds", "usdz", "abc"],
  binary: ["exe", "dll", "so", "bin", "dat", "apk", "deb", "rpm", "msi", "wasm", "img", "db"],
  unknown: [],
};

const EXT_TO_CATEGORY = new Map<string, FileCategory>();
for (const [category, list] of Object.entries(EXTENSIONS) as [FileCategory, string[]][]) {
  for (const ext of list) EXT_TO_CATEGORY.set(ext, category);
}

/** Formats whose bytes are already entropy-coded; re-compression is pointless. */
const ALREADY_COMPRESSED = new Set([
  "jpg", "jpeg", "webp", "gif", "avif", "heic", "mp4", "mkv", "mov", "webm", "flv", "m4v",
  "mp3", "aac", "ogg", "m4a", "opus", "flac", "zip", "rar", "7z", "gz", "bz2", "xz", "zst",
  "tgz", "jar", "apk", "glb", "png",
]);

/** Image formats the browser can decode to a bitmap for re-encoding. */
const BITMAP_DECODABLE = new Set(["jpg", "jpeg", "png", "webp", "bmp", "gif", "ico", "avif"]);

/** Categorizes a file from its name and reported MIME type. */
export function detectCategory(file: File): FileCategory {
  const ext = fileExtension(file.name);
  const byExt = EXT_TO_CATEGORY.get(ext);
  if (byExt) return byExt;

  const mime = (file.type || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("text/")) return "code";
  if (mime === "application/pdf") return "document";
  if (mime.includes("zip") || mime.includes("compressed")) return "archive";
  if (mime === "application/json" || mime.includes("xml")) return "code";
  if (mime) return "binary";
  return "unknown";
}

/** Verifies the declared type against magic bytes; returns a corrected category. */
export async function sniffCategory(file: File, fallback: FileCategory): Promise<FileCategory> {
  try {
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const is = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);
    if (is(0xff, 0xd8, 0xff)) return "image"; // JPEG
    if (is(0x89, 0x50, 0x4e, 0x47)) return "image"; // PNG
    if (is(0x47, 0x49, 0x46, 0x38)) return "image"; // GIF
    if (is(0x25, 0x50, 0x44, 0x46)) return "document"; // %PDF
    if (is(0x50, 0x4b, 0x03, 0x04)) {
      // Zip container: OOXML documents share it, keep the extension's verdict.
      return fallback === "document" ? "document" : "archive";
    }
    if (is(0x52, 0x61, 0x72, 0x21)) return "archive"; // Rar!
    if (is(0x37, 0x7a, 0xbc, 0xaf)) return "archive"; // 7z
    if (is(0x1f, 0x8b)) return "archive"; // gzip
    if (is(0x1a, 0x45, 0xdf, 0xa3)) return "video"; // Matroska/WebM
    if (is(0x49, 0x44, 0x33)) return "audio"; // MP3 with ID3
    if (is(0x52, 0x49, 0x46, 0x46)) return fallback === "image" ? "image" : "audio"; // RIFF
    if (is(0x4d, 0x5a)) return "binary"; // PE
    if (is(0x7f, 0x45, 0x4c, 0x46)) return "binary"; // ELF
    return fallback;
  } catch {
    return fallback;
  }
}

export function isAlreadyCompressed(fileName: string): boolean {
  return ALREADY_COMPRESSED.has(fileExtension(fileName));
}

export function canDecodeAsBitmap(fileName: string, mime: string): boolean {
  const ext = fileExtension(fileName);
  return BITMAP_DECODABLE.has(ext) || mime.startsWith("image/");
}

/** Deflate level for a mode: 1 (fast) … 9 (maximum). */
export function levelForMode(mode: CompressionMode): number {
  switch (mode) {
    case "fast":
      return 1;
    case "balanced":
      return 6;
    default:
      return 9;
  }
}

/** Effective image quality for a mode (lossless never re-encodes lossily). */
export function qualityForMode(settings: CompressionSettings): number {
  switch (settings.mode) {
    case "max":
      return Math.min(settings.imageQuality, 0.7);
    case "fast":
      return Math.max(settings.imageQuality, 0.88);
    default:
      return settings.imageQuality;
  }
}

/**
 * Human-readable plan shown in the UI before compression starts.
 * Deliberately honest: already-compressed formats get a lossless archive.
 */
export function describePlan(
  category: FileCategory,
  fileName: string,
  settings: CompressionSettings,
): string {
  const ext = fileExtension(fileName);
  const lossless = settings.mode === "lossless";

  if (category === "image") {
    if (ext === "svg") return "SVG → nettoyage + Gzip";
    if (ext === "gif" && !lossless) return "GIF animé → palette réduite";
    if (lossless || !canDecodeAsBitmap(fileName, "")) return "Archive sans perte (Gzip)";
    const target =
      settings.imageFormat === "auto"
        ? settings.allowFormatChange
          ? "WebP"
          : ext.toUpperCase()
        : settings.imageFormat.toUpperCase();
    return `Ré-encodage ${target}`;
  }
  if (category === "video") return "Archive sans perte (déjà compressé)";
  if (category === "audio") return ext === "wav" ? "PCM → Gzip sans perte" : "Archive sans perte";
  if (category === "document") return ext === "pdf" ? "Flux PDF → Gzip" : "Gzip niveau élevé";
  if (category === "code") return "Gzip (texte)";
  if (category === "archive") return "Déjà compressé → vérification";
  if (category === "model3d") return ext === "glb" ? "Archive sans perte" : "Gzip niveau élevé";
  return "Gzip générique";
}
