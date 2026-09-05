import { useCallback, useRef, useState } from "react";
import { UploadCloud, FolderOpen } from "lucide-react";

import { cn } from "@/lib/utils";

interface DropzoneProps {
  onFiles: (files: File[]) => void;
}

/** Full-width drop target: accepts any file type, any size, folders included. */
export function Dropzone({ onFiles }: DropzoneProps) {
  const [active, setActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setActive(false);
      const files = Array.from(event.dataTransfer.files ?? []);
      if (files.length) onFiles(files);
    },
    [onFiles],
  );

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
      }}
      className={cn(
        "glass-panel group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-all duration-300",
        active
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-border/70 hover:border-primary/60",
      )}
    >
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:-translate-y-1">
        <UploadCloud className="size-8" />
      </div>
      <div className="space-y-1">
        <p className="font-display text-xl font-semibold text-foreground">
          Déposez vos fichiers ici
        </p>
        <p className="text-sm text-muted-foreground">
          Tous les formats, plusieurs fichiers, aucune limite de taille — tout reste sur votre
          appareil.
        </p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90">
        <FolderOpen className="size-4" /> Choisir des fichiers
      </span>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) onFiles(files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
