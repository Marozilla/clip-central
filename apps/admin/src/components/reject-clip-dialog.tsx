"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function RejectClipDialog({
  open,
  clipTitle,
  onCancel,
  onConfirm,
  loading,
}: {
  open: boolean;
  clipTitle?: string | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}) {
  const [reason, setReason] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={loading ? undefined : onCancel}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#12141a] p-5 shadow-2xl">
        <h3 className="font-display text-lg font-semibold text-white">Reject clip</h3>
        <p className="mt-1 text-sm text-white/50">
          {clipTitle ? `"${clipTitle}"` : "This clip"} will be rejected and the submitter will be notified on Discord.
        </p>

        <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-white/35">
          Reason (optional)
        </label>
        <textarea
          ref={inputRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Wrong game, low quality, not original content…"
          rows={3}
          disabled={loading}
          className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-cc-blue/50 focus:outline-none focus:ring-1 focus:ring-cc-blue/30 disabled:opacity-50"
        />
        <p className="mt-1.5 text-[11px] text-white/30">Included in the DM if provided.</p>

        <div className="mt-5 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" className="flex-1" onClick={() => onConfirm(reason)} disabled={loading}>
            {loading ? "Rejecting…" : "Reject clip"}
          </Button>
        </div>
      </div>
    </div>
  );
}
