"use client";

import { useState } from "react";
import { upsertRendition } from "@/app/actions/renditions";
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

type RenditionFormProps = {
  requestWorkerId: string;
  requestVersionId: string;
  workerId: string;
  initialReason?: string | null;
  initialVehiclePlate?: string | null;
  initialAttachmentUrl?: string | null;
  initialNotes?: string | null;
  initialLegs?: RenditionLegInput[];
};

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

export function RenditionForm({
  requestWorkerId,
  requestVersionId,
  workerId,
  initialReason,
  initialVehiclePlate,
  initialAttachmentUrl,
  initialNotes,
  initialLegs,
}: RenditionFormProps) {
  const [legs, setLegs] = useState<RenditionLegInput[]>(
    initialLegs && initialLegs.length > 0
      ? initialLegs
      : [createEmptyLeg()]
  );

  const addLeg = () => setLegs((prev) => [...prev, createEmptyLeg()]);
  const removeLeg = (index: number) =>
    setLegs((prev) => prev.filter((_, current) => current !== index));

  return (
    <form action={upsertRendition} className="space-y-4">
      <input type="hidden" name="requestWorkerId" value={requestWorkerId} />
      <input type="hidden" name="requestVersionId" value={requestVersionId} />
      <input type="hidden" name="workerId" value={workerId} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Motivo
          <input
            name="reason"
            defaultValue={initialReason ?? ""}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Patente
          <input
            name="vehiclePlate"
            defaultValue={initialVehiclePlate ?? ""}
            placeholder="AAA000"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          URL respaldo
          <input
            name="attachmentUrl"
            defaultValue={initialAttachmentUrl ?? ""}
            placeholder="https://..."
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Notas
          <input
            name="notes"
            defaultValue={initialNotes ?? ""}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tramos
          </p>
          <button
            type="button"
            onClick={addLeg}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600"
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
                    onClick={() => removeLeg(index)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600"
                  >
                    Quitar tramo
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <SubmitButton
        label="Guardar rendicion"
        pendingLabel="Guardando..."
        className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
      />
    </form>
  );
}
