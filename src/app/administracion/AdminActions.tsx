"use client";

import type { RequestStatus } from "@prisma/client";
import Link from "next/link";
import { useState } from "react";
import { adminCreateCorrection, adminStandardize } from "@/app/actions/requests";
import { ActionFeedback } from "@/components/ActionFeedback";
import { Modal } from "@/components/Modal";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDateInput } from "@/lib/format";

type AdminActionsProps = {
  requestId: string;
  status: RequestStatus;
  loteNumber?: string | null;
  plannedPaymentDate?: Date | null;
  detailHref?: string;
};

export function AdminActions({
  requestId,
  status,
  loteNumber,
  plannedPaymentDate,
  detailHref,
}: AdminActionsProps) {
  const [standardizeOpen, setStandardizeOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [standardizeError, setStandardizeError] = useState<string | null>(null);
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  const canStandardize = status === "SUBMITTED_TO_ADMIN" || status === "ADMIN_REVIEW";
  const canCorrect = status === "TREASURY_RETURNED" || status === "ADMIN_CORRECTION";

  if (!canStandardize && !canCorrect && !detailHref) {
    return <span className="text-xs text-slate-400">-</span>;
  }

  const handleStandardize = async (formData: FormData) => {
    setStandardizeError(null);
    const result = await adminStandardize(formData);
    if (!result.ok) {
      setStandardizeError(result.message);
      return;
    }
    setStandardizeOpen(false);
  };

  const handleCorrection = async (formData: FormData) => {
    setCorrectionError(null);
    const result = await adminCreateCorrection(formData);
    if (!result.ok) {
      setCorrectionError(result.message);
      return;
    }
    setCorrectionOpen(false);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canStandardize && (
          <button
            type="button"
            onClick={() => {
              setStandardizeError(null);
              setStandardizeOpen(true);
            }}
            className="inline-flex min-h-10 items-center rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Asignar lote
          </button>
        )}
        {canCorrect && (
          <button
            type="button"
            onClick={() => {
              setCorrectionError(null);
              setCorrectionOpen(true);
            }}
            className="inline-flex min-h-10 items-center rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Resolver devolución
          </button>
        )}
        {detailHref && (
          <Link
            href={detailHref}
            className="inline-flex min-h-10 items-center rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Ver detalle
          </Link>
        )}
      </div>

      <Modal
        open={standardizeOpen}
        onClose={() => {
          setStandardizeOpen(false);
          setStandardizeError(null);
        }}
        title="Asignar lote"
        description="Asigná lote y fecha prevista antes de enviar a firma."
      >
        <form action={handleStandardize} className="space-y-4">
          <input type="hidden" name="requestId" value={requestId} />
          <ActionFeedback message={standardizeError} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Lote
              <input
                name="loteNumber"
                required
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
                required
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
        onClose={() => {
          setCorrectionOpen(false);
          setCorrectionError(null);
        }}
        title="Corrección solicitada"
        description="Genera una nueva versión con lote y fecha corregidos."
      >
        <form action={handleCorrection} className="space-y-4">
          <input type="hidden" name="requestId" value={requestId} />
          <ActionFeedback message={correctionError} />
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
            Notas de corrección
            <textarea
              name="notes"
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <SubmitButton
            label="Crear nueva versión"
            pendingLabel="Guardando..."
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          />
        </form>
      </Modal>
    </>
  );
}

