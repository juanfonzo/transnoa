"use client";

import type { RequestStatus } from "@prisma/client";
import { FormEvent, useMemo, useRef, useState } from "react";
import { SolicitudActions } from "@/app/solicitudes/SolicitudActions";
import { StatusPill } from "@/components/StatusPill";
import { getRequestStatusLabel } from "@/lib/status";

export type SolicitudListRow = {
  requestId: string;
  requestNumber: string;
  createdAtLabel: string;
  areaName: string;
  versionLabel: string;
  loteLabel: string;
  dateRangeLabel: string;
  total: number;
  totalLabel: string;
  status: RequestStatus;
  detailHref: string;
};

type SolicitudesListProps = {
  rows: SolicitudListRow[];
};

type ColumnKey =
  | "request"
  | "area"
  | "version"
  | "lote"
  | "dates"
  | "total"
  | "status"
  | "actions";

type TokenColumn = "request" | "lote" | "dates" | "total";
type SelectColumn = "area" | "version" | "status" | "actions";

type SelectOption = {
  value: string;
  label: string;
};

const columns: Array<{
  key: ColumnKey;
  label: string;
  align?: "right";
}> = [
  { key: "request", label: "Solicitud" },
  { key: "area", label: "Área" },
  { key: "version", label: "Versión" },
  { key: "lote", label: "Lote" },
  { key: "dates", label: "Fechas" },
  { key: "total", label: "Total", align: "right" },
  { key: "status", label: "Estado" },
  { key: "actions", label: "Acciones" },
];

const tokenColumns: TokenColumn[] = ["request", "lote", "dates", "total"];
const selectColumns: SelectColumn[] = ["area", "version", "status", "actions"];

const columnLabels: Record<ColumnKey, string> = Object.fromEntries(
  columns.map((column) => [column.key, column.label]),
) as Record<ColumnKey, string>;

const initialTokenFilters: Record<TokenColumn, string[]> = {
  request: [],
  lote: [],
  dates: [],
  total: [],
};

const initialSelectFilters: Record<SelectColumn, string> = {
  area: "",
  version: "",
  status: "",
  actions: "",
};

function isTokenColumn(column: ColumnKey): column is TokenColumn {
  return tokenColumns.includes(column as TokenColumn);
}

function isSelectColumn(column: ColumnKey): column is SelectColumn {
  return selectColumns.includes(column as SelectColumn);
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-AR")
    .trim();
}

function matchesTokens(value: string, tokens: string[]) {
  const normalizedValue = normalizeSearchValue(value);
  return tokens.every((token) =>
    normalizedValue.includes(normalizeSearchValue(token)),
  );
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <span className="relative inline-flex size-5 shrink-0 items-center justify-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="size-4"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      {active && (
        <span className="absolute right-0 top-0 size-1.5 rounded-full bg-sky-500" />
      )}
    </span>
  );
}

