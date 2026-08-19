import { CalendarPlus, CheckCircle2, ClipboardCheck, FileText, RotateCcw, XCircle } from "lucide-react";
import { glassPanelClass, glassPanelStyle } from "@/lib/glass-panel";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { PersonInline } from "@/components/ui/avatar";
import { iconButtonClass } from "@/lib/form-styles";
import type { PersonRef } from "@/lib/leads-table-columns";
import type { Database, MeetingStatus } from "@/lib/types/database.types";

type Deal = Database["public"]["Tables"]["deals"]["Row"];
type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface DealCardProps {
  deal: Deal;
  leadName: string;
  closer: PersonRef | null;
  meeting: Meeting | null;
  isPendingQualification: boolean;
  onQualify: () => void;
  onUpdateMeetingStatus: (meetingId: string, status: MeetingStatus) => void;
  /** Opens ScheduleR2Modal — undefined when the deal has no closer yet
   * (shouldn't happen once em_negociacao, but keeps the prop optional
   * rather than forcing every caller to guarantee it). */
  onScheduleR2?: () => void;
  /** "card" (default) for kanban tiles; "row" renders a `<tr>` instead of a
   * glass panel, for the grouped table view (see grouped-table-section.tsx).
   */
  variant?: "card" | "row";
}

const MEETING_OUTCOME_BUTTONS: { status: MeetingStatus; label: string; icon: typeof CheckCircle2 }[] = [
  { status: "realizada", label: "Realizada", icon: CheckCircle2 },
  { status: "no_show", label: "No Show", icon: XCircle },
  { status: "remarcada", label: "Remarcada", icon: RotateCcw },
];

function MeetingOutcomeButtons({ deal, meeting, onUpdateMeetingStatus }: Pick<DealCardProps, "deal" | "meeting" | "onUpdateMeetingStatus">) {
  if (!meeting || deal.status !== "em_negociacao") return null;
  return (
    <>
      {MEETING_OUTCOME_BUTTONS.map(({ status, label, icon: Icon }) => (
        <button
          key={status}
          type="button"
          title={label}
          aria-label={label}
          onClick={() => onUpdateMeetingStatus(meeting.id, status)}
          className={cn(
            "flex items-center justify-center rounded-md border p-1.5 transition",
            meeting.status === status
              ? "border-accent-primary/50 bg-accent-primary/15 text-accent-light"
              : "border-hairline text-secondary hover:border-hairline-strong hover:text-primary"
          )}
        >
          <Icon size={13} />
        </button>
      ))}
    </>
  );
}

export function DealCard({
  deal,
  leadName,
  closer,
  meeting,
  isPendingQualification,
  onQualify,
  onUpdateMeetingStatus,
  onScheduleR2,
  variant = "card",
}: DealCardProps) {
  const canScheduleR2 = deal.status === "em_negociacao" && !!onScheduleR2;
  const valor = formatBRL(deal.valor_bruto);

  if (variant === "row") {
    return (
      <tr className="border-b border-hairline/60 last:border-0 hover:bg-surface-1">
        <td className="px-3 py-2 text-sm font-medium text-primary">
          <div className="flex items-center gap-2">
            {leadName}
            {isPendingQualification && (
              <span className="shrink-0 rounded-full bg-status-warning/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-status-warning">
                pendente
              </span>
            )}
            {meeting?.notas_internas && (
              <span title={meeting.notas_internas} className="shrink-0 text-muted">
                <FileText size={12} />
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2 text-sm text-secondary">{valor || "—"}</td>
        <td className="px-3 py-2 text-sm text-secondary">{closer ? <PersonInline name={closer.nome} src={closer.foto_url} /> : "—"}</td>
        <td className="px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" title="Qualificar" aria-label="Qualificar" onClick={onQualify} className={iconButtonClass}>
              <ClipboardCheck size={14} />
            </button>
            {canScheduleR2 && (
              <button type="button" title="Marcar R2" aria-label="Marcar R2" onClick={onScheduleR2} className={iconButtonClass}>
                <CalendarPlus size={14} />
              </button>
            )}
            <MeetingOutcomeButtons deal={deal} meeting={meeting} onUpdateMeetingStatus={onUpdateMeetingStatus} />
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className={cn(glassPanelClass, "!p-3")} style={glassPanelStyle}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-primary">{leadName}</p>
        {isPendingQualification && (
          <span className="shrink-0 rounded-full bg-status-warning/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-status-warning">
            pendente
          </span>
        )}
      </div>

      {valor && <p className="mt-0.5 text-xs text-secondary">{valor}</p>}
      {closer && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
          Closer: <PersonInline name={closer.nome} src={closer.foto_url} />
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" title="Qualificar" aria-label="Qualificar" onClick={onQualify} className={iconButtonClass}>
          <ClipboardCheck size={14} />
        </button>
        {canScheduleR2 && (
          <button type="button" title="Marcar R2" aria-label="Marcar R2" onClick={onScheduleR2} className={iconButtonClass}>
            <CalendarPlus size={14} />
          </button>
        )}
      </div>

      {meeting?.notas_internas && (
        <p className="mt-2 flex items-start gap-1.5 border-t border-hairline pt-2 text-xs text-muted">
          <FileText size={12} className="mt-0.5 shrink-0" />
          <span className="line-clamp-2">{meeting.notas_internas}</span>
        </p>
      )}

      {meeting && deal.status === "em_negociacao" && (
        <div className="mt-2 flex gap-1 border-t border-hairline pt-2">
          <MeetingOutcomeButtons deal={deal} meeting={meeting} onUpdateMeetingStatus={onUpdateMeetingStatus} />
        </div>
      )}
    </div>
  );
}
