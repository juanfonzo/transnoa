export const demoRoles = ["JEFE_AREA", "COLABORADOR", "ADMIN", "TESORERIA"] as const;

export type DemoRole = (typeof demoRoles)[number];

export const roleLabels: Record<DemoRole, string> = {
  JEFE_AREA: "Jefe de Área",
  COLABORADOR: "Colaborador",
  ADMIN: "Administración",
  TESORERIA: "Tesorería",
};

