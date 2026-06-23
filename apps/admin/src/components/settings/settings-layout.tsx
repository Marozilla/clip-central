import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui";
import { SettingsNav, type SettingsNavGroup } from "./settings-nav";

const DEFAULT_GROUPS: SettingsNavGroup[] = [
  {
    label: "Discord",
    items: [
      { id: "connect-panel", label: "Connect Panel" },
      { id: "leaderboard", label: "Leaderboard" },
    ],
  },
];

export function SettingsLayout({
  children,
  groups = DEFAULT_GROUPS,
}: {
  children: ReactNode;
  groups?: SettingsNavGroup[];
}) {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage integrations, embeds, and workspace preferences."
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
        <SettingsNav groups={groups} />
        <div className="min-w-0 flex-1 space-y-6">{children}</div>
      </div>
    </div>
  );
}
