"use client";

import type { RequestStatus } from "@prisma/client";
import { useState } from "react";
import { adminMarkPaid, adminUpdateLote } from "@/app/actions/requests";
import { Modal } from "@/components/Modal";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDateInput } from "@/lib/format";

type AdminPaymentActionsProps = {
  requestId: string;
  status: RequestStatus;
  loteNumber?: string | null;
  plannedPaymentDate?: Date | null;
  paidAt?: Date | null;
  paymentReference?: string | null;
};

export function AdminPaymentActions({
  requestId,
  status,
  loteNumber,
  plannedPaymentDate,
  paidAt,
  paymentReference,
}: AdminPaymentActionsProps) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [loteOpen, setLoteOpen] = useState(false);

  const paymentLabel = paidAt ? "Editar pago" : "Registrar pago";
  const canEditLote = !paidAt && status !== "PAID";
  const paymentHint =
    status === "PAID"
      ? "Actualiza fecha y referencia del pago."
      : "Confirma la fecha y referencia del deposito.";

  const handlePayment = async (formData: FormData) => {
    await adminMarkPaid(formData);
    setPaymentOpen(false);
  };

  const handleLote = async (formData: FormData) => {
    if (!canEditLote) return;
    await adminUpdateLote(formData);
    setLoteOpen(false);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPaymentOpen(true)}
          className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
        >
          {paymentLabel}
        </button>
        <button
          type="button"
          onClick={() => setLoteOpen(true)}
          disabled={!canEditLote}
          className={`rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            canEditLote
              ? "text-slate-600"
              : "cursor-not-allowed text-slate-300"
          }`}
          title={
            canEditLote
              ? "Editar lote"
              : "El lote ya fue pagado y no se puede modificar"
          }
        >
          Corregir lote
        </button>
      </div>

      <Modal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title={paymentLabel}
        description={paymentHint}
      >
        <form action={handlePayment} className="space-y-4">
          <input type="hidden" name="requestId" value={requestId} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Fecha de pago
              <input
                type="date"
                name="paidAt"
                defaultValue={formatDateInput(paidAt ?? plannedPaymentDate)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Referencia bancaria
              <input
                name="paymentReference"
                defaultValue={paymentReference ?? ""}
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
        open={loteOpen}
        onClose={() => setLoteOpen(false)}
        title="Corregir lote y fecha"
        description="Actualiza lote y fecha prevista desde administracion."
      >
        <form action={handleLote} className="space-y-4">
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
            Motivo
            <textarea
              name="notes"
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <SubmitButton
            label="Guardar correccion"
            pendingLabel="Guardando..."
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          />
        </form>
      </Modal>
    </>
  );
}
