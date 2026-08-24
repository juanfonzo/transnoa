import Link from "next/link";

export default function RequestDetailNotFound() {
  return (
    <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Solicitud no encontrada
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-900">
        El registro ya no está disponible
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Puede haber sido eliminado de la base de pruebas o el enlace no corresponde a una solicitud válida.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        Volver al panel
      </Link>
    </section>
  );
}
