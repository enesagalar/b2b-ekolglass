export function PortalRouteLoading({ label = "İçerik hazırlanıyor" }: { label?: string }) {
  return (
    <div className="grid gap-6" role="status" aria-live="polite" aria-label={label}>
      <div className="route-progress-track" aria-hidden="true">
        <span className="route-progress-bar" />
      </div>
      <div className="grid gap-3 border-b border-[#d9dadd] pb-6" aria-hidden="true">
        <span className="route-skeleton h-3 w-28 rounded" />
        <span className="route-skeleton h-8 w-56 max-w-full rounded-md" />
        <span className="route-skeleton h-4 w-[520px] max-w-full rounded" />
      </div>
      <div className="grid gap-4 md:grid-cols-3" aria-hidden="true">
        {[0, 1, 2].map((item) => (
          <span key={item} className="route-skeleton h-28 rounded-lg border border-[#d9dadd]" />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
