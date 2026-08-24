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

export const roleValueProposition: Record<DemoRole, string> = {
  JEFE_AREA: "Creá, seguí y firmá las solicitudes de tu área.",
  COLABORADOR: "Consultá tus pagos, ajustes y saldo de viáticos.",
  ADMIN: "Validá solicitudes, resolvé correcciones y mantené las reglas operativas.",
  TESORERIA: "Gestioná pagos y devoluciones con trazabilidad de cada operación.",
};
