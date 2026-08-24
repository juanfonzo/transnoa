"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createRequestWizard } from "@/app/actions/requests";
import { WorkerCreateModal } from "@/app/solicitudes/WorkerCreateModal";
import { ActionFeedback } from "@/components/ActionFeedback";
import { Modal } from "@/components/Modal";
import { SubmitButton } from "@/components/SubmitButton";
import {
  buildDateOnlyKeys,
  diffDateOnlyDaysInclusive,
  formatDateOnly,
  parseDateOnly,
} from "@/lib/date-only";
import { formatCurrency } from "@/lib/format";

type AreaOption = {
  id: string;
  name: string;
};

type WorkerOption = {
  id: string;
  name: string;
  legajo: string;
};

type SolicitudWizardProps = {
  areas: AreaOption[];
  workers: WorkerOption[];
  dailyAmount: number;
};

const steps = ["Datos generales", "Trabajadores", "Plan diario", "Resumen"];

type DayAssignment = {
  workerIds: string[];
  conceptsText: string;
};

function diffDays(start?: string, end?: string) {
  if (!start || !end) return 0;
  const startDate = parseDateOnly(start);
  const endDate = parseDateOnly(end);
  if (!startDate || !endDate || endDate < startDate) return 0;
  return diffDateOnlyDaysInclusive(startDate, endDate);
}

function buildDates(start?: string, end?: string) {
  if (!start || !end) return [];
  const startDate = parseDateOnly(start);
  const endDate = parseDateOnly(end);
  if (!startDate || !endDate) return [];
  return buildDateOnlyKeys(startDate, endDate);
}

