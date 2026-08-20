// Evolution API integration (migrated 2026-08-20 from Z-API — see git
// history for the retired ZApiWhatsappAdapter). Self-hosted, so unlike
// Z-API there's no fixed provider domain: EVOLUTION_API_URL is the
// operator's own server. Falls back to the stub when the three
// EVOLUTION_* vars aren't set, so local dev without credentials still
// works (just logs instead of sending).
export interface WhatsappAdapter {
  sendMessage(params: { to: string; text: string }): Promise<{ providerMessageId: string }>;
  createGroup(params: { name: string; participantPhones: string[] }): Promise<{ groupJid: string }>;
}

class EvolutionWhatsappAdapter implements WhatsappAdapter {
  constructor(
    private readonly apiUrl: string,
    private readonly instance: string,
    private readonly apiKey: string
  ) {}

  private get headers(): Record<string, string> {
    return { "Content-Type": "application/json", apikey: this.apiKey };
  }

  // `to` accepts either a phone number ("55DDDNUMERO") or a group JID
  // ("<id>@g.us", Evolution's format — see EVOLUTION_LEADS_GROUP_JID) —
  // sendText handles both the same way, just via the `number` field.
  async sendMessage({ to, text }: { to: string; text: string }) {
    const res = await fetch(`${this.apiUrl}/message/sendText/${this.instance}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ number: to, text }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`[EvolutionWhatsappAdapter] sendText failed (${res.status}): ${body}`);
    }

    const data = (await res.json().catch(() => ({}))) as { key?: { id?: string } };
    return { providerMessageId: data.key?.id ?? `evolution-${Date.now()}` };
  }

  async createGroup({ name, participantPhones }: { name: string; participantPhones: string[] }) {
    const res = await fetch(`${this.apiUrl}/group/create/${this.instance}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ subject: name, participants: participantPhones }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`[EvolutionWhatsappAdapter] group/create failed (${res.status}): ${body}`);
    }

    // Field name isn't pinned down in Evolution's docs (they don't publish
    // the create-group response shape) — cover the plausible names rather
    // than guess wrong and silently return an empty groupJid.
    const data = (await res.json().catch(() => ({}))) as { id?: string; groupJid?: string; gid?: string };
    return { groupJid: data.id ?? data.groupJid ?? data.gid ?? "" };
  }
}

class StubWhatsappAdapter implements WhatsappAdapter {
  async sendMessage(params: { to: string; text: string }) {
    console.warn("[StubWhatsappAdapter] sendMessage — EVOLUTION_API_URL/EVOLUTION_INSTANCE/EVOLUTION_API_KEY não configurados", params);
    return { providerMessageId: `stub-message-${Date.now()}` };
  }

  async createGroup(params: { name: string; participantPhones: string[] }) {
    console.warn("[StubWhatsappAdapter] createGroup — EVOLUTION_API_URL/EVOLUTION_INSTANCE/EVOLUTION_API_KEY não configurados", params);
    return { groupJid: `stub-group-${Date.now()}` };
  }
}

let cached: WhatsappAdapter | null = null;

export function getWhatsappAdapter(): WhatsappAdapter {
  if (cached) return cached;

  const { EVOLUTION_API_URL, EVOLUTION_INSTANCE, EVOLUTION_API_KEY } = process.env;
  cached =
    EVOLUTION_API_URL && EVOLUTION_INSTANCE && EVOLUTION_API_KEY
      ? new EvolutionWhatsappAdapter(EVOLUTION_API_URL.replace(/\/+$/, ""), EVOLUTION_INSTANCE, EVOLUTION_API_KEY)
      : new StubWhatsappAdapter();

  return cached;
}
