import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const db = getDb();

  const { data: users, error: usersError } = await db
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const enriched = await Promise.all(
    (users ?? []).map(async (user) => {
      const { data: accounts } = await db
        .from("social_accounts")
        .select("*")
        .eq("discord_id", user.discord_id);

      const { count: clipCount } = await db
        .from("clips")
        .select("*", { count: "exact", head: true })
        .eq("discord_id", user.discord_id);

      return { ...user, social_accounts: accounts ?? [], clip_count: clipCount ?? 0 };
    }),
  );

  return NextResponse.json(enriched);
}
