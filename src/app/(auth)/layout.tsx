import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell overflow-hidden">
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
        {children}
      </div>
    </div>
  );
}
