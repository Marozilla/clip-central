"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { SettingsAlert, SettingsStatusBadge } from "./settings-status";
import { SettingsRow } from "./settings-row";
import { SettingsSection } from "./settings-section";
import { SettingsToggle } from "./settings-toggle";

type Channel = { id: string; name: string };

export type LeaderboardSettings = {
  enabled: boolean;
  discord_channel_id: string | null;
  discord_message_id: string | null;
  refresh_interval_minutes: number;
  last_posted_at: string | null;
  updated_at: string;
};

export function LeaderboardSettingsCard({ initial }: { initial: LeaderboardSettings }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/discord/channels")
      .then((r) => r.json())
      .then((data) => {
        if (data.channels?.length) setChannels(data.channels);
        else if (data.error) setChannelsError(data.error);
      })
      .catch(() => setChannelsError("Could not load channels — is the bot running?"));
  }, []);

  async function save(partial: Partial<LeaderboardSettings>) {
    setLoading("save");
    setMessage(null);
    const res = await fetch("/api/settings/leaderboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? "Failed to save" });
      return false;
    }
    setSettings(data);
    router.refresh();
    return true;
  }

  async function refreshNow() {
    setLoading("refresh");
    setMessage(null);
    const res = await fetch("/api/settings/leaderboard/refresh", { method: "POST" });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? "Failed to update Discord embed" });
      return;
    }
    setMessage({
      type: "success",
      text: data.posted ? "Leaderboard posted to Discord." : "Leaderboard embed updated.",
    });
    router.refresh();
  }

  async function handleToggle(enabled: boolean) {
    if (enabled && !settings.discord_channel_id) {
      setMessage({ type: "error", text: "Choose a Discord channel first." });
      return;
    }
    const ok = await save({ enabled });
    if (ok && enabled) await refreshNow();
  }

  const selectedChannel = channels.find((c) => c.id === settings.discord_channel_id);

  return (
    <SettingsSection
      id="leaderboard"
      title="Leaderboard"
      description="Live Discord embed ranking the top 10 creators by campaign views gained."
      badge={<SettingsStatusBadge active={settings.enabled} />}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/35">
            {settings.last_posted_at
              ? `Last synced ${new Date(settings.last_posted_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : "Not synced yet"}
            {settings.discord_message_id && (
              <span className="hidden sm:inline">
                {" "}
                · Message{" "}
                <span className="font-mono text-white/45">{settings.discord_message_id.slice(0, 8)}…</span>
              </span>
            )}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={refreshNow}
            disabled={!!loading || !settings.discord_channel_id}
          >
            {loading === "refresh" ? "Syncing…" : "Sync now"}
          </Button>
        </div>
      }
    >
      {message && (
        <div className="px-5 py-4 sm:px-6">
          <SettingsAlert variant={message.type === "error" ? "error" : "success"}>
            {message.text}
          </SettingsAlert>
        </div>
      )}

      <SettingsRow
        label="Enabled"
        description="When on, the bot keeps the embed updated on your schedule."
        htmlFor="leaderboard-enabled"
      >
        <div className="flex justify-end">
          <SettingsToggle
            id="leaderboard-enabled"
            checked={settings.enabled}
            disabled={!!loading}
            onChange={handleToggle}
          />
        </div>
      </SettingsRow>

      <SettingsRow
        label="Channel"
        description="Where the leaderboard embed is posted and edited in place."
      >
        {channels.length > 0 ? (
          <Select
            value={settings.discord_channel_id ?? ""}
            onChange={(channelId) => save({ discord_channel_id: channelId || null })}
            disabled={!!loading}
            placeholder="Select channel…"
            options={[
              { value: "", label: "Select channel…" },
              ...channels.map((ch) => ({ value: ch.id, label: `#${ch.name}` })),
            ]}
          />
        ) : (
          <input
            value={settings.discord_channel_id ?? ""}
            onChange={(e) =>
              setSettings((s) => ({ ...s, discord_channel_id: e.target.value || null }))
            }
            onBlur={() => save({ discord_channel_id: settings.discord_channel_id || null })}
            placeholder="Channel ID"
            className="input-field font-mono text-xs"
            disabled={!!loading}
          />
        )}
        {channelsError && <p className="mt-2 text-xs text-cc-gold">{channelsError}</p>}
        {selectedChannel && !channelsError && (
          <p className="mt-2 text-xs text-white/30">Posting to #{selectedChannel.name}</p>
        )}
      </SettingsRow>

      <SettingsRow
        label="Refresh interval"
        description="How often the bot re-fetches rankings and edits the embed."
        htmlFor="leaderboard-interval"
      >
        <div className="flex items-center gap-2">
          <input
            id="leaderboard-interval"
            type="number"
            min={1}
            max={60}
            value={settings.refresh_interval_minutes}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                refresh_interval_minutes: Number(e.target.value) || 10,
              }))
            }
            onBlur={() => save({ refresh_interval_minutes: settings.refresh_interval_minutes })}
            className="input-field w-20 text-center tabular-nums"
            disabled={!!loading}
          />
          <span className="text-sm text-white/40">min</span>
        </div>
      </SettingsRow>
    </SettingsSection>
  );
}
