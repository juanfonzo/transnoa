"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DemoRole, demoRoles, roleLabels } from "@/lib/roles";
import { setRole } from "@/app/actions/set-role";

type RoleSwitcherProps = {
  currentRole: DemoRole;
};

export function RoleSwitcher({ currentRole }: RoleSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedRole, setSelectedRole] = useState<DemoRole>(currentRole);

  useEffect(() => {
    setSelectedRole(currentRole);
  }, [currentRole]);

  const handleChange = (value: DemoRole) => {
    setSelectedRole(value);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("role", value);
      await setRole(formData);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
        Modo demo
      </div>
      <label className="text-sm font-medium text-slate-700" htmlFor="demo-role">
        Rol activo
      </label>
      <div className="relative">
        <select
          id="demo-role"
          name="role"
          value={selectedRole}
          onChange={(event) => handleChange(event.target.value as DemoRole)}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 pr-10 text-sm font-semibold text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none"
        >
          {demoRoles.map((role) => (
            <option key={role} value={role}>
              {roleLabels[role]}
            </option>
          ))}
        </select>
        {isPending && (
          <span className="pointer-events-none absolute right-3 top-2.5 h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        )}
      </div>
    </div>
  );
}
