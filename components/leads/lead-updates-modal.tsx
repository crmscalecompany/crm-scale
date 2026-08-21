"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, FileText } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { fieldInputClass, primaryButtonClass } from "@/lib/form-styles";
import { formatDateTimeBR } from "@/lib/format";
import { listLeadUpdatesAction, createLeadUpdateAction } from "@/lib/actions/lead-updates";
import { cn } from "@/lib/utils";

interface Attachment {
  id: string;
  nome_arquivo: string;
  url: string | null;
}

interface LeadUpdate {
  id: string;
  texto: string;
  criado_em: string;
  autor: { nome: string } | null;
  lead_update_attachments: Attachment[];
}

interface LeadUpdatesModalProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadNome: string;
}

// Replaces the old single "Observação" field (per explicit user request —
// "não considere apenas oq eu to mandando... precisa ter tudo q o monday
// tem e ser melhor") with an append-only history: every note keeps its own
// author/timestamp instead of overwriting whatever was there before, and
// can carry file attachments (lead-attachments Storage bucket, private —
// see lib/actions/lead-updates.ts for the signed-URL handoff).
export function LeadUpdatesModal({ open, onClose, leadId, leadNome }: LeadUpdatesModalProps) {
  const [updates, setUpdates] = useState<LeadUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const data = await listLeadUpdatesAction(leadId);
        if (!cancelled) setUpdates(data as LeadUpdate[]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar atualizações.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [open, leadId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("texto", texto);
      for (const file of files) formData.append("arquivos", file);
      await createLeadUpdateAction(leadId, formData);
      setTexto("");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      const fresh = await listLeadUpdatesAction(leadId);
      setUpdates(fresh as LeadUpdate[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar atualização.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Atualizações — ${leadNome}`} className="max-w-2xl">
      <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva uma atualização…"
          rows={3}
          className={fieldInputClass}
        />
        <div className="flex items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-secondary hover:text-primary">
            <Paperclip size={14} />
            {files.length > 0 ? `${files.length} arquivo(s) selecionado(s)` : "Anexar arquivos"}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </label>
          <button type="submit" disabled={saving || !texto.trim()} className={primaryButtonClass}>
            {saving ? "Salvando…" : "Salvar atualização"}
          </button>
        </div>
        {error && <p className="text-sm text-status-critical">{error}</p>}
      </form>

      <div className="max-h-[50vh] overflow-y-auto border-t border-hairline pt-4">
        {loading ? (
          <p className="text-sm text-muted">Carregando…</p>
        ) : updates.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma atualização ainda.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {updates.map((update) => (
              <li key={update.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 text-xs text-muted">
                  <span className="font-semibold text-secondary">{update.autor?.nome ?? "—"}</span>
                  <span>{formatDateTimeBR(update.criado_em)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-primary">{update.texto}</p>
                {update.lead_update_attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {update.lead_update_attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.url ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex items-center gap-1.5 rounded-md border border-hairline px-2 py-1 text-xs text-accent-light transition hover:border-hairline-strong",
                          !att.url && "pointer-events-none opacity-50"
                        )}
                      >
                        <FileText size={12} />
                        {att.nome_arquivo}
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
