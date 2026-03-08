import ForgotPasswordClient from "@/components/ForgotPasswordClient";

export const metadata = {
  title: "Forgot password | CineWave",
};

export default function ForgotPasswordPage() {
  return (
    <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-red-200/80">
          Recover access
        </p>
        <h1 className="text-4xl font-bold leading-tight">Reset your password.</h1>
        <p className="max-w-xl text-lg text-slate-300/80">
          We will email you a one-time code. Enter the code to set a new password.
        </p>
      </div>
      <ForgotPasswordClient />
    </div>
  );
}
