"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Panel" },
  { href: "/solicitudes", label: "Solicitudes" },
  { href: "/administracion", label: "Administracion" },
  { href: "/tesoreria", label: "Tesoreria" },
  { href: "/colaboradores", label: "Colaboradores" },
  { href: "/reportes", label: "Reportes" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-6 py-3 text-sm font-medium text-slate-600">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3 py-1 transition ${
                isActive
                  ? "bg-slate-900 text-white shadow"
                  : "hover:bg-slate-100"
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

