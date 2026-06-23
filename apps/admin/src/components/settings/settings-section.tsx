import type { ReactNode } from "react";
import { Card } from "@/components/ui";

export function SettingsSection({
  id,
  title,
  description,
  badge,
  children,
  footer,
}: {
  id: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <Card className="overflow-hidden p-0">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-white">{title}</h2>
            {description && <p className="mt-1 text-sm leading-relaxed text-white/45">{description}</p>}
          </div>
          {badge}
        </div>

        <div className="divide-y divide-white/[0.06]">{children}</div>

        {footer && (
          <div className="border-t border-white/[0.06] bg-white/[0.02] px-5 py-4 sm:px-6">{footer}</div>
        )}
      </Card>
    </section>
  );
}
