"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/auth/signin" })}
      className="text-[11px] font-medium text-white/35 transition-colors hover:text-cc-orange"
    >
      Sign out
    </button>
  );
}