export function SolicitudWizard({ areas, workers, dailyAmount }: SolicitudWizardProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [areaId, setAreaId] = useState(areas[0]?.id ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [crew, setCrew] = useState("");
  const [location, setLocation] = useState("");
  const [selectedWorkers, setSelectedWorkers] = useState<Record<string, boolean>>({});
  const [dayAssignments, setDayAssignments] = useState<Record<string, DayAssignment>>({});
  const [lastDayHalf, setLastDayHalf] = useState(false);
  const router = useRouter();

  const daysCount = diffDays(startDate, endDate);
  const dates = useMemo(() => buildDates(startDate, endDate), [startDate, endDate]);
  const hasAssignments = useMemo(
    () =>
      Object.values(dayAssignments).some(
        (assignment) => assignment.workerIds.length > 0
      ),
    [dayAssignments]
  );
  const lastDate = dates[dates.length - 1];
  const lastDayWorkerIds = useMemo(() => {
    if (!lastDate) {
      return new Set<string>();
    }
    return new Set(dayAssignments[lastDate]?.workerIds ?? []);
  }, [dayAssignments, lastDate]);
  const selectedWorkerList = useMemo(
    () => workers.filter((worker) => selectedWorkers[worker.id]),
    [selectedWorkers, workers]
  );

  useEffect(() => {
    setDayAssignments((prev) => {
      const next: Record<string, DayAssignment> = {};
      dates.forEach((date) => {
        const existing = prev[date];
        const filteredWorkers = existing?.workerIds.filter(
          (id) => selectedWorkers[id]
        );
        next[date] = {
          workerIds: filteredWorkers ?? [],
          conceptsText: existing?.conceptsText ?? "",
        };
      });
      return next;
    });
  }, [dates, selectedWorkers]);

  const dayPlanPayload = useMemo(() => {
    const payload: Record<string, { workerIds: string[]; concepts: string[] }> = {};
    Object.entries(dayAssignments).forEach(([date, value]) => {
      payload[date] = {
        workerIds: value.workerIds,
        concepts: value.conceptsText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      };
    });
    return payload;
  }, [dayAssignments]);

  const workerDayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(dayPlanPayload).forEach((day) => {
      day.workerIds.forEach((workerId) => {
        counts[workerId] = (counts[workerId] ?? 0) + 1;
      });
    });
    return counts;
  }, [dayPlanPayload]);

  useEffect(() => {
    if (dates.length === 0) {
      setLastDayHalf(false);
    }
  }, [dates.length]);

  const getViaticDays = (workerId: string) => {
    const baseDays = hasAssignments ? workerDayCounts[workerId] ?? 0 : daysCount;
    if (hasAssignments && baseDays <= 0) {
      return 0;
    }
    if (!lastDayHalf) {
      return baseDays;
    }
    const applyHalf = !hasAssignments || lastDayWorkerIds.has(workerId);
    return applyHalf ? Math.max(0.5, baseDays - 0.5) : baseDays;
  };

  const formatViaticDays = (value: number) =>
    value.toLocaleString("es-AR", {
      minimumFractionDigits: value % 1 === 0 ? 0 : 1,
      maximumFractionDigits: 1,
    });

  const totalAmount = selectedWorkerList.reduce((sum, worker) => {
    const days = getViaticDays(worker.id);
    return sum + days * dailyAmount;
  }, 0);

  const hasConceptsForEveryDay =
    dates.length > 0 &&
    dates.every((date) => dayAssignments[date]?.conceptsText.trim());

  const canContinue = [
    Boolean(areaId && startDate && endDate && endDate >= startDate),
    selectedWorkerList.length > 0,
    hasConceptsForEveryDay,
    true,
  ];

  const handleOpen = () => {
    setOpen(true);
    setStep(0);
    setError(null);
  };

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    const result = await createRequestWizard(formData);
    if (!result.ok) {
      setError(result.message);
      if (result.field === "concepts") setStep(2);
      if (result.field === "dates") setStep(0);
      if (result.field === "workerIds") setStep(1);
      return;
    }
    setOpen(false);
    setStep(0);
    setNotice(result.message);
  };

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timeout);
  }, [notice]);

  const formatDayLabel = (date: string) =>
    formatDateOnly(parseDateOnly(date), {
      day: "2-digit",
      month: "2-digit",
    });

  return (
    <>
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700"
        >
          {notice}
        </div>
      )}
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
      >
        Nueva solicitud
      </button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
        title="Nueva solicitud"
        description="Completá los datos principales para enviar a Administración."
      >
        <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {steps.map((label, index) => (
            <span
              key={label}
              className={`rounded-full px-3 py-1 ${
                step === index ? "bg-slate-900 text-white" : "bg-slate-100"
              }`}
            >
              {label}
            </span>
          ))}
        </div>

        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="areaId" value={areaId} />
          <input type="hidden" name="startDate" value={startDate} />
          <input type="hidden" name="endDate" value={endDate} />
          <input type="hidden" name="crew" value={crew} />
          <input type="hidden" name="location" value={location} />
          <input type="hidden" name="dayPlan" value={JSON.stringify(dayPlanPayload)} />
          <input type="hidden" name="lastDayHalf" value={lastDayHalf ? "1" : "0"} />
          {selectedWorkerList.map((worker) => (
            <input key={worker.id} type="hidden" name="workerIds" value={worker.id} />
          ))}

          <ActionFeedback message={error} />

          {step === 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Área
                <select
                  name="areaId"
                  value={areaId}
                  onChange={(event) => setAreaId(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Cuadrilla
                <input
                  name="crew"
                  value={crew}
                  onChange={(event) => setCrew(event.target.value)}
                  placeholder="Ej: Cuadrilla 7"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Fecha inicio
                <input
                  type="date"
                  name="startDate"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Fecha fin
                <input
                  type="date"
                  name="endDate"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-slate-700 md:col-span-2">
                Ubicación
                <input
                  name="location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Zona de trabajo"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  Seleccioná los trabajadores. La asignación diaria se define en el
                  siguiente paso.
                </p>
                <WorkerCreateModal onCreated={() => router.refresh()} />
              </div>
              <div className="space-y-2">
                {workers.map((worker) => (
                  <label
                    key={worker.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="workerIds"
                        value={worker.id}
                        checked={Boolean(selectedWorkers[worker.id])}
                        onChange={(event) =>
                          setSelectedWorkers((prev) => ({
                            ...prev,
                            [worker.id]: event.target.checked,
                          }))
                        }
                      />
                      <span>
                        <span className="font-semibold text-slate-900">
                          {worker.name}
                        </span>
                        <span className="ml-2 text-xs text-slate-500">
                          Legajo {worker.legajo}
                        </span>
                      </span>
                    </span>
                    <span className="text-xs text-slate-500">Asignar por día</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Define qué trabajadores participan cada día y agrega al menos un
                concepto por jornada.
              </p>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Medio viático en el último día
                    </p>
                    <p className="text-xs text-slate-500">
                      Aplica 0,5 viático sólo para el día de regreso.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <input
                      type="checkbox"
                      checked={lastDayHalf}
                      disabled={dates.length === 0}
                      onChange={(event) => setLastDayHalf(event.target.checked)}
                    />
                    0,5
                  </label>
                </div>
                {lastDayHalf && hasAssignments && lastDayWorkerIds.size === 0 && (
                  <p className="mt-2 text-xs text-amber-600">
                    Seleccioná colaboradores en el último día para aplicar el medio
                    viático.
                  </p>
                )}
                {lastDayHalf && !hasAssignments && (
                  <p className="mt-2 text-xs text-slate-500">
                    Se aplicara a todos los colaboradores.
                  </p>
                )}
              </div>
              {dates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Seleccioná un rango de fechas para continuar.
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setStep(0)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Editar fechas
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {dates.map((date, index) => {
                    const assignment = dayAssignments[date];
                    const selected = assignment?.workerIds ?? [];
                    return (
                      <div
                        key={date}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            Dia {index + 1} · {formatDayLabel(date)}
                          </p>
                          <span className="text-xs text-slate-500">
                            {selected.length} trabajador(es)
                          </span>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-[1.2fr_1fr]">
                          <div className="space-y-2">
                            {selectedWorkerList.length === 0 ? (
                              <p className="text-xs text-slate-500">
                                Seleccioná trabajadores en el paso anterior.
                              </p>
                            ) : (
                              selectedWorkerList.map((worker) => {
                                const isChecked = selected.includes(worker.id);
                                return (
                                  <label
                                    key={worker.id}
                                    className="flex items-center gap-2 text-xs text-slate-600"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(event) => {
                                        setDayAssignments((prev) => {
                                          const current = prev[date] ?? {
                                            workerIds: [],
                                            conceptsText: "",
                                          };
                                          const nextWorkers = event.target.checked
                                            ? [...current.workerIds, worker.id]
                                            : current.workerIds.filter(
                                                (id) => id !== worker.id
                                              );
                                          return {
                                            ...prev,
                                            [date]: {
                                              ...current,
                                              workerIds: nextWorkers,
                                            },
                                          };
                                        });
                                      }}
                                    />
                                    <span>{worker.name}</span>
                                  </label>
                                );
                              })
                            )}
                          </div>
                          <label className="text-xs font-medium text-slate-600">
                            Conceptos del día
                            <textarea
                              value={assignment?.conceptsText ?? ""}
                              aria-invalid={!assignment?.conceptsText.trim()}
                              onChange={(event) => {
                                setError(null);
                                setDayAssignments((prev) => ({
                                  ...prev,
                                  [date]: {
                                    workerIds: assignment?.workerIds ?? [],
                                    conceptsText: event.target.value,
                                  },
                                }));
                              }}
                              rows={3}
                              placeholder="Ej: Montaje\nEj: Mantenimiento"
                              className={`mt-1 w-full rounded-xl border px-3 py-2 text-xs ${
                                assignment?.conceptsText.trim()
                                  ? "border-slate-200"
                                  : "border-rose-200 bg-rose-50/40"
                              }`}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {!hasConceptsForEveryDay && dates.length > 0 && (
                <p className="text-xs font-medium text-rose-600">
                  Completa los conceptos de cada día para continuar.
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Período
                  </span>
                  <span className="font-semibold text-slate-900">
                    {startDate || "-"} a {endDate || "-"} ({daysCount} días calendario)
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Trabajadores
                </p>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {selectedWorkerList.map((worker) => (
                    <li key={worker.id} className="flex justify-between">
                      <span>{worker.name}</span>
                      <span className="text-slate-500">
                        {formatViaticDays(getViaticDays(worker.id))} viático(s)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Conceptos del período
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {Object.values(dayPlanPayload).reduce(
                    (sum, day) => sum + day.concepts.length,
                    0
                  ) || "Sin conceptos definidos"}
                </p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total estimado
                  </p>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                <div className="text-xs text-slate-500">
                  Monto diario {formatCurrency(dailyAmount)}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((prev) => Math.max(0, prev - 1))}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 disabled:opacity-40"
            >
              Atras
            </button>
            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => canContinue[step] && setStep((prev) => prev + 1)}
                disabled={!canContinue[step]}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
              </button>
            ) : (
              <SubmitButton
                label="Enviar a Administración"
                pendingLabel="Enviando..."
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
              />
            )}
          </div>
        </form>
      </Modal>
    </>
  );
}

