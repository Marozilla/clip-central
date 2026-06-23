"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CampaignActions({
  campaignId,
  status,
  discordMessageId,
  discordChannelId,
}: {
  campaignId: string;
  status: string;
  discordMessageId: string | null;
  discordChannelId: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const discordError = searchParams.get("discord_error");
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(discordError);

  async function refreshViews() {
    setLoading("refresh");
    await fetch(`/api/campaigns/${campaignId}/refresh`, { method: "POST" });
    setLoading(null);
    router.refresh();
  }

  async function postToDiscord() {
    setLoading("discord");
    setMessage(null);
    const res = await fetch(`/api/campaigns/${campaignId}/discord`, { method: "POST" });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setMessage(data.error ?? "Failed to post to Discord");
      return;
    }
    setMessage("Campaign embed posted to Discord.");
    router.refresh();
  }

  async function updateStatus(newStatus: string) {
    setLoading(newStatus);
    setMessage(null);
    const res = await fetch(`/api/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    setLoading(null);
    if (data.discord && !data.discord.ok) {
      setMessage(data.discord.error);
    }
    router.refresh();
  }

  const isError =
    message &&
    (message.includes("Failed") ||
      message.includes("Could not") ||
      message.includes("not") ||
      message.includes("error"));

  return (
    <div className="flex w-full flex-col gap-3 sm:items-end">
      <div className="flex w-full flex-wrap gap-2">
        {!discordMessageId && discordChannelId && status !== "completed" && (
          <Button variant="discord" onClick={postToDiscord} disabled={!!loading}>
            {loading === "discord" ? "Posting…" : "Post to Discord"}
          </Button>
        )}
        <Button variant="secondary" onClick={refreshViews} disabled={!!loading} size="sm">
          {loading === "refresh" ? "Refreshing…" : "↻ Refresh Views"}
        </Button>
        {status === "active" && (
          <Button variant="gold" onClick={() => updateStatus("paused")} disabled={!!loading} size="sm">
            Pause
          </Button>
        )}
        {(status === "paused" || status === "completed") && (
          <Button variant="success" onClick={() => updateStatus("active")} disabled={!!loading} size="sm">
            {status === "completed" ? "Reopen Campaign" : "Activate"}
          </Button>
        )}
        {status !== "completed" && status !== "draft" && (
          <Button variant="ghost" onClick={() => updateStatus("completed")} disabled={!!loading} size="sm">
            Complete
          </Button>
        )}
      </div>
      {message && (
        <p className={`w-full text-xs sm:max-w-sm sm:text-right ${isError ? "text-red-400" : "text-cc-gold"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
