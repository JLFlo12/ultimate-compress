import { createFileRoute } from "@tanstack/react-router";
import { Download, Play, ShieldCheck, Sparkles, Trash2, XCircle } from "lucide-react";

import logo from "@/assets/logo.png";
import { Dropzone } from "@/components/compressx/Dropzone";
import { JobCard } from "@/components/compressx/JobCard";
import { SettingsPanel } from "@/components/compressx/SettingsPanel";
import { StatsBar } from "@/components/compressx/StatsBar";
import { ThemeToggle } from "@/components/compressx/ThemeToggle";
import { useCompressionQueue } from "@/hooks/useCompressionQueue";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CompressX — Compressez vos fichiers dans le navigateur" },
      {
        name: "description",
        content:
          "Compressez images, documents et fichiers volumineux directement sur votre appareil. Aucun envoi, aucun compte, réglages précis et téléchargement groupé en ZIP.",
      },
      { property: "og:title", content: "CompressX — Compression de fichiers locale" },
      {
        property: "og:description",
        content:
          "Glissez vos fichiers, choisissez votre niveau de compression et récupérez-les allégés. Tout se passe dans votre navigateur.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const queue = useCompressionQueue();
  const { jobs, stats } = queue;
  const hasDone = jobs.some((job) => job.status === "done");

  return (
    <div className="bg-gradient-page relative min-h-screen overflow-hidden">
      {/* Decorative aurora */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-gradient-brand animate-aurora-drift absolute -top-40 -left-32 size-[38rem] rounded-full opacity-20 blur-3xl" />
        <div className="animate-aurora-slide absolute top-1/3 -right-40 size-[32rem] rounded-full bg-accent opacity-20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-8 sm:px-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={logo}
              alt="Logo CompressX"
              width={1024}
              height={1024}
              className="size-9"
            />
            <span className="font-display text-lg font-semibold tracking-tight">CompressX</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <ShieldCheck className="size-3.5 text-accent" /> Traitement 100 % local
            </span>
            <ThemeToggle />
          </div>
        </header>

        <section className="mx-auto mt-16 max-w-3xl text-center">
          <span className="glass-panel-soft inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" /> Aucun envoi, aucun compte, aucune limite
            artificielle
          </span>
          <h1 className="font-display mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
            Allégez vos fichiers <span className="text-gradient-brand">sans les envoyer</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Vos fichiers sont analysés et compressés directement sur votre appareil. Rien n'est
            transmis, rien n'est conservé : tout disparaît dès que vous fermez l'onglet.
          </p>
        </section>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-6">
            <Dropzone onFiles={queue.addFiles} />

            {jobs.length > 0 && (
              <>
                <StatsBar
                  count={stats.count}
                  totalOriginal={stats.totalOriginal}
                  doneCount={stats.doneCount}
                  doneOriginal={stats.doneOriginal}
                  doneFinal={stats.doneFinal}
                  saved={stats.saved}
                  rate={stats.rate}
                />

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={queue.start}
                    disabled={queue.running || stats.queued === 0}
                    className="bg-gradient-brand inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    <Play className="size-4" />
                    {queue.running
                      ? "Compression en cours…"
                      : `Compresser tout${stats.queued ? ` (${stats.queued})` : ""}`}
                  </button>
                  <button
                    type="button"
                    onClick={queue.downloadAll}
                    disabled={!hasDone}
                    className="glass-panel inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:text-primary disabled:opacity-40"
                  >
                    <Download className="size-4" /> Tout télécharger
                  </button>
                  {queue.running && (
                    <button
                      type="button"
                      onClick={queue.cancelAll}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <XCircle className="size-4" /> Annuler la file
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={queue.clearAll}
                    className="ml-auto inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-4" /> Vider la liste
                  </button>
                </div>

                <ul className="space-y-3">
                  {jobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onDownload={queue.downloadJob}
                      onRemove={queue.removeJob}
                      onRetry={queue.retry}
                    />
                  ))}
                </ul>
              </>
            )}
          </div>

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <SettingsPanel
              settings={queue.settings}
              onChange={queue.setSettings}
              disabled={queue.running}
            />
          </aside>
        </div>

        <footer className="mt-20 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          CompressX — compression locale dans le navigateur. Vos fichiers ne quittent jamais votre
          appareil et sont supprimés automatiquement de la mémoire après traitement.
        </footer>
      </div>
    </div>
  );
}
