import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "./button";

export function PageHeader({
  title,
  description,
  action,
  actionHref,
  actionLabel,
  backHref,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  backHref?: string;
}) {
  return (
    <div className="mb-8 animate-slide-up">
      {backHref && (
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-cc-blue"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
          {description && <p className="mt-1.5 text-sm text-white/45">{description}</p>}
        </div>
        {(action ?? (actionHref && actionLabel)) && (
          <div className="w-full shrink-0 sm:w-auto">
            {action ?? (
              <Link href={actionHref!} className="block sm:inline-block">
                <Button className="w-full sm:w-auto">{actionLabel}</Button>
              </Link>
            )}
          </div>
        )}
      </div>
      <div className="dot-accent mt-6 max-w-xs" />
    </div>
  );
}
