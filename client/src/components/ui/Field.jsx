export function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-[11px] text-muted">{label}</label>
      {children}
    </div>
  );
}