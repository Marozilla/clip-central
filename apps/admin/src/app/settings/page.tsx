import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { SettingsLayout } from "@/components/settings";
import { ConnectPanelSettingsCard } from "@/components/settings/connect-panel-settings-card";
import { LeaderboardSettingsCard } from "@/components/settings/leaderboard-settings-card";

export default async function SettingsPage() {
  await requireSession();
  const db = getDb();

  const [{ data: connectPanel, error: connectPanelError }, { data: leaderboard, error: leaderboardError }] =
    await Promise.all([
      db.from("connect_panel_settings").select("*").eq("id", "main").maybeSingle(),
      db.from("leaderboard_settings").select("*").eq("id", "main").maybeSingle(),
    ]);

  if (connectPanelError?.code === "42P01" || leaderboardError?.code === "42P01") {
    return (
      <div className="py-20 text-center text-white/50">
        Settings tables are missing — run migrations in{" "}
        <code className="text-white/70">supabase/migrations/</code>.
      </div>
    );
  }

  if (!leaderboard || !connectPanel) {
    return (
      <div className="py-20 text-center text-white/50">
        Settings data is missing — seed the default row with:
        <pre className="mx-auto mt-4 max-w-lg text-left text-sm text-white/70">
{`INSERT INTO connect_panel_settings (id) VALUES ('main') ON CONFLICT DO NOTHING;
INSERT INTO leaderboard_settings (id) VALUES ('main') ON CONFLICT DO NOTHING;`}
        </pre>
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
