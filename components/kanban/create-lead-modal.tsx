"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { fieldLabelClass, fieldInputClass, primaryButtonClass, secondaryButtonClass } from "@/lib/form-styles";
import { createLeadAction } from "@/lib/actions/leads";
import type { Database } from "@/lib/types/database.types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
interface Niche {
  id: string;
  nome: string;
}

interface CreateLeadModalProps {
  open: boolean;
  onClose: () => void;
  niches: Niche[];
  onCreated: (lead: Lead) => void;
}

export function CreateLeadModal({ open, onClose, niches, onCreated }: CreateLeadModalProps) {
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [nicheId, setNicheId] = useState("");
  const [origem, setOrigem] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setNome("");
    setEmpresa("");
    setTelefone("");
    setEmail("");
    setNicheId("");
    setOrigem("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const lead = await createLeadAction({
          nome: nome.trim(),
          empresa: empresa || null,
          telefone: telefone || null,
          whatsapp_txt: telefone || null,
          email: email || null,
          niche_id: nicheId || null,
          origem: origem || null,
        });
        onCreated(lead);
        reset();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao criar lead.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo lead">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nome" className={fieldLabelClass}>
            Nome *
          </label>
          <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} className={fieldInputClass} autoFocus required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="empresa" className={fieldLabelClass}>
            Empresa
          </label>
          <input id="empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} className={fieldInputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="telefone" className={fieldLabelClass}>
              WhatsApp
            </label>
            <input id="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} className={fieldInputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className={fieldLabelClass}>
              E-mail
            </label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldInputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nicho" className={fieldLabelClass}>
              Nicho
            </label>
            <select id="nicho" value={nicheId} onChange={(e) => setNicheId(e.target.value)} className={fieldInputClass}>
              <option value="">—</option>
              {niches.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="origem" className={fieldLabelClass}>
              Origem
            </label>
            <input
              id="origem"
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
              className={fieldInputClass}
              placeholder="Meta Ads, indicação…"
            />
          </div>
        </div>

        {error && <p className="text-sm text-status-critical">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancelar
          </button>
          <button type="submit" disabled={pending} className={primaryButtonClass}>
            {pending ? "Criando…" : "Criar lead"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
