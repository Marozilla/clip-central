import { createSupabaseClient } from "@clip-central/db";
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import { loadBotEnv } from "./config.js";
import { refreshAllCampaignEmbeds } from "./embeds.js";
import { createInternalServer } from "./http.js";
import { handleInteraction } from "./interactions.js";
import { startLeaderboardPoller } from "./leaderboard-poller.js";
import { startQueuePoller } from "./queue-processor.js";

const commands = [
  new SlashCommandBuilder()
    .setName("setup-connect")
    .setDescription("Post the connect socials panel in this channel"),
].map((c) => c.toJSON());

async function main() {
  const env = loadBotEnv();
  const db = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
    ],
  });

  client.once("ready", async () => {
    console.log(`Logged in as ${client.user?.tag}`);

    const rest = new REST().setToken(env.DISCORD_TOKEN);
    if (env.DISCORD_GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID), {
        body: commands,
      });
      console.log("Registered guild commands");
    } else {
      await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: commands });
      console.log("Registered global commands");
    }

    const refreshed = await refreshAllCampaignEmbeds(client, db);
    console.log(
      `Refreshed campaign embeds: ${refreshed.updated} updated, ${refreshed.failed} failed`,
    );

    startQueuePoller(client, db, env);
    console.log("Submission queue poller started");

    startLeaderboardPoller(client, db);
    console.log("Leaderboard poller started (checks every minute)");
  });

  client.on("interactionCreate", (interaction) => {
    handleInteraction(interaction, client, db, env).catch((err) => {
      console.error("Interaction error:", err);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        interaction.reply({ content: "Something went wrong.", ephemeral: true }).catch(() => {});
      }
    });
  });

  const app = createInternalServer(client, env);
  app.listen(env.BOT_HTTP_PORT, () => {
    console.log(`Bot internal HTTP on :${env.BOT_HTTP_PORT}`);
  });

  await client.login(env.DISCORD_TOKEN);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
