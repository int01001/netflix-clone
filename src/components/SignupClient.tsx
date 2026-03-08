'use client';

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, useRef } from "react";

type Step = "request" | "verify" | "profile";

export default function SignupClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");

  const profileRef = useRef({
    name: "",
    phone: "",
    dateOfBirth: "",
    gender: "prefer_not_to_say" as "male" | "female" | "other" | "prefer_not_to_say",
    genres: [] as string[],
    languages: [] as string[],
    preferred_genres: [] as string[],
    preferred_languages: [] as string[],
  });

  const [profile, setProfile] = useState(profileRef.current);

  const updateProfile = (updates: Partial<typeof profile>) => {
    const newProfile = { ...profileRef.current, ...updates };
    profileRef.current = newProfile;
    setProfile(newProfile);
  };

  const requestOtp = (event: React.FormEvent) => {
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
      const res = await fetch("/api/auth/signup/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Unable to send code");
        return;
      }

      setInfo("We sent a verification code to your email.");
      setStep("verify");
    });
  };

  const verifyOtp = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    startTransition(async () => {
      const res = await fetch("/api/auth/signup/verify", {
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

      setInfo("Email verified! Now set up your profile.");
      setStep("profile");
    });
  };

  const submitProfile = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const latestProfile = profileRef.current;
    console.log("[submitProfile] profile:", latestProfile);
    console.log("[submitProfile] genres:", latestProfile.genres, "length:", latestProfile.genres.length);
    console.log("[submitProfile] languages:", latestProfile.languages, "length:", latestProfile.languages.length);

    if (latestProfile.genres.length !== 5) {
      setError("Please select exactly 5 genres");
      return;
    }

    if (latestProfile.languages.length !== 3) {
      setError("Please select exactly 3 languages");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/auth/signup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(latestProfile),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Unable to save profile");
        return;
      }

      setInfo("Account created! Redirecting...");
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 800);
    });
  };

  const allGenres = [
    "Action", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Thriller", "Adventure", "Animation", "Crime"
  ];

  const allLanguages = [
    "English", "Spanish", "French", "German", "Japanese", "Korean", "Hindi", "Mandarin", "Arabic", "Portuguese", "Russian", "Italian"
  ];

  const toggleGenre = (genre: string) => {
    const current = profileRef.current;
    const newGenres = current.genres.includes(genre)
      ? current.genres.filter((g: string) => g !== genre)
      : [...current.genres, genre];
    updateProfile({ genres: newGenres, preferred_genres: newGenres });
  };

  const toggleLanguage = (lang: string) => {
    const current = profileRef.current;
    const newLanguages = current.languages.includes(lang)
      ? current.languages.filter((l: string) => l !== lang)
      : [...current.languages, lang];
    updateProfile({ languages: newLanguages, preferred_languages: newLanguages });
  };

  return (
    <div className="glass w-full max-w-md space-y-6 rounded-2xl p-8">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-red-200/80">CineWave</p>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Create account</h1>
        <p className="text-sm text-slate-300/80">
          {step === "request" && "Enter your email and password to start."}
          {step === "verify" && "Enter the verification code we emailed you."}
          {step === "profile" && "Tell us a bit about yourself to personalize your experience."}
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

          <label className="block space-y-2">
            <span className="text-sm text-slate-200/80">Password</span>
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
            {pending ? "Sending..." : "Send verification code"}
          </motion.button>
        </form>
      )}

      {step === "verify" && (
        <form onSubmit={verifyOtp} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm text-slate-200/80">Verification code</span>
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

      {step === "profile" && (
        <form onSubmit={submitProfile} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm text-slate-200/80">Name</span>
            <input
              required
              value={profile.name}
              onChange={(e) => updateProfile({ name: e.target.value })}
              className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none transition focus:border-[rgba(229,9,20,0.75)] focus:bg-[rgba(229,9,20,0.14)]"
              placeholder="Alex Netflixer"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-200/80">Phone</span>
            <input
              value={profile.phone}
              onChange={(e) => updateProfile({ phone: e.target.value })}
              className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none transition focus:border-[rgba(229,9,20,0.75)] focus:bg-[rgba(229,9,20,0.14)]"
              placeholder="+1234567890"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-200/80">Date of birth</span>
            <input
              type="date"
              value={profile.dateOfBirth}
              onChange={(e) => updateProfile({ dateOfBirth: e.target.value })}
              className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none transition focus:border-[rgba(229,9,20,0.75)] focus:bg-[rgba(229,9,20,0.14)]"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-200/80">Gender</span>
            <select
              value={profile.gender}
              onChange={(e) => updateProfile({ gender: e.target.value as any })}
              className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none transition focus:border-[rgba(229,9,20,0.75)] focus:bg-[rgba(229,9,20,0.14)]"
            >
              <option value="prefer_not_to_say">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>

          <div className="space-y-2">
            <span className="text-sm text-slate-200/80">Select 5 genres</span>
            <div className="grid grid-cols-3 gap-2">
              {allGenres.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  className={`rounded border px-2 py-1 text-xs transition ${
                    profile.genres.includes(genre)
                      ? "border-[#e50914] bg-[#e50914]/20 text-white"
                      : "border-white/15 bg-white/[0.04] text-white/70 hover:border-white/25"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400">{profile.genres.length} / 5 selected</p>
          </div>

          <div className="space-y-2">
            <span className="text-sm text-slate-200/80">Select 3 languages</span>
            <div className="grid grid-cols-3 gap-2">
              {allLanguages.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  className={`rounded border px-2 py-1 text-xs transition ${
                    profile.languages.includes(lang)
                      ? "border-[#e50914] bg-[#e50914]/20 text-white"
                      : "border-white/15 bg-white/[0.04] text-white/70 hover:border-white/25"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400">{profile.languages.length} / 3 selected</p>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={pending}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-80"
            type="submit"
          >
            {pending ? "Creating account..." : "Complete setup"}
          </motion.button>
        </form>
      )}

      <p className="text-center text-sm text-slate-300/80">
        Already have an account?{" "}
        <Link className="font-semibold text-white underline" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
