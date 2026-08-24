"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DemoRole, demoRoles, roleLabels } from "@/lib/roles";
import { setRole } from "@/app/actions/set-role";
import { landingByRole } from "@/lib/demo-experience";

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
      router.push(landingByRole[value]);
      router.refresh();
    });
  };

  return (
    <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 sm:flex-none sm:gap-3">
      <div className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
        <span className="sm:hidden">Demo</span>
        <span className="hidden sm:inline">Modo demo</span>
      </div>
      <label className="sr-only text-sm font-medium text-slate-700 lg:not-sr-only" htmlFor="demo-role">
        Rol activo
      </label>
      <div className="relative min-w-0 flex-1 sm:flex-none">
        <select
          id="demo-role"
          name="role"
          value={selectedRole}
          onChange={(event) => handleChange(event.target.value as DemoRole)}
          disabled={isPending}
          className="min-h-11 w-full rounded-full border border-slate-200 bg-white px-4 py-2 pr-10 text-sm font-semibold text-slate-800 shadow-sm focus-visible:border-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-wait disabled:bg-slate-50 sm:w-auto"
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

