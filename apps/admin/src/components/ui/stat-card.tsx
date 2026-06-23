import type { ReactNode } from "react";

const accents = {
  blue: "from-cc-blue/20 to-transparent border-cc-blue/30",
  green: "from-cc-green/20 to-transparent border-cc-green/30",
  gold: "from-cc-gold/20 to-transparent border-cc-gold/30",
  orange: "from-cc-orange/20 to-transparent border-cc-orange/30",
} as const;

export function StatCard({
  label,
  value,
  sub,
  accent = "blue",
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: keyof typeof accents;
}) {
  return (
    <div
      className={`glass group relative overflow-hidden rounded-2xl border-l-2 bg-gradient-to-br p-5 transition-all hover:border-white/15 ${accents[accent]}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">{label}</p>
      <p className="font-display mt-1 text-2xl font-bold tracking-tight text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-white/35">{sub}</p>}
    </div>
  );
}
