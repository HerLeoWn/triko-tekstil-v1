// Tam seri (yeşil gradyan) + eksik seri (turuncu çizgili), açılışta soldan dolar
export function Bar({ tam, eksik, max, delay = 0 }) {
  const seri = tam + eksik;
  const genislik = max ? (seri / max) * 100 : 0;
  return (
    <div className="h-3 overflow-hidden rounded-full bg-track">
      <div
        className="flex h-full origin-left animate-grow overflow-hidden rounded-full"
        style={{ width: `${genislik}%`, animationDelay: `${delay}ms` }}
      >
        <div className="bg-gradient-to-r from-accent to-accent-hover transition-all duration-500" style={{ flex: tam }} />
        <div
          className="bg-[repeating-linear-gradient(45deg,#d18a1f_0_6px,#e8a33d_6px_12px)]"
          style={{ flex: eksik }}
        />
      </div>
    </div>
  );
}