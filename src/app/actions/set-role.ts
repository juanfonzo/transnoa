"use server";

import { DemoRole, demoRoles } from "@/lib/roles";
import { setDemoRole } from "@/lib/demo-auth";

export async function setRole(formData: FormData) {
  const role = formData.get("role");
  if (!role || !demoRoles.includes(role as DemoRole)) {
    return;
  }

  await setDemoRole(role as DemoRole);
}

