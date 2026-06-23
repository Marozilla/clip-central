"use client";

import { useEffect, useState } from "react";

export type SettingsNavGroup = {
  label: string;
  items: { id: string; label: string }[];
};

export function SettingsNav({ groups }: { groups: SettingsNavGroup[] }) {
  const [activeId, setActiveId] = useState(groups[0]?.items[0]?.id ?? "");

  useEffect(() => {
    const ids = groups.flatMap((g) => g.items.map((i) => i.id));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [groups]);

  return (
    <nav className="lg:w-52 lg:shrink-0">
      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-6 lg:overflow-visible lg:pb-0">
        {groups.map((group) => (
          <div key={group.label} className="min-w-0 shrink-0 lg:shrink">
            <p className="mb-2 hidden px-2 text-[11px] font-semibold uppercase tracking-widest text-white/30 lg:block">
              {group.label}
            </p>
            <ul className="flex gap-1 lg:flex-col lg:gap-0.5">
              {group.items.map((item) => {
                const active = activeId === item.id;
                return (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      onClick={() => setActiveId(item.id)}
                      className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:whitespace-normal ${
                        active
                          ? "bg-white/[0.08] text-white ring-1 ring-white/[0.08]"
                          : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
                      }`}
                    >
                      {item.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
