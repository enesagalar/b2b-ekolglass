const panelClass = "rounded-lg border border-slate-200 bg-white shadow-sm";

export default function AdminReportsLoading() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Rapor hazırlanıyor">
      <div className="h-20 animate-pulse rounded-md bg-slate-100" />
      <div className={`${panelClass} h-32 animate-pulse bg-slate-50`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className={`${panelClass} h-36 animate-pulse bg-slate-50`} />
        ))}
      </div>
      <div className={`${panelClass} h-72 animate-pulse bg-slate-50`} />
    </div>
  );
}
