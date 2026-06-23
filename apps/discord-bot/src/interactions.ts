import type { DbClient } from "@clip-central/db";
import { fetchUserClipsPage } from "@clip-central/db";
import type { Platform } from "@clip-central/shared";
import { PLATFORMS, PLATFORM_LABELS } from "@clip-central/shared";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  type Client,
  type Interaction,
} from "discord.js";
import type { BotEnv } from "./config.js";
import {
  buildConnectButtons,
  buildConnectEmbed,
  clipCentralLogoFiles,
  buildMyAccountsComponents,
  buildMyStatsEmbed,
  buildMyVideosEmbed,
  buildMyVideosNav,
  formatAccountsMessage,
  startAccountLink,
  upsertUser,
} from "./embeds.js";
import { callWorker } from "./worker-client.js";
import { fetchUserStats } from "./user-stats.js";

/**
 * Returns an error message if the user can't participate in the campaign yet,
 * or `null` if they're allowed. Requires a verified social account on one of
 * the campaign's allowed platforms (or any verified account when the campaign
 * has no platform restriction).
 */
async function getCampaignAccessError(
  db: DbClient,
  discordId: string,
  campaignId: string,
): Promise<string | null> {
  const { data: campaign } = await db
    .from("campaigns")
    .select("platforms")
    .eq("id", campaignId)
    .maybeSingle();

  const platforms = (campaign?.platforms ?? []) as Platform[];

  let query = db
    .from("social_accounts")
    .select("platform")
    .eq("discord_id", discordId)
    .not("verified_at", "is", null);

  if (platforms.length > 0) {
    query = query.in("platform", platforms);
  }

  const { data: accounts } = await query;

  if (accounts && accounts.length > 0) return null;

  const labels =
    platforms.length > 0
      ? platforms.map((p) => PLATFORM_LABELS[p]).join(", ")
      : "a supported platform";

  return (
    `You need a **verified** account on: **${labels}** to join this campaign.\n` +
    `Use the connect panel to link and verify an account, then try again.`
  );
}