export function SolicitudesList({ rows }: SolicitudesListProps) {
  const [activeColumn, setActiveColumn] = useState<ColumnKey | null>(null);
  const [draftToken, setDraftToken] = useState("");
  const [tokenFilters, setTokenFilters] = useState(initialTokenFilters);
  const [selectFilters, setSelectFilters] = useState(initialSelectFilters);
  const filterTriggerRef = useRef<HTMLButtonElement | null>(null);

  const selectOptions = useMemo<Record<SelectColumn, SelectOption[]>>(() => {
    const uniqueOptions = (values: string[]) =>
      Array.from(new Set(values))
        .sort((a, b) => a.localeCompare(b, "es"))
        .map((value) => ({ value, label: value }));

    const statuses = Array.from(new Set(rows.map((row) => row.status)))
      .map((status) => ({ value: status, label: getRequestStatusLabel(status) }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));

    return {
      area: uniqueOptions(rows.map((row) => row.areaName)),
      version: uniqueOptions(rows.map((row) => row.versionLabel)),
      status: statuses,
      actions: [
        { value: "SIGNATURE", label: "Requiere firma" },
        { value: "FOLLOW_UP", label: "Sólo seguimiento" },
      ],
    };
  }, [rows]);

  const hasColumnFilter = (column: ColumnKey) =>
    isTokenColumn(column)
      ? tokenFilters[column].length > 0
      : isSelectColumn(column) && Boolean(selectFilters[column]);

  const hasFilters =
    tokenColumns.some((column) => tokenFilters[column].length > 0) ||
    selectColumns.some((column) => Boolean(selectFilters[column]));

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const actionValue =
          row.status === "PENDING_SIGNATURE" ? "SIGNATURE" : "FOLLOW_UP";

        return (
          matchesTokens(
            `${row.requestNumber} ${row.createdAtLabel}`,
            tokenFilters.request,
          ) &&
          matchesTokens(row.loteLabel, tokenFilters.lote) &&
          matchesTokens(row.dateRangeLabel, tokenFilters.dates) &&
          matchesTokens(`${row.totalLabel} ${row.total}`, tokenFilters.total) &&
          (!selectFilters.area || row.areaName === selectFilters.area) &&
          (!selectFilters.version || row.versionLabel === selectFilters.version) &&
          (!selectFilters.status || row.status === selectFilters.status) &&
          (!selectFilters.actions || actionValue === selectFilters.actions)
        );
      }),
    [rows, selectFilters, tokenFilters],
  );

  const openColumnFilter = (
    column: ColumnKey,
    trigger?: HTMLButtonElement,
  ) => {
    if (trigger) {
      filterTriggerRef.current = trigger;
    }
    setDraftToken("");
    setActiveColumn((current) => (current === column ? null : column));
  };

  const closeFilter = () => {
    setActiveColumn(null);
    window.requestAnimationFrame(() => filterTriggerRef.current?.focus());
  };

  const addToken = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeColumn || !isTokenColumn(activeColumn)) return;

    const token = draftToken.trim();
    if (!token) return;

    setTokenFilters((current) => ({
      ...current,
      [activeColumn]: current[activeColumn].some(
        (existing) => normalizeSearchValue(existing) === normalizeSearchValue(token),
      )
        ? current[activeColumn]
        : [...current[activeColumn], token],
    }));
    setDraftToken("");
  };

  const removeToken = (column: TokenColumn, token: string) => {
    setTokenFilters((current) => ({
      ...current,
      [column]: current[column].filter((currentToken) => currentToken !== token),
    }));
  };

  const clearFilters = () => {
    setTokenFilters(initialTokenFilters);
    setSelectFilters(initialSelectFilters);
    setDraftToken("");
  };

  const activeFilterChips = [
    ...tokenColumns.flatMap((column) =>
      tokenFilters[column].map((token) => ({
        id: `${column}-${token}`,
        column,
        label: `${columnLabels[column]}: ${token}`,
        onRemove: () => removeToken(column, token),
      })),
    ),
    ...selectColumns.flatMap((column) => {
      const value = selectFilters[column];
      if (!value) return [];
      const selectedLabel =
        selectOptions[column].find((option) => option.value === value)?.label ?? value;
      return [
        {
          id: `${column}-${value}`,
          column,
          label: `${columnLabels[column]}: ${selectedLabel}`,
          onRemove: () =>
            setSelectFilters((current) => ({ ...current, [column]: "" })),
        },
      ];
    }),
  ];
  const visibleCountLabel = `${filteredRows.length} ${
    filteredRows.length === 1 ? "solicitud visible" : "solicitudes visibles"
  } de ${rows.length}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 md:hidden">
        <p className="text-sm text-slate-500">
          {visibleCountLabel}
        </p>
        <button
          type="button"
          onClick={(event) =>
            openColumnFilter(activeColumn ?? "request", event.currentTarget)
          }
          aria-expanded={Boolean(activeColumn)}
          aria-controls="solicitudes-filter-panel"
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          <SearchIcon active={hasFilters} />
          Filtrar
        </button>
      </div>

      {activeColumn && (
        <section
          id="solicitudes-filter-panel"
          aria-label={`Filtro de ${columnLabels[activeColumn]}`}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeFilter();
            }
          }}
          className="border-y border-slate-200 bg-slate-50/50 px-4 py-3"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Filtrar listado
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {columnLabels[activeColumn]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeFilter}
                  className="min-h-10 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                >
                  Cerrar
                </button>
              </div>

              <label className="mb-3 block text-xs font-medium text-slate-600 md:hidden">
                Columna
                <select
                  value={activeColumn}
                  onChange={(event) => {
                    setDraftToken("");
                    setActiveColumn(event.target.value as ColumnKey);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {columns.map((column) => (
                    <option key={column.key} value={column.key}>
                      {column.label}
                    </option>
                  ))}
                </select>
              </label>

              {isTokenColumn(activeColumn) ? (
                <form onSubmit={addToken} className="flex flex-col gap-2 sm:flex-row">
                  <label className="min-w-0 flex-1 text-xs font-medium text-slate-600">
                    Agregar término
                    <input
                      autoFocus
                      value={draftToken}
                      onChange={(event) => setDraftToken(event.target.value)}
                      placeholder="Escribí un término y presioná Enter"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={!draftToken.trim()}
                    className="min-h-10 self-end rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Agregar
                  </button>
                </form>
              ) : (
                <label className="block text-xs font-medium text-slate-600">
                  Seleccionar opción
                  <select
                    autoFocus
                    value={selectFilters[activeColumn]}
                    onChange={(event) =>
                      setSelectFilters((current) => ({
                        ...current,
                        [activeColumn]: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 sm:max-w-sm"
                  >
                    <option value="">Todas</option>
                    {selectOptions[activeColumn].map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>
        </section>
      )}

      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Filtros activos">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Filtros
          </span>
          {activeFilterChips.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={filter.onRemove}
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              aria-label={`Quitar filtro ${filter.label}`}
            >
              {filter.label}
              <span aria-hidden="true" className="text-slate-400">
                ×
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="min-h-9 px-2 text-xs font-semibold text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {visibleCountLabel}.
      </p>

      {filteredRows.length === 0 ? (
        <div className="border-y border-dashed border-slate-200 py-10 text-center">
          <p className="font-semibold text-slate-800">
            No hay solicitudes que coincidan
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Quitá algún término o limpiá todos los filtros para recuperar el listado.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-4 min-h-10 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-slate-300 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <>
          <section
            aria-label="Solicitudes del área"
            className="divide-y divide-slate-200 border-y border-slate-200 md:hidden"
          >
            {filteredRows.map((row) => (
              <article key={row.requestId} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {row.requestNumber}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.areaName} · {row.createdAtLabel}
                    </p>
                  </div>
                  <StatusPill status={row.status} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">
                      Versión
                    </dt>
                    <dd className="mt-1 font-medium text-slate-800">
                      {row.versionLabel}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">
                      Lote
                    </dt>
                    <dd className="mt-1 font-medium text-slate-800">
                      {row.loteLabel === "-" ? "Sin asignar" : row.loteLabel}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">
                      Período
                    </dt>
                    <dd className="mt-1 text-slate-700">{row.dateRangeLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">
                      Total
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {row.totalLabel}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <SolicitudActions
                    requestId={row.requestId}
                    status={row.status}
                    detailHref={row.detailHref}
                  />
                </div>
              </article>
            ))}
          </section>

          <div className="hidden overflow-x-auto border-y border-slate-200 md:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {columns.map((column) => {
                    const filterActive = hasColumnFilter(column.key);
                    const editorOpen = activeColumn === column.key;
                    return (
                      <th
                        key={column.key}
                        scope="col"
                        className={`group px-4 py-3 ${
                          column.align === "right" ? "text-right" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={(event) =>
                            openColumnFilter(column.key, event.currentTarget)
                          }
                          aria-label={`Filtrar por ${column.label}`}
                          aria-expanded={editorOpen}
                          aria-controls="solicitudes-filter-panel"
                          className={`inline-flex min-h-8 items-center gap-1.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                            column.align === "right" ? "ml-auto" : ""
                          } ${filterActive ? "text-sky-700" : ""}`}
                        >
                          <span>{column.label}</span>
                          <span
                            className={`transition-opacity ${
                              filterActive || editorOpen
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                            }`}
                          >
                            <SearchIcon active={filterActive} />
                          </span>
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={row.requestId} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {row.requestNumber}
                      </div>
                      <div className="text-xs text-slate-500">
                        {row.createdAtLabel}
                      </div>
                    </td>
                    <td className="px-4 py-3">{row.areaName}</td>
                    <td className="px-4 py-3">{row.versionLabel}</td>
                    <td className="px-4 py-3">{row.loteLabel}</td>
                    <td className="px-4 py-3">{row.dateRangeLabel}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {row.totalLabel}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-4 py-3">
                      <SolicitudActions
                        requestId={row.requestId}
                        status={row.status}
                        detailHref={row.detailHref}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
