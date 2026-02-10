import AuthForm from "@/components/AuthForm";

export const metadata = {
  title: "Sign in | CineWave",
};

export default function LoginPage() {
  return (
    <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-red-200/80">
          Stream boldly
        </p>
        <h1 className="text-4xl font-bold leading-tight">Limitless stories.</h1>
        <p className="max-w-xl text-lg text-slate-300/80">
          Sign in to continue your Netflix-style experience with synced favorites,
          cinematic UI, and buttery-smooth animations.
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm text-slate-200/90">
          <div className="glass rounded-xl p-3">
            <p className="font-semibold text-white">Local MySQL</p>
            <p className="text-xs text-slate-300/80">
              Data is stored locally so you keep control of your watchlist.
            </p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="font-semibold text-white">Motion-first UI</p>
            <p className="text-xs text-slate-300/80">
              Framer Motion animations for loading, cards, and auth.
            </p>
          </div>
        </div>
      </div>
      <AuthForm mode="login" />
    </div>
  );
}
