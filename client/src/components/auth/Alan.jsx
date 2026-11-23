// Etiketli giriş alanı
export function Alan({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-muted">{label}</span>
      <input className="inp" {...props} />
    </label>
  );
}