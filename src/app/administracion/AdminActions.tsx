"use client";

import type { RequestStatus } from "@prisma/client";
import { useState } from "react";
import { adminCreateCorrection, adminStandardize } from "@/app/actions/requests";
import { Modal } from "@/components/Modal";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDateInput } from "@/lib/format";

type AdminActionsProps = {
  requestId: string;
  status: RequestStatus;
  loteNumber?: string | null;
  plannedPaymentDate?: Date | null;
};

export function AdminActions({
  requestId,
  status,
  loteNumber,
  plannedPaymentDate,
}: AdminActionsProps) {
  const [standardizeOpen, setStandardizeOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);

  const canStandardize = status === "SUBMITTED_TO_ADMIN" || status === "ADMIN_REVIEW";
  const canCorrect = status === "TREASURY_RETURNED" || status === "ADMIN_CORRECTION";

  if (!canStandardize && !canCorrect) {
    return <span className="text-xs text-slate-400">-</span>;
  }

  return (
    <>
      {canStandardize && (
        <button
          type="button"
          onClick={() => setStandardizeOpen(true)}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600"
        >
          Estandarizar
        </button>
      )}
      {canCorrect && (
        <button
          type="button"
          onClick={() => setCorrectionOpen(true)}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600"
        >
          Crear correccion
        </button>
      )}

      <Modal
        open={standardizeOpen}
        onClose={() => setStandardizeOpen(false)}
        title="Estandarizar solicitud"
        description="Asigna lote y fecha prevista antes de enviar a firma."
      >
        <form action={adminStandardize} className="space-y-4">
          <input type="hidden" name="requestId" value={requestId} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Lote
              <input
                name="loteNumber"
                defaultValue={loteNumber ?? ""}
                placeholder="L-2026-0002"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Fecha prevista de pago
              <input
                type="date"
                name="plannedPaymentDate"
                defaultValue={formatDateInput(plannedPaymentDate)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="text-sm font-medium text-slate-700">
            Notas
            <textarea
              name="notes"
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <SubmitButton
            label="Enviar a firma"
            pendingLabel="Guardando..."
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          />
        </form>
      </Modal>

      <Modal
        open={correctionOpen}
        onClose={() => setCorrectionOpen(false)}
        title="Correccion solicitada"
        description="Genera una nueva version con lote y fecha corregidos."
      >
        <form action={adminCreateCorrection} className="space-y-4">
          <input type="hidden" name="requestId" value={requestId} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Nuevo lote
              <input
                name="loteNumber"
                defaultValue={loteNumber ?? ""}
                placeholder="L-2026-0003"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Nueva fecha de pago
              <input
                type="date"
                name="plannedPaymentDate"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="text-sm font-medium text-slate-700">
            Notas de correccion
            <textarea
              name="notes"
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <SubmitButton
            label="Crear nueva version"
            pendingLabel="Guardando..."
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          />
        </form>
      </Modal>
    </>
  );
}

