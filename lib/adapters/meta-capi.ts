// Typed seam for the future Meta Conversions API integration (blueprint
// §4.6) — feeds meta_conversion_events. See lib/adapters/whatsapp.ts for
// the pattern this follows.
export interface ConversionsAdapter {
  sendEvent(params: {
    eventName: "Lead" | "Qualified" | "Purchase";
    fbclid?: string | null;
    value?: number | null;
    eventTime: string;
  }): Promise<{ status: "enviado" | "erro"; response?: unknown }>;
}

class StubConversionsAdapter implements ConversionsAdapter {
  async sendEvent(params: { eventName: "Lead" | "Qualified" | "Purchase"; fbclid?: string | null; value?: number | null; eventTime: string }) {
    console.warn("[StubConversionsAdapter] sendEvent — no Meta CAPI integration wired yet", params);
    return { status: "enviado" as const, response: { stub: true } };
  }
}

let cached: ConversionsAdapter | null = null;

export function getConversionsAdapter(): ConversionsAdapter {
  if (!cached) cached = new StubConversionsAdapter();
  return cached;
}
