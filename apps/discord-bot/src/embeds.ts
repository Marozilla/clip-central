import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DbClient, SocialAccount, UserClipRow, UserClipsPage } from "@clip-central/db";
import type { ClipReviewNotification, ClipVideoMetadata, Platform } from "@clip-central/shared";
import {
  formatCurrency,
  formatNumber,
  generateVerificationCode,
  normalizeHandle,
  PLATFORM_LABELS,
} from "@clip-central/shared";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type Client,
  type MessageCreateOptions,
  type MessageEditOptions,
  type TextChannel,
} from "discord.js";
import type { BotEnv } from "./config.js";
import type { UserStats } from "./user-stats.js";

// Resolves from both src/ (tsx dev) and dist/ (built) → apps/discord-bot/assets/logo.png
const LOGO_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "logo.png");
const LOGO_ATTACHMENT_NAME = "logo.png";
export const CLIP_CENTRAL_BRAND = "Clip Central";

/** Logo file to attach so embed footers can use attachment://logo.png */
export function clipCentralLogoFiles(): AttachmentBuilder[] {
  if (!existsSync(LOGO_PATH)) return [];
  return [new AttachmentBuilder(LOGO_PATH, { name: LOGO_ATTACHMENT_NAME })];
}

export function applyClipCentralFooter(embed: EmbedBuilder, suffix?: string): EmbedBuilder {
  const text = suffix ? `${CLIP_CENTRAL_BRAND} · ${suffix}` : CLIP_CENTRAL_BRAND;
  if (existsSync(LOGO_PATH)) {
    embed.setFooter({ text, iconURL: `attachment://${LOGO_ATTACHMENT_NAME}` });
  } else {
    embed.setFooter({ text });
  }
  return embed;
}

export async function upsertUser(
  db: DbClient,
  discordId: string,
  username: string,
  avatarUrl?: string | null,
): Promise<void> {
  await db.from("users").upsert(
    {
      discord_id: discordId,
      discord_username: username,
      discord_avatar: avatarUrl ?? null,
    },
    { onConflict: "discord_id" },
  );
}

export const DEFAULT_CONNECT_TITLE = "Connect Your Social Accounts";
export const DEFAULT_CONNECT_DESCRIPTION =
  "Link your social media accounts to participate in clipping campaigns.\n\n" +
  "1. Click **Connect Account** and pick a platform\n" +
  "2. Enter your handle (you can link multiple accounts per platform)\n" +
  "3. Add the verification code to your bio\n" +
  "4. Click **Verify**\n\n" +
  "Use **My Accounts** to view connected accounts or remove one.";

export function buildConnectEmbed(opts?: {
  title?: string | null;
  description?: string | null;
}): EmbedBuilder {
  return applyClipCentralFooter(
    new EmbedBuilder()
      .setTitle(opts?.title?.trim() || DEFAULT_CONNECT_TITLE)
      .setThumbnail(`attachment://${LOGO_ATTACHMENT_NAME}`)
      .setDescription(opts?.description?.trim() || DEFAULT_CONNECT_DESCRIPTION)
      .setColor(0x5865f2),
  );
}

export function buildConnectButtons(): ActionRowBuilder<ButtonBuilder>[] {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("connect_social")
      .setLabel("Connect Account")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("my_accounts")
      .setLabel("My Accounts")
      .setStyle(ButtonStyle.Secondary),
  );
  return [row];
}

export function formatAccountsMessage(accounts: SocialAccount[]): string {
  if (accounts.length === 0) {
    return (
      "You haven't connected any social accounts yet.\n" +
      "Click **Connect Account** to get started."
    );
  }

  const lines = accounts.map((a) => {
    const platform = PLATFORM_LABELS[a.platform];
    const status = a.verified_at ? "✅ Verified" : "⏳ Pending verification";
    const followers =
      a.follower_count != null ? ` · ${formatNumber(a.follower_count)} followers` : "";
    let line = `**${platform}** — @${a.handle} — ${status}${followers}`;
    if (!a.verified_at && a.verification_code) {
      line += `\n> Add \`${a.verification_code}\` to your bio, then click **Verify**.`;
    }
    return line;
  });

  return `**Your connected accounts:**\n\n${lines.join("\n\n")}`;
}

