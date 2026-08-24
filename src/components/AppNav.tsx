"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationByRole } from "@/lib/demo-experience";
import type { DemoRole } from "@/lib/roles";

type AppNavProps = {
  currentRole: DemoRole;
};

export function AppNav({ currentRole }: AppNavProps) {
  const pathname = usePathname();
  const navItems = navigationByRole[currentRole];

  return (
    <nav
      aria-label="Navegación principal"
      className="border-b border-slate-200/70 bg-white/90 backdrop-blur"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2.5 text-sm font-medium text-slate-600 sm:px-6">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`min-h-10 shrink-0 rounded-full px-4 py-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                isActive
                  ? "bg-slate-900 text-white shadow"
                  : "hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

