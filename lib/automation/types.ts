// Typed event union the automation engine reacts to. New event types get
// added here as later weeks wire up real triggers (meeting reminders,
// contract signing, etc) — call sites just need to call emitEvent(), the
// matching/logging logic in events.ts doesn't change per event type.
export type CrmEventType =
  | "lead.created"
  | "lead.status_changed"
  | "deal.created"
  | "deal.status_changed"
  | "qualification.created"
  | "meeting.scheduled"
  | "contract.signed";

export type CrmEventEntidadeTipo = "lead" | "deal" | "qualification" | "meeting" | "contract";

export interface CrmEvent<T extends Record<string, unknown> = Record<string, unknown>> {
  type: CrmEventType;
  entidade_tipo: CrmEventEntidadeTipo;
  entidade_id: string;
  payload: T;
  occurred_at: string;
}