export function buildMyAccountsComponents(
  accounts: SocialAccount[],
): Array<ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>> {
  const rows: Array<ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>> = [];

  const pending = accounts.filter((a) => !a.verified_at && a.verification_code);
  for (let i = 0; i < pending.length; i += 5) {
    const verifyRow = new ActionRowBuilder<ButtonBuilder>();
    for (const account of pending.slice(i, i + 5)) {
      verifyRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`verify_account:${account.id}`)
          .setLabel(`Verify @${account.handle.slice(0, 20)}`)
          .setStyle(ButtonStyle.Success),
      );
    }
    rows.push(verifyRow);
  }

  if (accounts.length > 0) {
    const select = new StringSelectMenuBuilder()
      .setCustomId("remove_account")
      .setPlaceholder("Remove an account…")
      .addOptions(
        accounts.slice(0, 25).map((a) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`${PLATFORM_LABELS[a.platform]} — @${a.handle}`)
            .setDescription(a.verified_at ? "Verified" : "Pending verification")
            .setValue(a.id),
        ),
      );
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select));
  }

  return rows;
}

export interface CampaignEmbedData {
  id: string;
  title: string;
  description: string | null;
  rate_per_view: number;
  budget_cap?: number | null;
  platforms: Platform[];
  ends_at: string | null;
  status: string;
  min_views_for_payout?: number | null;
  embed_thumbnail_url?: string | null;
  embed_image_url?: string | null;
}

const DEFAULT_INTRO =
  "All you gotta do is **join the campaign** with the button below & follow the campaign details to start making money.";

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Compact view counts, e.g. 1000 → "1K", 1500 → "1.5K". */
function formatCompactViews(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}K`;
  }
  return formatNumber(n);
}

/** Human deadline like "June 30, 2026". */
function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function buildCampaignEmbed(campaign: CampaignEmbedData): EmbedBuilder {
  const sections: string[] = [];

  // Intro: campaign blurb, or a default call to action.
  sections.push(campaign.description?.trim() || DEFAULT_INTRO);

  // Campaign Details
  const detailLines: string[] = [];
  const platforms = campaign.platforms.map((p) => PLATFORM_LABELS[p]).join(", ");
  if (platforms) detailLines.push(`> • **Platforms:** ${platforms}`);
  if (campaign.ends_at) detailLines.push(`> • **Deadline:** ${formatDeadline(campaign.ends_at)}`);
  if (detailLines.length > 0) {
    sections.push(`📋 **Campaign Details:**\n${detailLines.join("\n")}`);
  }

  // Payment Details
  const payLines: string[] = [];
  const cpm = Number(campaign.rate_per_view);
  if (cpm > 0) payLines.push(`> • **CPM:** ${formatUsd(cpm)} per 1,000 views`);

  const budget = Number(campaign.budget_cap ?? 0);
  if (budget > 0) {
    const totalViews =
      cpm > 0 ? ` Up To (${formatNumber(Math.floor((budget / cpm) * 1000))}) Total Views` : "";
    payLines.push(`> • **Budget:** ${formatUsd(budget)}${totalViews}`);
  }

  const minViews = Number(campaign.min_views_for_payout ?? 0);
  if (minViews > 0) {
    payLines.push(`> • **Minimum Views Before Payout:** ${formatCompactViews(minViews)} views`);
  }
  if (payLines.length > 0) {
    sections.push(`💵 **Payment Details:**\n${payLines.join("\n")}`);
  }

  const embed = new EmbedBuilder()
    .setTitle(campaign.title || "Campaign")
    .setColor(0xdfaa47)
    .setDescription(sections.join("\n\n"));

  // Custom thumbnail wins; otherwise fall back to the attached Clip Central logo.
  const customThumb = campaign.embed_thumbnail_url?.trim();
  if (customThumb) {
    embed.setThumbnail(customThumb);
  } else if (existsSync(LOGO_PATH)) {
    embed.setThumbnail(`attachment://${LOGO_ATTACHMENT_NAME}`);
  }

  const customImage = campaign.embed_image_url?.trim();
  if (customImage) {
    embed.setImage(customImage);
  }

  return applyClipCentralFooter(embed);
}

