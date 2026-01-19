"use client";

import { useState } from "react";
import { createRateChange } from "@/app/actions/rates";
import { Modal } from "@/components/Modal";
import { SubmitButton } from "@/components/SubmitButton";
import { formatCurrency, formatDateInput } from "@/lib/format";

type AdminRateModalProps = {
  currentAmount: number;
  effectiveFrom?: Date | null;
};

export function AdminRateModal({ currentAmount, effectiveFrom }: AdminRateModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
      >
        Ajustar viatico diario
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nuevo valor de viatico"
        description="Define el monto y la fecha desde la que aplica. Si la fecha ya paso, se genera ajuste retroactivo."
      >
        <form action={createRateChange} className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Valor actual
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {formatCurrency(currentAmount)}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Nuevo monto diario
              <input
                type="number"
                step="0.01"
                min={0}
                name="newAmount"
                defaultValue={currentAmount}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Fecha efectiva
              <input
                type="date"
                name="effectiveFromDate"
                defaultValue={formatDateInput(effectiveFrom ?? new Date())}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="text-sm font-medium text-slate-700">
            Motivo
            <textarea
              name="note"
              rows={3}
              placeholder="Ej: Actualizacion por inflacion febrero."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <SubmitButton
            label="Guardar ajuste"
            pendingLabel="Calculando..."
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          />
        </form>
      </Modal>
    </>
  );
}
