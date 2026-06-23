"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { SettingsAlert, SettingsStatusBadge } from "./settings-status";
import { SettingsRow } from "./settings-row";
import { SettingsSection } from "./settings-section";

type Channel = { id: string; name: string };

export type ConnectPanelSettings = {
  discord_channel_id: string | null;
  discord_message_id: string | null;
  title: string | null;
  description: string | null;
  last_posted_at: string | null;
  updated_at: string;
};

const TITLE_PLACEHOLDER = "Connect Your Social Accounts";
const DESCRIPTION_PLACEHOLDER =
  "Link your social media accounts to participate in clipping campaigns.";

export function ConnectPanelSettingsCard({ initial }: { initial: ConnectPanelSettings }) {
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

  async function save(partial: Partial<ConnectPanelSettings>) {
    setLoading("save");
    setMessage(null);
    const res = await fetch("/api/settings/connect-panel", {
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

  async function postNow() {
    if (!settings.discord_channel_id) {
      setMessage({ type: "error", text: "Choose a Discord channel first." });
      return;
    }
    setLoading("post");
    setMessage(null);
    const res = await fetch("/api/settings/connect-panel/refresh", { method: "POST" });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? "Failed to post the connect panel" });
      return;
    }
    setMessage({
      type: "success",
      text: data.posted ? "Connect panel posted to Discord." : "Connect panel updated.",
    });
    router.refresh();
  }

  const selectedChannel = channels.find((c) => c.id === settings.discord_channel_id);
  const isPosted = !!settings.discord_message_id;

  return (
    <SettingsSection
      id="connect-panel"
      title="Connect Panel"
      description="The Discord embed with a Connect button that lets creators link and verify their social accounts."
      badge={
        <SettingsStatusBadge active={isPosted} activeLabel="Posted" inactiveLabel="Not posted" />
      }
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/35">
            {settings.last_posted_at
              ? `Last posted ${new Date(settings.last_posted_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : "Not posted yet"}
            {settings.discord_message_id && (
              <span className="hidden sm:inline">
                {" "}
                · Message{" "}
                <span className="font-mono text-white/45">
                  {settings.discord_message_id.slice(0, 8)}…
                </span>
              </span>
            )}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={postNow}
            disabled={!!loading || !settings.discord_channel_id}
          >
            {loading === "post" ? "Posting…" : isPosted ? "Update panel" : "Post panel"}
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
        label="Channel"
        description="Where the connect panel is posted and edited in place."
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
        label="Title"
        description="Embed heading. Leave blank to use the default."
        htmlFor="connect-panel-title"
      >
        <input
          id="connect-panel-title"
          value={settings.title ?? ""}
          onChange={(e) => setSettings((s) => ({ ...s, title: e.target.value }))}
          onBlur={() => save({ title: settings.title ?? "" })}
          placeholder={TITLE_PLACEHOLDER}
          className="input-field"
          disabled={!!loading}
        />
      </SettingsRow>

      <SettingsRow
        label="Description"
        description="Embed body text. Leave blank to use the default instructions."
        htmlFor="connect-panel-description"
      >
        <textarea
          id="connect-panel-description"
          rows={4}
          value={settings.description ?? ""}
          onChange={(e) => setSettings((s) => ({ ...s, description: e.target.value }))}
          onBlur={() => save({ description: settings.description ?? "" })}
          placeholder={DESCRIPTION_PLACEHOLDER}
          className="input-field resize-none"
          disabled={!!loading}
        />
      </SettingsRow>
    </SettingsSection>
  );
}
