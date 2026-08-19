import { CalendarPlus, ClipboardCheck, Loader2, Mail, MailCheck } from "lucide-react";
import { glassPanelClass, glassPanelStyle } from "@/lib/glass-panel";
import { PersonInline } from "@/components/ui/avatar";
import { iconButtonClass } from "@/lib/form-styles";
import { cn } from "@/lib/utils";
import type { PersonRef } from "@/lib/leads-table-columns";
import type { Database } from "@/lib/types/database.types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

interface LeadCardProps {
  lead: Lead;
  sdr: PersonRef | null;
  nicheName: string | null;
  isPendingQualification: boolean;
  canClaim: boolean;
  onClaim: () => void;
  onQualify: () => void;
  onScheduleMeeting: () => void;
  /** "Enviar e-mail de primeiro contato" — only rendered when the lead has
   * an email on file. `sending`/`sent` are per-lead so the icon can show a
   * spinner/checkmark without the parent needing a whole modal for a
   * one-click, no-input action. */
  onSendFirstContactEmail?: () => void;
  sendingFirstContactEmail?: boolean;
  firstContactEmailSent?: boolean;
  /** "card" (default) for kanban tiles; "row" renders a `<tr>` instead of a
   * glass panel, for the grouped table view (see grouped-table-section.tsx)
   * — same data/handlers either way, just denser markup so more items fit
   * on screen at once without horizontal kanban scrolling. */
  variant?: "card" | "row";
}

function PersonCell({ sdr, canClaim, onClaim }: Pick<LeadCardProps, "sdr" | "canClaim" | "onClaim">) {
  if (sdr) return <PersonInline name={sdr.nome} src={sdr.foto_url} />;
  if (canClaim)
    return (
      <button
        type="button"
        onClick={onClaim}
        className="rounded-md border border-accent-primary/40 px-2 py-1 text-xs text-accent-light transition hover:bg-accent-primary/10"
      >
        Reivindicar
      </button>
    );
  return <span className="text-xs text-muted">Sem SDR</span>;
}

// Icon-only (not text buttons) to keep cards/rows from feeling cluttered —
// title/aria-label carry the label for accessibility and hover tooltips.
function ActionIcons({
  lead,
  onQualify,
  onScheduleMeeting,
  onSendFirstContactEmail,
  sendingFirstContactEmail,
  firstContactEmailSent,
}: Pick<
  LeadCardProps,
  "lead" | "onQualify" | "onScheduleMeeting" | "onSendFirstContactEmail" | "sendingFirstContactEmail" | "firstContactEmailSent"
>) {
  return (
    <>
      <button type="button" title="Qualificar" aria-label="Qualificar" onClick={onQualify} className={iconButtonClass}>
        <ClipboardCheck size={14} />
      </button>
      {lead.owner_sdr_id && (
        <button type="button" title="Marcar reunião" aria-label="Marcar reunião" onClick={onScheduleMeeting} className={iconButtonClass}>
          <CalendarPlus size={14} />
        </button>
      )}
      {lead.email && onSendFirstContactEmail && (
        <button
          type="button"
          title={firstContactEmailSent ? "E-mail enviado" : "Enviar e-mail de primeiro contato"}
          aria-label="Enviar e-mail de primeiro contato"
          onClick={onSendFirstContactEmail}
          disabled={sendingFirstContactEmail}
          className={cn(iconButtonClass, firstContactEmailSent && "border-status-good/50 text-status-good")}
        >
          {sendingFirstContactEmail ? (
            <Loader2 size={14} className="animate-spin" />
          ) : firstContactEmailSent ? (
            <MailCheck size={14} />
          ) : (
            <Mail size={14} />
          )}
        </button>
      )}
    </>
  );
}

export function LeadCard({
  lead,
  sdr,
  nicheName,
  isPendingQualification,
  canClaim,
  onClaim,
  onQualify,
  onScheduleMeeting,
  onSendFirstContactEmail,
  sendingFirstContactEmail,
  firstContactEmailSent,
  variant = "card",
}: LeadCardProps) {
  if (variant === "row") {
    return (
      <tr className="border-b border-hairline/60 last:border-0 hover:bg-surface-1">
        <td className="px-3 py-2 text-sm font-medium text-primary">
          <div className="flex items-center gap-2">
            {lead.nome}
            {isPendingQualification && (
              <span className="shrink-0 rounded-full bg-status-warning/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-status-warning">
                pendente
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2 text-sm text-secondary">{lead.empresa || "—"}</td>
        <td className="px-3 py-2 text-sm text-secondary">{nicheName || "—"}</td>
        <td className="px-3 py-2">
          <PersonCell sdr={sdr} canClaim={canClaim} onClaim={onClaim} />
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <ActionIcons
              lead={lead}
              onQualify={onQualify}
              onScheduleMeeting={onScheduleMeeting}
              onSendFirstContactEmail={onSendFirstContactEmail}
              sendingFirstContactEmail={sendingFirstContactEmail}
              firstContactEmailSent={firstContactEmailSent}
            />
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className={cn(glassPanelClass, "!p-3")} style={glassPanelStyle}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-primary">{lead.nome}</p>
        {isPendingQualification && (
          <span className="shrink-0 rounded-full bg-status-warning/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-status-warning">
            pendente
          </span>
        )}
      </div>

      {lead.empresa && <p className="mt-0.5 text-xs text-secondary">{lead.empresa}</p>}

      {nicheName && <span className="mt-2 inline-block rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-secondary">{nicheName}</span>}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <PersonCell sdr={sdr} canClaim={canClaim} onClaim={onClaim} />
        <div className="flex items-center gap-2">
          <ActionIcons
            lead={lead}
            onQualify={onQualify}
            onScheduleMeeting={onScheduleMeeting}
            onSendFirstContactEmail={onSendFirstContactEmail}
            sendingFirstContactEmail={sendingFirstContactEmail}
            firstContactEmailSent={firstContactEmailSent}
          />
        </div>
      </div>
    </div>
  );
}
