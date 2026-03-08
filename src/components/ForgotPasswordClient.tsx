'use client';

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Step = "request" | "verify" | "reset";

export default function ForgotPasswordClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const requestOtp = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    startTransition(async () => {
      const res = await fetch("/api/auth/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Unable to send code");
        return;
      }

      setInfo("We sent a code to your email.");
      setStep("verify");
    });
  };

  const verifyOtp = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    startTransition(async () => {
      const res = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = (await res.json().catch(() => ({}))) as { token?: string; message?: string };

      if (!res.ok) {
        setError(data.message ?? "Invalid code");
        return;
      }

      if (!data.token) {
        setError("Unable to verify code");
        return;
      }

      setResetToken(data.token);
      setStep("reset");
    });
  };

  const resetPassword = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password }),
      });

      const data = (await res.json().catch(() => ({}))) as { message?: string };

      if (!res.ok) {
        setError(data.message ?? "Unable to reset password");
        return;
      }

      setInfo("Password updated. You can sign in now.");
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 600);
    });
  };

  return (
    <div className="glass w-full max-w-md space-y-6 rounded-2xl p-8">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-red-200/80">CineWave</p>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Forgot password</h1>
        <p className="text-sm text-slate-300/80">
          {step === "request" && "Enter your email to receive a reset code."}
          {step === "verify" && "Enter the one-time code we emailed you."}
          {step === "reset" && "Choose a new password for your account."}
        </p>
      </div>

      {info && (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100">
          {info}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-[rgba(229,9,20,0.45)] bg-[rgba(229,9,20,0.14)] px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      )}

      {step === "request" && (
        <form onSubmit={requestOtp} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm text-slate-200/80">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none transition focus:border-[rgba(229,9,20,0.75)] focus:bg-[rgba(229,9,20,0.14)]"
              placeholder="you@example.com"
            />
          </label>

          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={pending}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-80"
            type="submit"
          >
            {pending ? "Sending..." : "Send code"}
          </motion.button>
        </form>
      )}

      {step === "verify" && (
        <form onSubmit={verifyOtp} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm text-slate-200/80">Code</span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none transition focus:border-[rgba(229,9,20,0.75)] focus:bg-[rgba(229,9,20,0.14)]"
              placeholder="6-digit code"
              maxLength={6}
            />
          </label>

          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={pending}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-80"
            type="submit"
          >
            {pending ? "Verifying..." : "Verify code"}
          </motion.button>

          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setOtp("");
              setStep("request");
            }}
            className="w-full text-sm font-semibold text-white underline disabled:opacity-70"
          >
            Use a different email
          </button>
        </form>
      )}

      {step === "reset" && (
        <form onSubmit={resetPassword} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm text-slate-200/80">New password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none transition focus:border-[rgba(229,9,20,0.75)] focus:bg-[rgba(229,9,20,0.14)]"
              placeholder="********"
              minLength={6}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-200/80">Confirm password</span>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none transition focus:border-[rgba(229,9,20,0.75)] focus:bg-[rgba(229,9,20,0.14)]"
              placeholder="********"
              minLength={6}
            />
          </label>

          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={pending}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-80"
            type="submit"
          >
            {pending ? "Updating..." : "Update password"}
          </motion.button>
        </form>
      )}

      <p className="text-center text-sm text-slate-300/80">
        Remember your password?{" "}
        <Link className="font-semibold text-white underline" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
