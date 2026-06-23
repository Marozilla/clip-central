import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { SettingsLayout } from "@/components/settings";
import { ConnectPanelSettingsCard } from "@/components/settings/connect-panel-settings-card";
import { LeaderboardSettingsCard } from "@/components/settings/leaderboard-settings-card";

export default async function SettingsPage() {
  await requireSession();
  const db = getDb();

  const [{ data: connectPanel }, { data: leaderboard }] = await Promise.all([
    db.from("connect_panel_settings").select("*").eq("id", "main").single(),
    db.from("leaderboard_settings").select("*").eq("id", "main").single(),
  ]);

  if (!leaderboard || !connectPanel) {
    return (
      <div className="py-20 text-center text-white/50">
        Settings schema not found — run the latest database migration.
      </div>
    );
  }

  return (
    <SettingsLayout>
      <ConnectPanelSettingsCard initial={connectPanel} />
      <LeaderboardSettingsCard initial={leaderboard} />
    </SettingsLayout>
  );
}
