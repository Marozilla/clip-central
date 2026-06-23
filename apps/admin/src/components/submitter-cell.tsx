export type ClipSubmitter = {
  discord_id: string;
  discord_username: string;
  discord_avatar: string | null;
};

export function SubmitterCell({
  submitter,
  ownerHandle,
}: {
  submitter?: ClipSubmitter | null;
  ownerHandle?: string | null;
}) {
  const name = submitter?.discord_username ?? "Unknown";
  const avatar = submitter?.discord_avatar;

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {avatar ? (
        <img
          src={avatar}
          alt=""
          className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cc-blue/15 text-xs font-bold text-cc-blue ring-1 ring-cc-blue/25">
          {name[0]?.toUpperCase() ?? "?"}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{name}</p>
        {ownerHandle && (
          <p className="truncate text-[11px] text-white/40">@{ownerHandle.replace(/^@/, "")}</p>
        )}
      </div>
    </div>
  );
}