/** `@everyone` ping line shown above the embed. */
function buildCampaignContent(campaign: CampaignEmbedData): string {
  return campaign.ends_at
    ? `New campaign available until ${formatDeadline(campaign.ends_at)} @everyone`
    : "New campaign available @everyone";
}

/** Logo attachment for embed footers (and default campaign thumbnail). */
function campaignEmbedFiles(_campaign?: CampaignEmbedData): AttachmentBuilder[] {
  return clipCentralLogoFiles();
}

/** Full message payload (embed + buttons + optional logo file) for posting. */
export function buildCampaignMessage(campaign: CampaignEmbedData): MessageCreateOptions {
  return {
    content: buildCampaignContent(campaign),
    embeds: [buildCampaignEmbed(campaign)],
    components: buildCampaignButtons(campaign.id, campaign.status === "active"),
    files: campaignEmbedFiles(campaign),
  };
}

/** Full message payload for editing an existing campaign message. */
export function buildCampaignEditMessage(campaign: CampaignEmbedData): MessageEditOptions {
  return {
    content: buildCampaignContent(campaign),
    embeds: [buildCampaignEmbed(campaign)],
    components: buildCampaignButtons(campaign.id, campaign.status === "active"),
    files: campaignEmbedFiles(campaign),
  };
}

export function buildCampaignButtons(
  campaignId: string,
  isActive = true,
): ActionRowBuilder<ButtonBuilder>[] {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`join_campaign:${campaignId}`)
      .setLabel("Join Campaign")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🎯")
      .setDisabled(!isActive),
    new ButtonBuilder()
      .setCustomId(`submit_clip:${campaignId}`)
      .setLabel("Submit Clip")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🎬")
      .setDisabled(!isActive),
    new ButtonBuilder()
      .setCustomId(`my_stats:${campaignId}`)
      .setLabel("My Stats")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📊"),
    new ButtonBuilder()
      .setCustomId(`my_videos:${campaignId}:0`)
      .setLabel("My Videos")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📋"),
  );

  return [row];
}

function clipStatusEmoji(status: UserClipRow["status"]): string {
  switch (status) {
    case "pending":
      return "🟡";
    case "rejected":
      return "🔴";
    case "approved":
    case "tracking":
      return "🟢";
    default:
      return "⚪";
  }
}

function formatUserClipLine(clip: UserClipRow): string {
  const emoji = clipStatusEmoji(clip.status);
  const label = clip.title?.trim() || "Untitled clip";
  const truncated = label.length > 55 ? `${label.slice(0, 52)}...` : label;
  const views = formatNumber(clip.current_views);
  const platform = PLATFORM_LABELS[clip.platform as Platform] ?? clip.platform;
  return `${emoji} [${truncated}](${clip.url}) · **${views}** views · ${platform}`;
}

export function buildMyStatsEmbed(stats: UserStats): EmbedBuilder {
  return applyClipCentralFooter(
    new EmbedBuilder()
      .setTitle("📊 My Stats")
      .setColor(0x5865f2)
      .setDescription(`Your performance in **${stats.campaignTitle}**.`)
      .addFields(
        { name: "Approved Clips", value: formatNumber(stats.approvedClips), inline: true },
        { name: "Views Gained", value: formatNumber(stats.totalViewsGained), inline: true },
        { name: "Total Earnings", value: formatCurrency(stats.totalEarnings), inline: true },
      )
      .setTimestamp(new Date()),
    "Approved clips only · This campaign",
  );
}

export function buildMyVideosEmbed(page: UserClipsPage, campaignTitle: string): EmbedBuilder {
  const { clips, page: pageNum, totalCount, pageSize } = page;
  const description =
    clips.length > 0
      ? clips.map(formatUserClipLine).join("\n")
      : "_You haven't submitted any clips to this campaign yet. Click **Submit Clip** to get started!_";

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const footerSuffix =
    totalCount > pageSize
      ? `Page ${pageNum + 1} of ${totalPages} · 🟡 Pending · 🟢 Approved · 🔴 Denied`
      : "🟡 Pending · 🟢 Approved · 🔴 Denied";

  return applyClipCentralFooter(
    new EmbedBuilder()
      .setTitle("📋 My Videos")
      .setDescription(`Clips submitted to **${campaignTitle}**.\n\n${description}`)
      .setColor(0x5865f2)
      .setTimestamp(new Date()),
    footerSuffix,
  );
}

