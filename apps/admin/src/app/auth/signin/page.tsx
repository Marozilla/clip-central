"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-mesh-gradient" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cc-blue/10 blur-[120px]" />

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="glass-strong overflow-hidden rounded-3xl p-8 shadow-glow ring-1 ring-white/10 sm:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <Image
              src="/logo.png"
              alt="Clip Central"
              width={96}
              height={96}
              className="mb-5"
              priority
            />
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">Clip Central</h1>
            <p className="mt-2 text-sm text-white/45">Campaign command center for your clipping empire</p>

          </div>

          <button
            onClick={() => signIn("discord", { callbackUrl: "/" })}
            className="group flex w-full items-center justify-center gap-3 rounded-xl bg-[#5865F2] px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#4752C4] hover:shadow-[0_0_30px_-5px_rgba(88,101,242,0.5)]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" />
            </svg>
            Continue with Discord
          </button>

          <p className="mt-6 text-center text-[11px] text-white/25">
            Staff access only · Authorized Discord accounts
          </p>
        </div>
      </div>
    </div>
  );
}
