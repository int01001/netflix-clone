import AuthForm from "@/components/AuthForm";

export const metadata = {
  title: "Create account | CineWave",
};

export default function SignupPage() {
  return (
    <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-red-200/80">
          Join the crew
        </p>
        <h1 className="text-4xl font-bold leading-tight">
          Build your own watch universe.
        </h1>
        <p className="max-w-xl text-lg text-slate-300/80">
          Create an account to sync favorites, keep progress, and enjoy a Netflix-like
          UI powered by Next.js, Tailwind, and MySQL.
        </p>
      </div>
      <AuthForm mode="signup" />
    </div>
  );
}