export function buildMyVideosNav(
  page: UserClipsPage,
): ActionRowBuilder<ButtonBuilder>[] {
  if (page.totalCount <= page.pageSize) return [];

  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`my_videos:${page.campaignId}:${page.page - 1}`)
        .setLabel("◀ Previous")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page.page === 0),
      new ButtonBuilder()
        .setCustomId(`my_videos:${page.campaignId}:${page.page + 1}`)
        .setLabel("Next ▶")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!page.hasMore),
    ),
  ];
}

export async function postCampaignEmbed(
  client: Client,
  db: DbClient,
  campaignId: string,
): Promise<string | null> {
  const { data: campaign } = await db
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (!campaign?.discord_channel_id) return null;

  const channel = await client.channels.fetch(campaign.discord_channel_id);
  if (!channel?.isTextBased()) return null;

  const msg = await (channel as TextChannel).send(buildCampaignMessage(campaign));

  await db
    .from("campaigns")
    .update({ discord_message_id: msg.id })
    .eq("id", campaignId);

  return msg.id;
}

export async function editCampaignEmbed(
  client: Client,
  db: DbClient,
  campaignId: string,
): Promise<void> {
  const { data: campaign } = await db
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (!campaign?.discord_channel_id || !campaign.discord_message_id) return;

  const channel = await client.channels.fetch(campaign.discord_channel_id);
  if (!channel?.isTextBased()) return;

  try {
    const msg = await (channel as TextChannel).messages.fetch(campaign.discord_message_id);
    // Replace attachments so the logo/custom media stays in sync on edit.
    await msg.edit({ ...buildCampaignEditMessage(campaign), attachments: [] });
  } catch {
    console.warn("Could not edit campaign embed, may need repost");
  }
}

/**
 * Re-render every campaign that has already been posted to Discord, rebuilding
 * each message with the current embed code. Runs on bot startup so layout
 * changes take effect on existing campaigns without manually editing each one.
 */
export async function refreshAllCampaignEmbeds(
  client: Client,
  db: DbClient,
): Promise<{ updated: number; failed: number }> {
  const { data: campaigns } = await db
    .from("campaigns")
    .select("id")
    .not("discord_message_id", "is", null);

  let updated = 0;
  let failed = 0;

  for (const campaign of campaigns ?? []) {
    try {
      await editCampaignEmbed(client, db, campaign.id);
      updated++;
    } catch (err) {
      failed++;
      console.warn(`Failed to refresh campaign embed ${campaign.id}:`, err);
    }
  }

  return { updated, failed };
}

export async function startAccountLink(
  db: DbClient,
  discordId: string,
  platform: Platform,
  handle: string,
): Promise<{ code: string; accountId: string }> {
  const code = generateVerificationCode();
  const normalized = normalizeHandle(handle);

  const { data, error } = await db
    .from("social_accounts")
    .upsert(
      {
        discord_id: discordId,
        platform,
        handle: normalized,
        verification_code: code,
        verified_at: null,
      },
      { onConflict: "discord_id,platform,handle" },
    )
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to link account");
  }

  return { code, accountId: data.id };
}