export async function handleInteraction(
  interaction: Interaction,
  client: Client,
  db: DbClient,
  env: BotEnv,
): Promise<void> {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "setup-connect") {
      await interaction.reply({
        embeds: [buildConnectEmbed()],
        components: buildConnectButtons(),
        files: clipCentralLogoFiles(),
      });
      return;
    }
  }

  if (interaction.isButton()) {
    const id = interaction.customId;

    if (id === "connect_social") {
      const select = new StringSelectMenuBuilder()
        .setCustomId("select_platform")
        .setPlaceholder("Choose a platform")
        .addOptions(
          PLATFORMS.map((p) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(PLATFORM_LABELS[p])
              .setValue(p),
          ),
        );

      await interaction.reply({
        content: "Select the platform you want to connect:",
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
        ephemeral: true,
      });
      return;
    }

    if (id === "my_accounts") {
      await upsertUser(
        db,
        interaction.user.id,
        interaction.user.username,
        interaction.user.displayAvatarURL({ size: 128 }),
      );

      const { data: accounts } = await db
        .from("social_accounts")
        .select("*")
        .eq("discord_id", interaction.user.id)
        .order("platform")
        .order("handle");

      const list = accounts ?? [];

      await interaction.reply({
        content: formatAccountsMessage(list),
        components: buildMyAccountsComponents(list),
        ephemeral: true,
      });
      return;
    }

    if (id.startsWith("join_campaign:")) {
      const campaignId = id.split(":")[1]!;
      await upsertUser(db, interaction.user.id, interaction.user.username, interaction.user.displayAvatarURL({ size: 128 }));

      const accessError = await getCampaignAccessError(db, interaction.user.id, campaignId);
      if (accessError) {
        await interaction.reply({ content: accessError, ephemeral: true });
        return;
      }

      const { error } = await db.from("campaign_participants").upsert(
        { campaign_id: campaignId, discord_id: interaction.user.id },
        { onConflict: "campaign_id,discord_id" },
      );

      await interaction.reply({
        content: error
          ? `Failed to join: ${error.message}`
          : "✅ You've joined the campaign! Click **Submit Clip** when ready.",
        ephemeral: true,
      });
      return;
    }

    if (id.startsWith("verify_account:")) {
      const accountId = id.slice("verify_account:".length);
      await upsertUser(db, interaction.user.id, interaction.user.username, interaction.user.displayAvatarURL({ size: 128 }));

      const { data: account } = await db
        .from("social_accounts")
        .select("*")
        .eq("id", accountId)
        .eq("discord_id", interaction.user.id)
        .maybeSingle();

      if (!account?.verification_code) {
        await interaction.reply({
          content: "No pending verification. Connect an account first.",
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const result = await callWorker<{ verified: boolean; reason?: string; followerCount?: number }>(
        env,
        "/verify-profile",
        {
          platform: account.platform,
          handle: account.handle,
          verificationCode: account.verification_code,
        },
      );

      if (result.verified) {
        await db
          .from("social_accounts")
          .update({
            verified_at: new Date().toISOString(),
            verification_code: null,
            ...(result.followerCount != null ? { follower_count: result.followerCount } : {}),
          })
          .eq("id", accountId);

        await interaction.editReply(
          `✅ Your ${PLATFORM_LABELS[account.platform]} account **@${account.handle}** is verified!`,
        );
      } else {
        await interaction.editReply(
          `❌ Verification failed. Make sure \`${account.verification_code}\` is in your bio, then try again.`,
        );
      }
      return;
    }

    if (id.startsWith("my_stats:")) {
      const campaignId = id.slice("my_stats:".length);

      await upsertUser(
        db,
        interaction.user.id,
        interaction.user.username,
        interaction.user.displayAvatarURL({ size: 128 }),
      );

      await interaction.deferReply({ ephemeral: true });

      try {
        const stats = await fetchUserStats(db, interaction.user.id, campaignId);
        await interaction.editReply({ embeds: [buildMyStatsEmbed(stats)] });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load stats.";
        await interaction.editReply({ content: `❌ ${message}` });
      }
      return;
    }

    if (id.startsWith("my_videos:")) {
      const parts = id.split(":");
      const campaignId = parts[1]!;
      const page = Math.max(0, Number.parseInt(parts[2] ?? "0", 10) || 0);

      await upsertUser(
        db,
        interaction.user.id,
        interaction.user.username,
        interaction.user.displayAvatarURL({ size: 128 }),
      );

      try {
        const { data: campaign } = await db
          .from("campaigns")
          .select("title")
          .eq("id", campaignId)
          .maybeSingle();

        if (!campaign) {
          await interaction.reply({ content: "❌ Campaign not found.", ephemeral: true });
          return;
        }

        const clipPage = await fetchUserClipsPage(db, interaction.user.id, campaignId, page);
        const embed = buildMyVideosEmbed(clipPage, campaign.title);
        const components = buildMyVideosNav(clipPage);
        const isPagination = interaction.message?.embeds?.some((e) => e.title === "📋 My Videos");

        if (isPagination) {
          await interaction.update({ embeds: [embed], components });
        } else {
          await interaction.reply({ embeds: [embed], components, ephemeral: true });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load videos.";
        if (interaction.message?.embeds?.some((e) => e.title === "📋 My Videos")) {
          await interaction.update({ content: `❌ ${message}`, embeds: [], components: [] });
        } else {
          await interaction.reply({ content: `❌ ${message}`, ephemeral: true });
        }
      }
      return;
    }

    if (id.startsWith("submit_clip:")) {
      const campaignId = id.split(":")[1]!;

      const { data: participant } = await db
        .from("campaign_participants")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("discord_id", interaction.user.id)
        .maybeSingle();

      if (!participant) {
        await interaction.reply({
          content: "You must join the campaign first!",
          ephemeral: true,
        });
        return;
      }

      const accessError = await getCampaignAccessError(db, interaction.user.id, campaignId);
      if (accessError) {
        await interaction.reply({ content: accessError, ephemeral: true });
        return;
      }

      const modal = new ModalBuilder()
        .setCustomId(`submit_modal:${campaignId}`)
        .setTitle("Submit Clip URL")
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("video_url")
              .setLabel("Video URL")
              .setPlaceholder("https://tiktok.com/@you/video/...")
              .setStyle(TextInputStyle.Short)
              .setRequired(true),
          ),
        );

      await interaction.showModal(modal);
      return;
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "select_platform") {
      const platform = interaction.values[0] as Platform;

      const modal = new ModalBuilder()
        .setCustomId(`connect_modal:${platform}`)
        .setTitle(`Connect ${PLATFORM_LABELS[platform]}`)
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("handle")
              .setLabel("Your handle (without @)")
              .setPlaceholder("username")
              .setStyle(TextInputStyle.Short)
              .setRequired(true),
          ),
        );

      await interaction.showModal(modal);
      return;
    }

    if (interaction.customId === "remove_account") {
      const accountId = interaction.values[0]!;

      const { data: account } = await db
        .from("social_accounts")
        .select("*")
        .eq("id", accountId)
        .eq("discord_id", interaction.user.id)
        .maybeSingle();

      if (!account) {
        await interaction.update({
          content: "That account is no longer connected.",
          components: [],
        });
        return;
      }

      await db.from("social_accounts").delete().eq("id", accountId);

      const { data: remaining } = await db
        .from("social_accounts")
        .select("*")
        .eq("discord_id", interaction.user.id)
        .order("platform")
        .order("handle");

      const list = remaining ?? [];

      await interaction.update({
        content:
          `Removed **${PLATFORM_LABELS[account.platform]}** account **@${account.handle}**.\n\n` +
          formatAccountsMessage(list),
        components: buildMyAccountsComponents(list),
      });
      return;
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith("connect_modal:")) {
      const platform = interaction.customId.split(":")[1] as Platform;
      const handle = interaction.fields.getTextInputValue("handle");

      await upsertUser(db, interaction.user.id, interaction.user.username, interaction.user.displayAvatarURL({ size: 128 }));
      const { code, accountId } = await startAccountLink(db, interaction.user.id, platform, handle);

      const verifyRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`verify_account:${accountId}`)
          .setLabel(`Verify @${handle.replace(/^@/, "").slice(0, 20)}`)
          .setStyle(ButtonStyle.Success),
      );

      await interaction.reply({
        content:
          `Add this code to your **${PLATFORM_LABELS[platform]}** bio (@${handle.replace(/^@/, "")}):\n` +
          `\`\`\`${code}\`\`\`\n` +
          `Then click **Verify**.`,
        components: [verifyRow],
        ephemeral: true,
      });
      return;
    }

    if (interaction.customId.startsWith("submit_modal:")) {
      const campaignId = interaction.customId.split(":")[1]!;
      const url = interaction.fields.getTextInputValue("video_url");

      await upsertUser(db, interaction.user.id, interaction.user.username, interaction.user.displayAvatarURL({ size: 128 }));

      await db.from("submission_queue").insert({
        discord_id: interaction.user.id,
        campaign_id: campaignId,
        url: url.trim(),
        status: "pending",
      });

      await interaction.reply({
        content: "⏳ Your clip is being processed. You'll receive a DM with the result.",
        ephemeral: true,
      });
      return;
    }
  }
}
