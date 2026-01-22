"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  label: string;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
};

export function SubmitButton({
  label,
  pendingLabel = "Procesando...",
  className = "",
  disabled = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={`${className} ${
        isDisabled ? "cursor-not-allowed opacity-60" : ""
      }`.trim()}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

