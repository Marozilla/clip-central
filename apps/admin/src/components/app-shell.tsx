import Link from "next/link";
import Image from "next/image";
import type { Session } from "next-auth";
import { SignOutButton } from "./sign-out-button";
import { MobileNav } from "./mobile-nav";

export function AppShell({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  if (!session) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.06] bg-cc-black/90 backdrop-blur-xl lg:flex">
        <Sidebar session={session} />
      </aside>
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-64">
        <MobileHeader session={session} />
        <main className="flex-1 px-4 py-5 pb-24 sm:px-6 lg:px-10 lg:py-8 lg:pb-8">
          <div className="mx-auto w-full min-w-0 max-w-6xl animate-fade-in">{children}</div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}

function Sidebar({ session }: { session: Session }) {
  return (
    <>
      <div className="flex flex-col gap-1 border-b border-white/[0.06] p-5">
        <LogoLink size="md" />
        <div className="dot-accent mt-4" />
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        <NavLink href="/" icon="campaigns">
          Campaigns
        </NavLink>
        <NavLink href="/users" icon="creators">
          Creators
        </NavLink>
        <NavLink href="/settings" icon="settings">
          Settings
        </NavLink>
        <NavLink href="/campaigns/new" icon="plus">
          New Campaign
        </NavLink>
      </nav>
      <div className="border-t border-white/[0.06] p-4">
        <UserPill name={session.user?.name} image={session.user?.image} />
      </div>
    </>
  );
}

function MobileHeader({ session }: { session: Session }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.06] bg-cc-black/80 px-4 py-3 backdrop-blur-xl lg:hidden">
      <LogoLink size="sm" />
      <span className="truncate text-xs text-white/50">{session.user?.name}</span>
    </header>
  );
}

function LogoLink({ size }: { size: "sm" | "md" }) {
  const imgSize = size === "sm" ? 36 : 44;
  return (
    <Link href="/" className="group flex items-center gap-3">
      <div className="relative shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10 transition-all group-hover:ring-cc-blue/40 group-hover:shadow-glow">
        <Image src="/logo.png" alt="Clip Central" width={imgSize} height={imgSize} className="object-cover" />
      </div>
      {size === "md" && (
        <div>
          <p className="font-display text-lg font-bold tracking-tight text-white">Clip Central</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">Admin</p>
        </div>
      )}
    </Link>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: "campaigns" | "creators" | "plus" | "settings";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition-all hover:bg-white/[0.05] hover:text-white"
    >
      <NavIcon type={icon} />
      {children}
    </Link>
  );
}

function NavIcon({ type }: { type: "campaigns" | "creators" | "plus" | "settings" }) {
  const cls = "h-[18px] w-[18px] shrink-0 opacity-70 group-hover:opacity-100";
  if (type === "campaigns") {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    );
  }
  if (type === "creators") {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    );
  }
  if (type === "settings") {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function UserPill({ name, image }: { name?: string | null; image?: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-2.5 ring-1 ring-white/[0.06]">
      {image ? (
        <img src={image} alt="" className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/10" />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cc-blue/20 text-xs font-bold text-cc-blue">
          {(name ?? "?")[0]?.toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{name}</p>
        <SignOutButton />
      </div>
    </div>
  );
}
