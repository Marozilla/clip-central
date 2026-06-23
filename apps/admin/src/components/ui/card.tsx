import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`glass overflow-hidden rounded-2xl shadow-card ${className}`}>{children}</div>
  );
}
