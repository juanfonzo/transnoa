type ActionFeedbackProps = {
  message: string | null;
};

export function ActionFeedback({ message }: ActionFeedbackProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
    >
      {message}
    </div>
  );
}
