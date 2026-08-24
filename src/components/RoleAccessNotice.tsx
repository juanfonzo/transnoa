import Link from "next/link";
import type { DemoRole } from "@/lib/roles";
import { roleLabels } from "@/lib/roles";

type RoleAccessNoticeProps = {
  currentRole: DemoRole;
  allowedRoles: DemoRole[];
  message?: string;
};

export function RoleAccessNotice({
  currentRole,
  allowedRoles,
  message,
}: RoleAccessNoticeProps) {
  return (
    <section className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-white p-6 text-center shadow-sm sm:p-8">
      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
        Vista no disponible
      </span>
      <h2 className="mt-4 text-2xl font-semibold text-slate-900">
        Este módulo no corresponde al rol activo
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {message ?? (
          <>
            Estás recorriendo la demo como {roleLabels[currentRole]}. Esta vista está
            preparada para {allowedRoles.map((role) => roleLabels[role]).join(" o ")}.
          </>
        )}
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        Volver al panel
      </Link>
    </section>
  );
}
