export default function RequestDetailLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Cargando detalle de solicitud">
      <div className="h-5 w-40 rounded-full bg-slate-200" />
      <div>
        <div className="h-8 w-64 rounded bg-slate-200" />
        <div className="mt-4 h-4 w-full max-w-xl rounded bg-slate-100" />
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-16 border-y border-slate-200 bg-slate-100" />
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
        <div className="h-96 border-y border-slate-200 bg-slate-100" />
        <div className="h-96 border-l border-slate-200 bg-slate-100" />
      </div>
    </div>
  );
}
