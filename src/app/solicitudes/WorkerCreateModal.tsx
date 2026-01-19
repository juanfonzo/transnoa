"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWorker } from "@/app/actions/workers";
import { Modal } from "@/components/Modal";
import { SubmitButton } from "@/components/SubmitButton";

type WorkerCreateModalProps = {
  onCreated?: () => void;
};

export function WorkerCreateModal({ onCreated }: WorkerCreateModalProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await createWorker(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setOpen(false);
      router.refresh();
      onCreated?.();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600"
      >
        Nuevo colaborador
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nuevo colaborador"
        description="Completa los datos principales para agregarlo a la cuadrilla."
      >
        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Nombre y apellido
              <input
                name="name"
                placeholder="Ej: Juan Perez"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Legajo
              <input
                name="legajo"
                placeholder="Ej: 1204"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              DNI (opcional)
              <input
                name="dni"
                placeholder="Ej: 30123456"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Provincia (opcional)
              <input
                name="province"
                placeholder="Ej: Santiago del Estero"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-slate-700 md:col-span-2">
              CBU (opcional)
              <input
                name="cbu"
                placeholder="Ej: 0000000000000000000001"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-slate-700 md:col-span-2">
              Banco (opcional)
              <input
                name="bank"
                placeholder="Banco Demo"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          <SubmitButton
            label="Guardar colaborador"
            pendingLabel="Guardando..."
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          />
        </form>
      </Modal>

      {isPending && (
        <span className="text-xs text-slate-400">Guardando...</span>
      )}
    </>
  );
}