export async function sendDm(
  client: Client,
  discordId: string,
  messageOrOptions: string | { content?: string; embeds?: EmbedBuilder[] },
): Promise<boolean> {
  const payload =
    typeof messageOrOptions === "string" ? { content: messageOrOptions } : messageOrOptions;

  try {
    const user = await client.users.fetch(discordId);
    const files = payload.embeds?.length ? clipCentralLogoFiles() : undefined;
    await user.send({
      content: payload.content,
      embeds: payload.embeds,
      files,
    });
    return true;
  } catch {
    return false;
  }
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

function truncateEmbedText(text: string, max = 1024): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 3)}...`;
}

const CLIP_REVIEW_CONFIG: Record<
  ClipReviewNotification["kind"],
  { color: number; title: string; description: string }
> = {
  submitted: {
    color: 0x5865f2,
    title: "Clip Submitted",
    description:
      "Your clip was received and is **pending staff review**.\n" +
      "You'll be notified once it's approved.",
  },
  approved: {
    color: 0x57f287,
    title: "Clip Approved",
    description:
      "Your clip was **approved**! View tracking is now active — earnings update as your views grow.",
  },
  rejected: {
    color: 0xed4245,
    title: "Clip Not Approved",
    description: "Your clip was **not approved** for this campaign.",
  },
  failed: {
    color: 0xed4245,
    title: "Clip Submission Failed",
    description: "Your clip could **not** be submitted. See details below and try again.",
  },
};

function platformFromUrl(url: string): Platform | undefined {
  if (/tiktok\.com|vm\.tiktok/i.test(url)) return "tiktok";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/instagram\.com/i.test(url)) return "instagram";
  if (/twitter\.com|x\.com/i.test(url)) return "twitter";
  return undefined;
}

/** DM embed for clip submitted / approved / rejected / failed notifications. */
export function buildClipReviewEmbed(data: ClipReviewNotification): EmbedBuilder {
  const config = CLIP_REVIEW_CONFIG[data.kind]!;
  const meta = data.metadata;
  const embed = new EmbedBuilder()
    .setColor(config.color)
    .setTitle(truncateEmbedText(data.campaignTitle, 256))
    .setURL(data.url)
    .setDescription(`**${config.title}**\n\n${config.description}`)
    .setTimestamp();

  const thumb = meta?.thumbnailSource?.trim();
  if (thumb) embed.setThumbnail(thumb);

  const platform = data.platform ?? platformFromUrl(data.url);
  const fields: { name: string; value: string; inline?: boolean }[] = [];

  if (platform) {
    fields.push({ name: "Platform", value: PLATFORM_LABELS[platform], inline: true });
  }

  if (data.linkedHandle) {
    if (data.ownerHandle) {
      fields.push({ name: "Video owner", value: `@${data.ownerHandle}`, inline: true });
    }
    fields.push({ name: "Your account", value: `@${data.linkedHandle}`, inline: true });
  } else if (data.ownerHandle) {
    fields.push({ name: "Account", value: `@${data.ownerHandle}`, inline: true });
  }

  const views = data.views ?? 0;
  if (views > 0 || data.kind === "submitted" || data.kind === "approved") {
    fields.push({ name: "Views", value: formatNumber(views), inline: true });
  }

  if (meta?.likeCount != null) {
    fields.push({ name: "Likes", value: formatNumber(meta.likeCount), inline: true });
  }
  if (meta?.commentCount != null) {
    fields.push({ name: "Comments", value: formatNumber(meta.commentCount), inline: true });
  }
  if (meta?.shareCount != null) {
    fields.push({ name: "Shares", value: formatNumber(meta.shareCount), inline: true });
  }
  if (meta?.durationSeconds != null) {
    fields.push({ name: "Duration", value: formatDuration(meta.durationSeconds), inline: true });
  }

  embed.addFields(fields);

  const caption = meta?.title?.trim();
  if (caption) {
    embed.addFields({ name: "Caption", value: truncateEmbedText(caption) });
  }

  if (data.kind === "rejected" && data.rejectReason?.trim()) {
    embed.addFields({ name: "Reason", value: truncateEmbedText(data.rejectReason.trim()) });
  }

  if (data.kind === "failed" && data.error?.trim()) {
    embed.addFields({ name: "Reason", value: truncateEmbedText(data.error.trim()) });
  }

  embed.addFields({ name: "Clip link", value: data.url });

  return applyClipCentralFooter(embed);
}

export async function sendChannelMessage(
  client: Client,
  channelId: string,
  content: string,
  embed?: EmbedBuilder,
): Promise<string | null> {
  const channel = await client.channels.fetch(channelId);
  if (!channel?.isTextBased()) return null;

  const msg = await (channel as TextChannel).send({
    content,
    embeds: embed ? [applyClipCentralFooter(embed)] : [],
    files: embed ? clipCentralLogoFiles() : undefined,
  });
  return msg.id;
}
