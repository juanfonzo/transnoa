import type { DemoRole } from "@/lib/roles";

export type DemoNavItem = {
  href: string;
  label: string;
};

export const landingByRole: Record<DemoRole, string> = {
  JEFE_AREA: "/solicitudes",
  COLABORADOR: "/colaboradores",
  ADMIN: "/administracion",
  TESORERIA: "/tesoreria",
};

export const navigationByRole: Record<DemoRole, DemoNavItem[]> = {
  JEFE_AREA: [{ href: "/solicitudes", label: "Solicitudes" }],
  COLABORADOR: [{ href: "/colaboradores", label: "Mi cuenta" }],
  ADMIN: [
    { href: "/administracion", label: "Administración" },
    { href: "/colaboradores", label: "Colaboradores" },
    { href: "/reportes", label: "Reportes" },
  ],
  TESORERIA: [
    { href: "/tesoreria", label: "Tesorería" },
    { href: "/reportes", label: "Reportes" },
  ],
};
