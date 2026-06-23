import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { getAdminDiscordIds } from "./env";

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: "identify email" } },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const discordId = (profile as { id?: string } | undefined)?.id;
      if (!discordId) return false;
      return getAdminDiscordIds().includes(discordId);
    },
    async jwt({ token, profile }) {
      const discordProfile = profile as { id?: string } | undefined;
      if (discordProfile?.id) {
        token.discordId = discordProfile.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.discordId) {
        session.user.id = token.discordId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
