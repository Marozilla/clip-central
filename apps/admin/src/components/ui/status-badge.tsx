const styles: Record<string, string> = {
  active: "bg-cc-green/15 text-cc-green ring-cc-green/30",
  draft: "bg-white/5 text-white/50 ring-white/10",
  paused: "bg-cc-gold/15 text-cc-gold ring-cc-gold/30",
  completed: "bg-white/5 text-white/40 ring-white/10",
  cancelled: "bg-red-500/15 text-red-400 ring-red-500/30",
  pending: "bg-cc-gold/15 text-cc-gold ring-cc-gold/30",
  approved: "bg-cc-green/15 text-cc-green ring-cc-green/30",
  rejected: "bg-red-500/15 text-red-400 ring-red-500/30",
  tracking: "bg-cc-blue/15 text-cc-blue ring-cc-blue/30",
  deleted: "bg-white/5 text-white/30 ring-white/10 line-through",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${styles[status] ?? styles.draft}`}
    >
      {status}
    </span>
  );
}
