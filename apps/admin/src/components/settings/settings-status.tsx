import type { ReactNode } from "react";

export function SettingsStatusBadge({
  active,
  activeLabel = "Active",
  inactiveLabel = "Inactive",
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
        active
          ? "bg-cc-green/15 text-cc-green ring-1 ring-cc-green/25"
          : "bg-white/5 text-white/40 ring-1 ring-white/10"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-cc-green animate-pulse" : "bg-white/30"}`}
      />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

export function SettingsAlert({
  variant,
  children,
}: {
  variant: "success" | "error";
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-xl px-4 py-3 text-sm ${
        variant === "error"
          ? "bg-red-500/10 text-red-300 ring-1 ring-red-500/20"
          : "bg-cc-green/10 text-cc-green ring-1 ring-cc-green/20"
      }`}
    >
      {children}
    </div>
  );
}
