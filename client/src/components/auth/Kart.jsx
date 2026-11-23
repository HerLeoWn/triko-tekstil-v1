// Giriş ve kurulum ekranlarının ortak kartı
export function Kart({ baslik, aciklama, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-accent/10 to-bg p-4">
      <div className="card w-full max-w-sm animate-fadeUp shadow-lift">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-lg font-semibold text-white">
            T
          </div>
          <h1 className="text-lg font-semibold">{baslik}</h1>
          <p className="mt-1 text-sm text-muted">{aciklama}</p>
        </div>
        {children}
      </div>
    </div>
  );
}