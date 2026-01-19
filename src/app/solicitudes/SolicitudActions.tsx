"use client";

import type { RequestStatus } from "@prisma/client";
import { useState } from "react";
import { signRequest } from "@/app/actions/requests";
import { Modal } from "@/components/Modal";
import { SubmitButton } from "@/components/SubmitButton";

type SolicitudActionsProps = {
  requestId: string;
  status: RequestStatus;
};

export function SolicitudActions({ requestId, status }: SolicitudActionsProps) {
  const [open, setOpen] = useState(false);

  if (status !== "PENDING_SIGNATURE") {
    return <span className="text-xs text-slate-400">-</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600"
      >
        Firmar
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Firma interna"
        description="Confirma que la informacion esta correcta antes de firmar."
      >
        <form action={signRequest} className="space-y-4">
          <input type="hidden" name="requestId" value={requestId} />
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Al firmar, la solicitud queda bloqueada para cambios y pasa a
            tesoreria.
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

