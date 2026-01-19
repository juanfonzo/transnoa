import { cookies } from "next/headers";
import { DemoRole, demoRoles } from "@/lib/roles";

const ROLE_COOKIE = "demo_role";

export async function getDemoRole(): Promise<DemoRole> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ROLE_COOKIE)?.value;
  if (value && demoRoles.includes(value as DemoRole)) {
    return value as DemoRole;
  }
  return "ADMIN";
}

export async function setDemoRole(role: DemoRole) {
  const cookieStore = await cookies();
  cookieStore.set(ROLE_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}
