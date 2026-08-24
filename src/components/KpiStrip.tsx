import type { ReactNode } from "react";

export type KpiTone = "slate" | "sky" | "amber" | "emerald" | "rose";

export type KpiItem = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: KpiTone;
  valueClassName?: string;
};

const toneClasses: Record<KpiTone, string> = {
  slate: "bg-slate-400",
  sky: "bg-sky-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
};

type KpiStripProps = {
  items: KpiItem[];
  label: string;
  className?: string;
};

export function KpiStrip({ items, label, className = "" }: KpiStripProps) {
  return (
    <dl
      aria-label={label}
      className={`flex overflow-x-auto border-y border-slate-200 ${className}`}
    >
      {items.map((item) => {
        const tone = item.tone ?? "slate";
        return (
          <div
            key={item.label}
            className="min-w-56 flex-1 overflow-hidden border-r border-slate-200 px-4 py-3 first:pl-0 last:border-r-0 last:pr-0 sm:min-w-48 sm:px-5"
          >
            <dt className="flex items-center gap-2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${toneClasses[tone]}`}
              />
              {item.label}
            </dt>
            <dd className="mt-1 flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
              <span
                className={`whitespace-nowrap text-2xl font-semibold tracking-tight text-slate-950 ${item.valueClassName ?? ""}`}
              >
                {item.value}
              </span>
              {item.detail !== undefined && (
                <span className="whitespace-nowrap text-xs font-medium text-slate-500">
                  {item.detail}
                </span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
