import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileArchive,
  FileAudio,
  FileCode2,
  FileText,
  FileVideo,
  Image as ImageIcon,
  Box,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { describePlan } from "@/lib/compression/detect";
import { CATEGORY_LABELS, type FileCategory, type Job } from "@/lib/compression/types";
import { formatBytes, formatDuration, formatPercent, formatRate, savingsPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS: Record<FileCategory, typeof FileText> = {
  image: ImageIcon,
  video: FileVideo,
  audio: FileAudio,
  document: FileText,
  archive: FileArchive,
  code: FileCode2,
  model3d: Box,
  binary: FileArchive,
  unknown: FileText,
};

interface JobCardProps {
  job: Job;
  onDownload: (job: Job) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}

export function JobCard({ job, onDownload, onRemove, onRetry }: JobCardProps) {
  const Icon = ICONS[job.category];
  const busy = job.status === "analyzing" || job.status === "compressing";
  const done = job.status === "done";
  const saved = done ? savingsPercent(job.originalSize, job.finalSize ?? job.originalSize) : 0;

  return (
    <li className="glass-panel rounded-2xl p-4 transition-shadow hover:shadow-lg">
      <div className="flex items-start gap-4">
        {job.previewUrl ? (
          <img
            src={job.previewUrl}
            alt={`Aperçu de ${job.fileName}`}
            className="size-12 shrink-0 rounded-xl object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{job.fileName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {CATEGORY_LABELS[job.category]} · {formatBytes(job.originalSize)}
                {done && (
                  <>
                    {" → "}
                    <span className="font-medium text-foreground">
                      {formatBytes(job.finalSize ?? job.originalSize)}
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {done && (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 font-mono text-xs font-medium",
                    job.outcome?.alreadyOptimized
                      ? "bg-muted text-muted-foreground"
                      : "bg-accent/20 text-accent-foreground",
                  )}
                >
                  −{formatPercent(saved, saved >= 99.5 && saved < 100 ? 1 : 0)}
                </span>
              )}
              {done && (
                <button
                  type="button"
                  onClick={() => onDownload(job)}
                  aria-label={`Télécharger ${job.resultName ?? job.fileName}`}
                  className="rounded-lg p-2 text-primary transition-colors hover:bg-primary/10"
                >
                  <Download className="size-4" />
                </button>
              )}
              {job.status === "error" && (
                <button
                  type="button"
                  onClick={() => onRetry(job.id)}
                  aria-label="Réessayer"
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
                >
                  <RotateCcw className="size-4" />
                </button>
              )}
              {!busy && (
                <button
                  type="button"
                  onClick={() => onRemove(job.id)}
                  aria-label="Retirer de la liste"
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {busy && (
              <>
                <Progress value={job.progress} className="h-1.5" />
                <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  {job.status === "analyzing" ? "Analyse" : "Compression"} · {job.progress} %
                  {job.rate > 0 && ` · ${formatRate(job.rate)}`}
                  {job.eta > 0 && ` · reste ${formatDuration(job.eta)}`}
                </p>
              </>
            )}

            {job.status === "queued" && (
              <p className="text-xs text-muted-foreground">
                En attente · {describePlan(job.category, job.fileName, job.settings)}
              </p>
            )}

            {done && (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-accent" />
                <span>
                  <span className="font-medium text-foreground">{job.outcome?.method}</span>
                  {job.outcome?.note ? ` — ${job.outcome.note}` : ""}
                </span>
              </p>
            )}

            {job.status === "error" && (
              <p className="flex items-start gap-1.5 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                {job.error}
              </p>
            )}

            {job.status === "canceled" && (
              <p className="text-xs text-muted-foreground">Annulé.</p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
