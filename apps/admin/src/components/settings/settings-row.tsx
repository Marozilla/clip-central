import type { ReactNode } from "react";

export function SettingsRow({
  label,
  description,
  htmlFor,
  children,
}: {
  label: string;
  description?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-6 sm:py-5">
      <div className="min-w-0 flex-1">
        <label htmlFor={htmlFor} className="block text-sm font-medium text-white">
          {label}
        </label>
        {description && <p className="mt-0.5 text-sm text-white/40">{description}</p>}
      </div>
      <div className="w-full shrink-0 sm:w-auto sm:min-w-[200px] sm:max-w-xs">{children}</div>
    </div>
  );
}
