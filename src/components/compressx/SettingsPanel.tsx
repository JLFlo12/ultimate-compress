import { Gauge, Settings2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  MODE_LABELS,
  type CompressionMode,
  type CompressionSettings,
  type ImageOutputFormat,
} from "@/lib/compression/types";
import { cn } from "@/lib/utils";

interface SettingsPanelProps {
  settings: CompressionSettings;
  onChange: (next: CompressionSettings) => void;
  disabled?: boolean | undefined;
}

const MODE_HINTS: Record<CompressionMode, string> = {
  max: "Le plus petit fichier possible, traitement plus lent.",
  balanced: "Bon compromis taille / qualité / vitesse.",
  fast: "Traitement immédiat, gain plus modeste.",
  lossless: "Aucune perte : pixels et données conservés à l'identique.",
};

export function SettingsPanel({ settings, onChange, disabled = false }: SettingsPanelProps) {
  const set = <K extends keyof CompressionSettings>(key: K, value: CompressionSettings[K]) =>
    onChange({ ...settings, [key]: value });

  const lossy = settings.mode !== "lossless";

  return (
    <div className="glass-panel space-y-6 rounded-3xl p-6">
      <div className="flex items-center gap-2">
        <Settings2 className="size-4 text-primary" />
        <h2 className="font-display text-base font-semibold">Réglages</h2>
      </div>

      <div className="space-y-3">
        <Label>Niveau de compression</Label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(MODE_LABELS) as CompressionMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={disabled}
              onClick={() => set("mode", mode)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                settings.mode === mode
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/70 text-muted-foreground hover:border-primary/40",
              )}
            >
              {MODE_LABELS[mode]}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{MODE_HINTS[settings.mode]}</p>
      </div>

      <div className={cn("space-y-3", !lossy && "opacity-50")}>
        <div className="flex items-center justify-between">
          <Label>Qualité des images</Label>
          <span className="font-mono text-xs text-muted-foreground">
            {Math.round(settings.imageQuality * 100)} %
          </span>
        </div>
        <Slider
          value={[Math.round(settings.imageQuality * 100)]}
          min={10}
          max={100}
          step={1}
          disabled={disabled || !lossy}
          onValueChange={([value]) => set("imageQuality", (value ?? 82) / 100)}
        />
      </div>

      <div className="space-y-3">
        <Label>Format de sortie des images</Label>
        <Select
          value={settings.imageFormat}
          disabled={disabled}
          onValueChange={(value) => set("imageFormat", value as ImageOutputFormat)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Automatique (WebP)</SelectItem>
            <SelectItem value="original">Conserver le format</SelectItem>
            <SelectItem value="webp">WebP</SelectItem>
            <SelectItem value="jpeg">JPEG</SelectItem>
            <SelectItem value="png">PNG</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>Redimensionnement maximal</Label>
        <Select
          value={String(settings.maxDimension)}
          disabled={disabled}
          onValueChange={(value) => set("maxDimension", Number(value))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Résolution d'origine</SelectItem>
            <SelectItem value="3840">4K — 3840 px</SelectItem>
            <SelectItem value="1920">Full HD — 1920 px</SelectItem>
            <SelectItem value="1280">HD — 1280 px</SelectItem>
            <SelectItem value="800">Web — 800 px</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Supprimer les métadonnées</p>
          <p className="text-xs text-muted-foreground">EXIF, GPS, informations d'appareil.</p>
        </div>
        <Switch
          checked={settings.stripMetadata}
          disabled={disabled}
          onCheckedChange={(value) => set("stripMetadata", value)}
        />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Changement de format autorisé</p>
          <p className="text-xs text-muted-foreground">PNG → WebP quand c'est plus léger.</p>
        </div>
        <Switch
          checked={settings.allowFormatChange}
          disabled={disabled}
          onCheckedChange={(value) => set("allowFormatChange", value)}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Gauge className="size-3.5" /> Fichiers en parallèle
          </Label>
          <span className="font-mono text-xs text-muted-foreground">{settings.concurrency}</span>
        </div>
        <Slider
          value={[settings.concurrency]}
          min={1}
          max={6}
          step={1}
          disabled={disabled}
          onValueChange={([value]) => set("concurrency", value ?? 2)}
        />
      </div>
    </div>
  );
}
