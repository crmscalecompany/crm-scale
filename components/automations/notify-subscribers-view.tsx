"use client";

import { useState } from "react";
import { notifySubscribersAction } from "@/lib/actions/subscribers";
import { fieldLabelClass, fieldInputClass, primaryButtonClass } from "@/lib/form-styles";

const TIPO_OPTIONS = [
  { value: "Cases", label: "Novo case" },
  { value: "Newsletter", label: "Novo artigo" },
] as const;

type Tipo = (typeof TIPO_OPTIONS)[number]["value"];

interface NotifySubscribersViewProps {
  currentUserRole: string | null;
}

// "Avisar inscritos" — the only piece of the new-case/new-article email
// automation that's a manual trigger: whoever publishes fills this in and
// clicks send. No auto-detection of new content, on purpose (see
// lib/actions/subscribers.ts). Admin-only, matching how CommissionsView
// gates its sensitive panel.
export function NotifySubscribersView({ currentUserRole }: NotifySubscribersViewProps) {
  const [tipo, setTipo] = useState<Tipo>("Cases");
  const [titulo, setTitulo] = useState("");
  const [resumo, setResumo] = useState("");
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ sent: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = currentUserRole === "admin";

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-semibold text-primary">Automações</h1>
        <p className="text-sm text-muted">Apenas administradores podem avisar os inscritos.</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !resumo.trim() || !url.trim()) {
      setError("Preencha título, resumo e URL.");
      return;
    }
    setError(null);
    setResult(null);
    setPending(true);
    try {
      const res = await notifySubscribersAction({ tipo, titulo: titulo.trim(), resumo: resumo.trim(), url: url.trim() });
      setResult(res);
      setTitulo("");
      setResumo("");
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-primary">Avisar inscritos</h1>
        <p className="mt-1 text-sm text-muted">
          Manda um e-mail pra todo mundo inscrito em novos cases ou novos artigos. Disparo manual — ninguém recebe nada até você
          clicar em enviar.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tipo" className={fieldLabelClass}>
            O que saiu?
          </label>
          <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)} className={fieldInputClass}>
            {TIPO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="titulo" className={fieldLabelClass}>
            Título
          </label>
          <input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} className={fieldInputClass} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="resumo" className={fieldLabelClass}>
            Resumo curto
          </label>
          <textarea id="resumo" value={resumo} onChange={(e) => setResumo(e.target.value)} className={fieldInputClass} rows={3} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="url" className={fieldLabelClass}>
            URL do conteúdo
          </label>
          <input
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={fieldInputClass}
            placeholder="https://scalecompany.com.br/..."
          />
        </div>

        {error && <p className="text-sm text-status-critical">{error}</p>}
        {result && <p className="text-sm text-status-good">Enviado para {result.sent} inscrito(s).</p>}

        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Enviando…" : "Enviar"}
        </button>
      </form>
    </div>
  );
}
