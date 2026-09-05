import { formatBytes, formatPercent, formatRate } from "@/lib/format";

interface StatsBarProps {
  count: number;
  totalOriginal: number;
  doneCount: number;
  doneOriginal: number;
  doneFinal: number;
  saved: number;
  rate: number;
}

/** Live totals for the current batch. */
export function StatsBar(props: StatsBarProps) {
  const ratio = props.doneOriginal > 0 ? (props.saved / props.doneOriginal) * 100 : 0;

  const items = [
    { label: "Fichiers", value: `${props.doneCount} / ${props.count}` },
    { label: "Volume d'origine", value: formatBytes(props.totalOriginal) },
    { label: "Espace économisé", value: formatBytes(props.saved), accent: true },
    { label: "Réduction", value: formatPercent(ratio, 1), accent: true },
    { label: "Débit", value: formatRate(props.rate) },
  ];

  return (
    <div className="glass-panel grid grid-cols-2 gap-4 rounded-2xl p-5 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p
            className={`font-display mt-1 text-lg font-semibold ${
              item.accent ? "text-primary" : "text-foreground"
            }`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
