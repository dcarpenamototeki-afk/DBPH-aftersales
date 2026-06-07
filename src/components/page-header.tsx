export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-ink">{title}</h2>
        <p className="text-sm text-slate-500">Encode, search, update, monitor, import, and export records.</p>
      </div>
      {children}
    </div>
  );
}
