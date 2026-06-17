"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "▤" },
  { href: "/lista", label: "Lista", icon: "☰" },
  { href: "/registro", label: "Registro diario", icon: "▦" },
  { href: "/seguimientos", label: "Seguimientos", icon: "◷" },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-border bg-bg-elev">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
          P
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">Prospección</div>
          <div className="text-[11px] text-fg-dim leading-tight">
            Panel de control
          </div>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5 px-3">
        {NAV.map((n) => {
          const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-accent-soft text-fg font-medium"
                  : "text-fg-muted hover:bg-bg-elev-2 hover:text-fg"
              }`}
            >
              <span className="w-4 text-center opacity-80">{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-5 py-4 text-[11px] text-fg-dim">
        Uso personal · Argentina
      </div>
    </aside>
  );
}
