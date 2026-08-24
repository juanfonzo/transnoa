"use client";

import type { RequestStatus } from "@prisma/client";
import { useState } from "react";
import { markPaid, requestCorrection } from "@/app/actions/requests";
import { ActionFeedback } from "@/components/ActionFeedback";
import { Modal } from "@/components/Modal";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDateInput } from "@/lib/format";

type TreasuryActionsProps = {
  requestId: string;
  status: RequestStatus;
  plannedPaymentDate?: Date | null;
  paidAt?: Date | null;
  paymentReference?: string | null;
};

export function TreasuryActions({
  requestId,
  status,
  plannedPaymentDate,
  paidAt,
  paymentReference,
}: TreasuryActionsProps) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const canPay = status === "READY_FOR_PAYMENT" || status === "PAID";
  const canRequestCorrection = status === "READY_FOR_PAYMENT";
  const paymentLabel = paidAt ? "Editar pago" : "Registrar pago";

  const handlePayment = async (formData: FormData) => {
    setPaymentError(null);
    const result = await markPaid(formData);
    if (!result.ok) {
      setPaymentError(result.message);
      return;
    }
    setPaymentOpen(false);
  };

  const handleCorrection = async (formData: FormData) => {
    setCorrectionError(null);
    const result = await requestCorrection(formData);
    if (!result.ok) {
      setCorrectionError(result.message);
      return;
    }
    setCorrectionOpen(false);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canPay && (
          <button
            type="button"
            onClick={() => {
              setPaymentError(null);
              setPaymentOpen(true);
            }}
            className="min-h-10 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            {paymentLabel}
          </button>
        )}
        {canRequestCorrection && (
          <button
            type="button"
            onClick={() => {
              setCorrectionError(null);
              setCorrectionOpen(true);
            }}
            className="min-h-10 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Solicitar corrección
          </button>
        )}
      </div>

      <Modal
        open={paymentOpen}
        onClose={() => {
          setPaymentOpen(false);
          setPaymentError(null);
        }}
        title={paymentLabel}
        description={
          paidAt
            ? "Actualizá la fecha o referencia registrada para este pago."
            : "Confirmá la fecha y la referencia bancaria del depósito."
        }
      >
        <form action={handlePayment} className="space-y-4">
          <input type="hidden" name="requestId" value={requestId} />
          <ActionFeedback message={paymentError} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Fecha de pago
              <input
                type="date"
                name="paidAt"
                required
                defaultValue={formatDateInput(paidAt ?? plannedPaymentDate)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Referencia bancaria
              <input
                name="paymentReference"
                required
                defaultValue={paymentReference ?? ""}
                placeholder="DEP-0001"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              />
            </label>
          </div>
          <label className="text-sm font-medium text-slate-700">
            Notas
            <textarea
              name="notes"
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            />
          </label>
          <SubmitButton
            label="Guardar pago"
            pendingLabel="Guardando..."
            className="min-h-11 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          />
        </form>
      </Modal>

      {canRequestCorrection && (
        <Modal
          open={correctionOpen}
          onClose={() => {
            setCorrectionOpen(false);
            setCorrectionError(null);
          }}
          title="Solicitar corrección"
          description="La solicitud volverá a Administración con el motivo y la fecha sugerida."
        >
          <form action={handleCorrection} className="space-y-4">
            <input type="hidden" name="requestId" value={requestId} />
            <ActionFeedback message={correctionError} />
            <label className="text-sm font-medium text-slate-700">
              Motivo
              <textarea
                name="reason"
                rows={3}
                required
                placeholder="Ej.: la fecha prevista no coincide con el lote bancario."
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Fecha sugerida
              <input
                type="date"
                name="suggestedPaymentDate"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              />
            </label>
            <SubmitButton
              label="Devolver a Administración"
              pendingLabel="Enviando..."
              className="min-h-11 rounded-full border border-rose-200 bg-rose-50 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700"
            />
          </form>
        </Modal>
      )}
    </>
  );
}

