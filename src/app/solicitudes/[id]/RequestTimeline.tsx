import type { RequestTimelineEvent, RequestTimelineTone } from "@/lib/request-timeline";
import { formatDateTime } from "@/lib/format";

const toneClasses: Record<RequestTimelineTone, string> = {
  slate: "border-slate-300 bg-slate-100",
  sky: "border-sky-300 bg-sky-100",
  amber: "border-amber-300 bg-amber-100",
  emerald: "border-emerald-300 bg-emerald-100",
  rose: "border-rose-300 bg-rose-100",
};

export function RequestTimeline({ events }: { events: RequestTimelineEvent[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Trazabilidad
      </p>
      <h2 className="mt-1 text-xl font-semibold text-slate-900">Historia de la solicitud</h2>
      <p className="mt-1 text-sm text-slate-600">
        Últimos eventos primero, registrados desde las fuentes operativas.
      </p>

      <ol className="mt-6 space-y-0">
        {events.map((event, index) => (
          <li key={event.id} className="relative grid grid-cols-[20px_1fr] gap-3 pb-6 last:pb-0">
            {index < events.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-[9px] top-5 h-full w-px bg-slate-200"
              />
            )}
            <span
              aria-hidden="true"
              className={`relative z-10 mt-1 h-5 w-5 rounded-full border-4 border-white ring-1 ring-slate-200 ${toneClasses[event.tone]}`}
            />
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{event.title}</p>
              <p className="mt-1 text-sm leading-5 text-slate-600">{event.description}</p>
              <time className="mt-2 block text-xs text-slate-400" dateTime={event.at.toISOString()}>
                {formatDateTime(event.at)}
              </time>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
