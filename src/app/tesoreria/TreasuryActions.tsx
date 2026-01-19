"use client";

import { useState } from "react";
import { markPaid, requestCorrection } from "@/app/actions/requests";
import { Modal } from "@/components/Modal";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDateInput } from "@/lib/format";

type TreasuryActionsProps = {
  requestId: string;
  plannedPaymentDate?: Date | null;
};

export function TreasuryActions({ requestId, plannedPaymentDate }: TreasuryActionsProps) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setPaymentOpen(true)}
        className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
      >
        Registrar pago
      </button>
      <button
        type="button"
        onClick={() => setCorrectionOpen(true)}
        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600"
      >
        Solicitar correccion
      </button>

      <Modal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Registrar pago"
        description="Confirma la fecha y referencia del deposito."
      >
        <form action={markPaid} className="space-y-4">
          <input type="hidden" name="requestId" value={requestId} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Fecha de pago
              <input
                type="date"
                name="paidAt"
                defaultValue={formatDateInput(plannedPaymentDate)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Referencia bancaria
              <input
                name="paymentReference"
                placeholder="DEP-0001"
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
            label="Guardar pago"
            pendingLabel="Guardando..."
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          />
        </form>
      </Modal>

      <Modal
        open={correctionOpen}
        onClose={() => setCorrectionOpen(false)}
        title="Solicitar correccion"
        description="Informa el motivo y fecha sugerida."
      >
        <form action={requestCorrection} className="space-y-4">
          <input type="hidden" name="requestId" value={requestId} />
          <label className="text-sm font-medium text-slate-700">
            Motivo
            <textarea
              name="reason"
              rows={3}
              placeholder="Ej: Banco no habil o cambio de fecha."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Fecha sugerida
            <input
              type="date"
              name="suggestedPaymentDate"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <SubmitButton
            label="Enviar solicitud"
            pendingLabel="Enviando..."
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700"
          />
        </form>
      </Modal>
    </>
  );
}

