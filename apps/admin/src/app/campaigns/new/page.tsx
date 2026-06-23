"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PLATFORMS, PLATFORM_LABELS } from "@clip-central/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

type Channel = { id: string; name: string };

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelsError, setChannelsError] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("");
  const [guildId, setGuildId] = useState("");

  useEffect(() => {
    fetch("/api/discord/channels")
      .then((r) => r.json())
      .then((data) => {
        setChannels(data.channels ?? []);
        if (data.defaultGuildId) setGuildId(data.defaultGuildId);
        if (data.defaultChannelId) setSelectedChannel(data.defaultChannelId);
        else if (data.channels?.[0]?.id) setSelectedChannel(data.channels[0].id);
        if (data.error) setChannelsError(data.error);
      })
      .catch(() => setChannelsError("Could not load Discord channels — is the bot running?"));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const platforms = PLATFORMS.filter((p) => form.get(`platform_${p}`) === "on");
    if (!selectedChannel) {
      setError("Pick a Discord channel to post the campaign embed.");
      setLoading(false);
      return;
    }

    const minViewsRaw = form.get("min_views_for_payout") as string;
    const body = {
      title: form.get("title"),
      description: form.get("description") || null,
      rate_per_view: parseFloat(form.get("rate_per_view") as string),
      budget_cap: parseFloat(form.get("budget_cap") as string),
      min_views_for_payout: minViewsRaw ? parseInt(minViewsRaw, 10) : 0,
      embed_thumbnail_url: ((form.get("embed_thumbnail_url") as string) || "").trim() || null,
      embed_image_url: ((form.get("embed_image_url") as string) || "").trim() || null,
      platforms,
      discord_channel_id: selectedChannel || null,
      discord_guild_id: guildId || null,
    };

    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to create campaign");
      setLoading(false);
      return;
    }

    if (data.discord && !data.discord.ok) {
      router.push(
        `/campaigns/${data.id}?discord_error=${encodeURIComponent(data.discord.error ?? "Discord post failed")}`,
      );
      return;
    }

    router.push(`/campaigns/${data.id}`);
  }

  return (
    <div className="max-w-2xl w-full animate-slide-up">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-white">New Campaign</h1>
        <p className="mt-1.5 text-sm text-white/45">
          Active campaigns post the join/submit embed to Discord automatically.
        </p>
        <div className="dot-accent mt-5 max-w-xs" />
      </div>

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Field label="Title" name="title" required placeholder="Summer Clipping Challenge" />
          <Field label="Description" name="description" textarea placeholder="What should creators make clips about?" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="CPM ($ per 1,000 views)" name="rate_per_view" type="number" step="0.01" required placeholder="3.50" />
            <Field label="Budget cap ($)" name="budget_cap" type="number" step="0.01" required placeholder="500.00" />
          </div>

          <Field
            label="Min views before payout"
            name="min_views_for_payout"
            type="number"
            step="1"
            min="0"
            defaultValue="0"
            placeholder="0"
            hint="Views a clip must gain after submitting before it starts earning. 0 = pay from the first view."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Embed thumbnail URL"
              name="embed_thumbnail_url"
              type="url"
              placeholder="Defaults to Clip Central logo"
              hint="Small image, top-right of the Discord embed."
            />
            <Field
              label="Embed image URL"
              name="embed_image_url"
              type="url"
              placeholder="https://…/banner.png"
              hint="Large hero image at the bottom of the embed."
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-white/40">
              Discord Channel <span className="text-cc-orange">*</span>
            </label>
            {channels.length > 0 ? (
              <Select
                value={selectedChannel}
                onChange={setSelectedChannel}
                placeholder="Select a channel…"
                options={[
                  { value: "", label: "Select a channel…" },
                  ...channels.map((ch) => ({ value: ch.id, label: `#${ch.name}` })),
                ]}
              />
            ) : (
              <input
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                placeholder="Channel ID (start the bot to load channels)"
                className="input-field"
              />
            )}
            {channelsError && <p className="mt-2 text-xs text-cc-gold">{channelsError}</p>}
          </div>

          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-widest text-white/40">
              Allowed Platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <label
                  key={p}
                  className="flex cursor-pointer items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-sm ring-1 ring-white/[0.06] transition-all has-[:checked]:bg-cc-blue/15 has-[:checked]:ring-cc-blue/40"
                >
                  <input
                    type="checkbox"
                    name={`platform_${p}`}
                    defaultChecked
                    className="rounded border-white/20 bg-transparent text-cc-blue focus:ring-cc-blue/30"
                  />
                  {PLATFORM_LABELS[p]}
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400 ring-1 ring-red-500/20">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button type="submit" disabled={loading} size="lg" className="w-full sm:w-auto">
              {loading ? "Creating…" : "Create & Post to Discord"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.back()} className="w-full sm:w-auto">
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  textarea,
  step,
  min,
  defaultValue,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
  step?: string;
  min?: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-white/40">
        {label}
      </label>
      {textarea ? (
        <textarea name={name} rows={3} placeholder={placeholder} className="input-field resize-none" />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          step={step}
          min={min}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="input-field"
        />
      )}
      {hint && <p className="mt-1.5 text-xs text-white/35">{hint}</p>}
    </div>
  );
}
