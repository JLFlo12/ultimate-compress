/** Human-readable formatting helpers (French locale). */

const UNITS = ["o", "Ko", "Mo", "Go", "To", "Po"];

/** Formats a byte count using decimal units, e.g. 2576980378 -> "2,4 Go". */
export function formatBytes(bytes: number, digits = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 o";
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** i;
  const d = i === 0 ? 0 : value >= 100 ? 0 : digits;
  return `${value.toFixed(d).replace(".", ",")} ${UNITS[i]}`;
}

/** Formats a transfer/processing rate, e.g. "18,4 Mo/s". */
export function formatRate(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return "—";
  return `${formatBytes(bytesPerSecond)}/s`;
}

/** Formats a percentage with one decimal, e.g. 57.5 -> "57,5 %". */
export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(digits).replace(".", ",")} %`;
}

/** Formats a duration in seconds as mm:ss (or hh:mm:ss beyond an hour). */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** Savings ratio in percent between an original and a final size. */
export function savingsPercent(original: number, final: number): number {
  if (original <= 0) return 0;
  return Math.max(0, ((original - final) / original) * 100);
}

/** Strips directories and unsafe characters from an untrusted file name. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "fichier";
  const clean = base
    .replace(/[\u0000-\u001f<>:"|?*]/g, "")
    .replace(/\.{2,}/g, ".")
    .trim();
  return clean.length ? clean.slice(0, 180) : "fichier";
}

/** Lowercase extension without the dot, or "" when there is none. */
export function fileExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}

/** File name without its extension. */
export function baseName(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}
