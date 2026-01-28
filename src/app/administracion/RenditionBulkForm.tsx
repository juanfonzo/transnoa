"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { upsertRenditionBulk } from "@/app/actions/renditions";
import { SubmitButton } from "@/components/SubmitButton";

type RenditionLegInput = {
  id: string;
  departureLocation: string;
  departureDate: string;
  departureTime: string;
  departureKm: string;
  arrivalLocation: string;
  arrivalDate: string;
  arrivalTime: string;
  arrivalKm: string;
};

type WorkerSelection = {
  requestWorkerId: string;
  name: string;
  legajo: string;
  isComplete: boolean;
  availableViaticos: number;
};

type RenditionBulkFormProps = {
  workers: WorkerSelection[];
};

type SelectionMode = "pending" | "all";

function formatViaticos(value: number) {
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  });
}

function createEmptyLeg(): RenditionLegInput {
  return {
    id: `leg-${Math.random().toString(36).slice(2)}`,
    departureLocation: "",
    departureDate: "",
    departureTime: "",
    departureKm: "",
    arrivalLocation: "",
    arrivalDate: "",
    arrivalTime: "",
    arrivalKm: "",
  };
}

export function RenditionBulkForm({ workers }: RenditionBulkFormProps) {
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [formState, formAction] = useActionState(upsertRenditionBulk, {
    status: "idle",
  });
  const pendingIds = useMemo(
    () =>
      workers
        .filter((worker) => !worker.isComplete)
        .map((worker) => worker.requestWorkerId),
    [workers]
  );
  const allIds = useMemo(
    () => workers.map((worker) => worker.requestWorkerId),
    [workers]
  );
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>(allIds);
  const [legs, setLegs] = useState<RenditionLegInput[]>([createEmptyLeg()]);

  useEffect(() => {
    if (selectionMode === "pending") {
      setSelectedIds(pendingIds.length > 0 ? pendingIds : []);
      return;
    }
    setSelectedIds(allIds);
  }, [selectionMode, pendingIds, allIds]);

  const toggleSelection = (requestWorkerId: string) => {
    setSelectedIds((prev) =>
      prev.includes(requestWorkerId)
        ? prev.filter((id) => id !== requestWorkerId)
        : [...prev, requestWorkerId]
    );
  };

  const selectedCount = selectedIds.length;
  const hasPending = pendingIds.length > 0;
  const selectedAvailable = workers
    .filter((worker) => selectedIds.includes(worker.requestWorkerId))
    .map((worker) => worker.availableViaticos);
  const maxAvailable = selectedAvailable.length
    ? Math.min(...selectedAvailable)
    : 0;

  useEffect(() => {
    if (formState.status === "idle") {
      return;
    }
    let nextNotice: { tone: "success" | "error"; message: string };
    if (formState.status === "error") {
      nextNotice = {
        tone: "error",
        message: formState.message ?? "No se pudo guardar la rendicion.",
      };
    } else {
      const balanceCount = formState.balanceCount ?? 0;
    const balanceMessage =
      balanceCount > 0
        ? ` Se registro saldo deudor en cuenta corriente para ${balanceCount} colaborador${
            balanceCount === 1 ? "" : "es"
          }.`
        : "";
      nextNotice = {
        tone: "success",
        message: `${formState.message ?? "Rendicion generada."}${balanceMessage}`,
      };
    }
    setNotice(nextNotice);
    const timeout = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timeout);
  }, [formState.balanceCount, formState.message, formState.status]);

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
    >
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-3 rounded-xl border px-3 py-2 text-xs ${
            notice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {notice.message}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Rendicion grupal</p>
          <p className="text-xs text-slate-600">
            Aplica la misma rendicion a los colaboradores seleccionados.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            {selectedCount} seleccionados
          </span>
          <div className="flex overflow-hidden rounded-full border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setSelectionMode("pending")}
              className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                selectionMode === "pending"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600"
              }`}
            >
              Solo pendientes
            </button>
            <button
              type="button"
              onClick={() => setSelectionMode("all")}
              className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                selectionMode === "all"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600"
              }`}
            >
              Todos
            </button>
          </div>
        </div>
      </div>

      {selectionMode === "pending" && !hasPending && (
        <p className="mt-2 text-xs text-slate-500">
          No hay rendiciones pendientes en este lote.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {workers.map((worker) => (
          <label
            key={worker.requestWorkerId}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
          >
            <input
              type="checkbox"
              name="requestWorkerIds"
              value={worker.requestWorkerId}
              checked={selectedIds.includes(worker.requestWorkerId)}
              onChange={() => toggleSelection(worker.requestWorkerId)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900"
            />
            <span>{worker.name}</span>
            <span className="text-slate-400">-</span>
            <span>{worker.legajo}</span>
            <span className="text-slate-400">·</span>
            <span>{formatViaticos(worker.availableViaticos)} viaticos</span>
          </label>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Motivo
          <input
            name="reason"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Patente
          <input
            name="vehiclePlate"
            placeholder="AAA000"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Viaticos consumidos
          <input
            name="consumedViaticos"
            type="number"
            inputMode="decimal"
            step="0.5"
            min={0}
            max={maxAvailable || undefined}
            placeholder={maxAvailable ? formatViaticos(maxAvailable) : "0"}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-slate-500">
            Disponible segun seleccion: {formatViaticos(maxAvailable)} viaticos.
          </span>
        </label>
        <label className="text-sm font-medium text-slate-700">
          URL respaldo
          <input
            name="attachmentUrl"
            placeholder="https://..."
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Notas
          <input
            name="notes"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tramos
          </p>
          <button
            type="button"
            onClick={() => setLegs((prev) => [...prev, createEmptyLeg()])}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600"
          >
            Agregar tramo
          </button>
        </div>

        <div className="space-y-3">
          {legs.map((leg, index) => (
            <div
              key={leg.id}
              className="rounded-2xl border border-slate-200 bg-white p-3"
            >
              <div className="grid gap-3 lg:grid-cols-4">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Lugar salida
                  <input
                    name="legDepartureLocation"
                    value={leg.departureLocation}
                    onChange={(event) =>
                      setLegs((prev) =>
                        prev.map((item, idx) =>
                          idx === index
                            ? { ...item, departureLocation: event.target.value }
                            : item
                        )
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Fecha salida
                  <input
                    type="date"
                    name="legDepartureDate"
                    value={leg.departureDate}
                    onChange={(event) =>
                      setLegs((prev) =>
                        prev.map((item, idx) =>
                          idx === index
                            ? { ...item, departureDate: event.target.value }
                            : item
                        )
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Hora salida
                  <input
                    type="time"
                    name="legDepartureTime"
                    value={leg.departureTime}
                    onChange={(event) =>
                      setLegs((prev) =>
                        prev.map((item, idx) =>
                          idx === index
                            ? { ...item, departureTime: event.target.value }
                            : item
                        )
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  KM salida
                  <input
                    type="number"
                    name="legDepartureKm"
                    value={leg.departureKm}
                    onChange={(event) =>
                      setLegs((prev) =>
                        prev.map((item, idx) =>
                          idx === index
                            ? { ...item, departureKm: event.target.value }
                            : item
                        )
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-4">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Lugar llegada
                  <input
                    name="legArrivalLocation"
                    value={leg.arrivalLocation}
                    onChange={(event) =>
                      setLegs((prev) =>
                        prev.map((item, idx) =>
                          idx === index
                            ? { ...item, arrivalLocation: event.target.value }
                            : item
                        )
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Fecha llegada
                  <input
                    type="date"
                    name="legArrivalDate"
                    value={leg.arrivalDate}
                    onChange={(event) =>
                      setLegs((prev) =>
                        prev.map((item, idx) =>
                          idx === index
                            ? { ...item, arrivalDate: event.target.value }
                            : item
                        )
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Hora llegada
                  <input
                    type="time"
                    name="legArrivalTime"
                    value={leg.arrivalTime}
                    onChange={(event) =>
                      setLegs((prev) =>
                        prev.map((item, idx) =>
                          idx === index
                            ? { ...item, arrivalTime: event.target.value }
                            : item
                        )
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  KM llegada
                  <input
                    type="number"
                    name="legArrivalKm"
                    value={leg.arrivalKm}
                    onChange={(event) =>
                      setLegs((prev) =>
                        prev.map((item, idx) =>
                          idx === index
                            ? { ...item, arrivalKm: event.target.value }
                            : item
                        )
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"
                  />
                </label>
              </div>

              {legs.length > 1 && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setLegs((prev) => prev.filter((_, idx) => idx !== index))
                    }
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600"
                  >
                    Quitar tramo
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <SubmitButton
          label="Aplicar rendicion"
          pendingLabel="Guardando..."
          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          disabled={selectedCount === 0}
        />
      </div>
    </form>
  );
}
