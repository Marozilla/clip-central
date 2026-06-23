import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { PLATFORM_LABELS, formatNumber } from "@clip-central/shared";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export default async function UsersPage() {
  await requireSession();
  const db = getDb();

  const { data: users } = await db.from("users").select("*").order("created_at", { ascending: false });

  const enriched = await Promise.all(
    (users ?? []).map(async (user) => {
      const { data: accounts } = await db
        .from("social_accounts")
        .select("*")
        .eq("discord_id", user.discord_id);

      const { count } = await db
        .from("clips")
        .select("*", { count: "exact", head: true })
        .eq("discord_id", user.discord_id);

      return { user, accounts: accounts ?? [], clipCount: count ?? 0 };
    }),
  );

  return (
    <div>
      <PageHeader title="Creators" description="Discord users who've interacted with your campaigns." />

      {!enriched.length ? (
        <Card>
          <EmptyState
            title="No creators yet"
            description="Creators appear here when they join a campaign or link a social account in Discord."
          />
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3 md:hidden">
            {enriched.map(({ user, accounts, clipCount }) => (
              <div key={user.discord_id} className="glass rounded-2xl p-4">
                <div className="mb-3 flex items-center gap-3">
                  <CreatorAvatar
                    username={user.discord_username}
                    avatar={user.discord_avatar}
                    className="h-10 w-10"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{user.discord_username}</p>
                    <p className="truncate font-mono text-[10px] text-white/30">{user.discord_id}</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-white/[0.05] px-2 py-1 text-xs font-semibold">
                    {clipCount} clips
                  </span>
                </div>
                {accounts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {accounts.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/[0.04] px-2 py-1 text-[11px] ring-1 ring-white/[0.06]"
                      >
                        <span className="text-white/50">{PLATFORM_LABELS[a.platform]}</span>
                        <span className="text-white/80">@{a.handle}</span>
                        {a.follower_count != null && (
                          <span className="text-white/40">· {formatNumber(a.follower_count)}</span>
                        )}
                        {a.verified_at ? (
                          <span className="text-cc-green">✓</span>
                        ) : (
                          <span className="text-cc-gold">○</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-[11px] text-white/30">
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          <Card className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] font-semibold uppercase tracking-widest text-white/35">
                    <th className="px-4 py-4 lg:px-6">Creator</th>
                    <th className="px-4 py-4 lg:px-6">Linked Accounts</th>
                    <th className="px-4 py-4 lg:px-6">Clips</th>
                    <th className="px-4 py-4 lg:px-6">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {enriched.map(({ user, accounts, clipCount }) => (
                    <tr key={user.discord_id} className="table-row-hover border-b border-white/[0.04] last:border-0">
                      <td className="px-4 py-4 lg:px-6">
                        <div className="flex items-center gap-3">
                          <CreatorAvatar
                            username={user.discord_username}
                            avatar={user.discord_avatar}
                            className="h-9 w-9"
                          />
                          <div>
                            <p className="font-medium text-white">{user.discord_username}</p>
                            <p className="font-mono text-[10px] text-white/30">{user.discord_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 lg:px-6">
                        {accounts.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {accounts.map((a) => (
                              <span
                                key={a.id}
                                className="inline-flex items-center gap-1 rounded-lg bg-white/[0.04] px-2 py-1 text-[11px] ring-1 ring-white/[0.06]"
                              >
                                <span className="text-white/50">{PLATFORM_LABELS[a.platform]}</span>
                                <span className="text-white/80">@{a.handle}</span>
                        {a.follower_count != null && (
                          <span className="text-white/40">· {formatNumber(a.follower_count)}</span>
                        )}
                                {a.verified_at ? (
                                  <span className="text-cc-green">✓</span>
                                ) : (
                                  <span className="text-cc-gold">○</span>
                                )}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-white/25">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 lg:px-6">
                        <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg bg-white/[0.05] px-2 text-xs font-semibold">
                          {clipCount}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-white/40 lg:px-6">
                        {new Date(user.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function CreatorAvatar({
  username,
  avatar,
  className,
}: {
  username: string;
  avatar: string | null;
  className: string;
}) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt=""
        className={`${className} shrink-0 rounded-xl object-cover ring-1 ring-white/10`}
      />
    );
  }
  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-xl bg-cc-blue/15 text-sm font-bold text-cc-blue ring-1 ring-cc-blue/25`}
    >
      {username[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
