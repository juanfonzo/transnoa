"use client";

import type { RequestStatus } from "@prisma/client";
import { useState } from "react";
import { signRequest } from "@/app/actions/requests";
import { ActionFeedback } from "@/components/ActionFeedback";
import { Modal } from "@/components/Modal";
import { SubmitButton } from "@/components/SubmitButton";

type SolicitudActionsProps = {
  requestId: string;
  status: RequestStatus;
};

export function SolicitudActions({ requestId, status }: SolicitudActionsProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "PENDING_SIGNATURE") {
    return <span className="text-xs text-slate-400">-</span>;
  }

  const handleSign = async (formData: FormData) => {
    setError(null);
    const result = await signRequest(formData);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="min-h-10 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600"
      >
        Firmar
      </button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
        title="Firma interna"
        description="Confirmá que la información sea correcta antes de firmar."
      >
        <form action={handleSign} className="space-y-4">
          <input type="hidden" name="requestId" value={requestId} />
          <ActionFeedback message={error} />
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Al firmar, la solicitud queda bloqueada para cambios y pasa a
            Tesorería.
          </div>
          <SubmitButton
            label="Firmar solicitud"
            pendingLabel="Firmando..."
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          />
        </form>
      </Modal>
    </>
  );
}

