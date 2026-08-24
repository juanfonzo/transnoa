import type { DemoRole } from "@/lib/roles";

export type DemoNavItem = {
  href: string;
  label: string;
};

export const navigationByRole: Record<DemoRole, DemoNavItem[]> = {
  JEFE_AREA: [
    { href: "/", label: "Panel" },
    { href: "/solicitudes", label: "Solicitudes" },
  ],
  COLABORADOR: [
    { href: "/", label: "Panel" },
    { href: "/colaboradores", label: "Mi cuenta" },
  ],
  ADMIN: [
    { href: "/", label: "Panel" },
    { href: "/administracion", label: "Administración" },
    { href: "/colaboradores", label: "Colaboradores" },
    { href: "/reportes", label: "Reportes" },
  ],
  TESORERIA: [
    { href: "/", label: "Panel" },
    { href: "/tesoreria", label: "Tesorería" },
    { href: "/reportes", label: "Reportes" },
  ],
};
