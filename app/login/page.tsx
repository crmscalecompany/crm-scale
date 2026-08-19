"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ScaleLogo } from "@/components/scale-logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("E-mail ou senha inválidos.");
      setPending(false);
      return;
    }

    router.replace("/crm");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-card border border-hairline bg-surface-1 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="mb-8 flex flex-col items-center gap-3">
          <ScaleLogo size="lg" />
          <h1 className="text-lg font-semibold text-primary">CRM Interno</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-muted">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-hairline bg-black/30 px-3 py-2.5 text-sm text-primary outline-none transition focus:border-accent-primary focus:shadow-[0_0_0_3px_var(--accent-primary-soft)]"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-muted">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-hairline bg-black/30 px-3 py-2.5 text-sm text-primary outline-none transition focus:border-accent-primary focus:shadow-[0_0_0_3px_var(--accent-primary-soft)]"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-status-critical/30 bg-status-critical/10 px-3 py-2 text-sm text-status-critical">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-lg bg-gradient-to-r from-accent-primary to-accent-light px-4 py-2.5 text-sm font-bold text-ink-strong shadow-[0_0_20px_var(--accent-primary-glow)] transition hover:shadow-[0_0_28px_var(--accent-primary-glow)] disabled:opacity-60"
          >
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Acesso por convite. Fale com o administrador para receber acesso e definir seu papel (SDR/Closer/AM/Advogado).
        </p>
      </div>
    </main>
  );
}
