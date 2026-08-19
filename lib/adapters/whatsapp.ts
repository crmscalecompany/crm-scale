// Z-API integration (Phase 1.5+, see blueprint §4.3) — wired for real once
// the institutional site's lead webhooks needed an immediate WhatsApp group
// notification (no queue/worker involved, see lib/automation/notify-lead.ts).
// Falls back to the stub when ZAPI_INSTANCE_ID/ZAPI_TOKEN aren't set, so
// local dev without Z-API credentials still works (just logs instead of
// sending).
export interface WhatsappAdapter {
  sendMessage(params: { to: string; text: string }): Promise<{ providerMessageId: string }>;
  createGroup(params: { name: string; participantPhones: string[] }): Promise<{ groupJid: string }>;
}

class ZApiWhatsappAdapter implements WhatsappAdapter {
  constructor(
    private readonly instanceId: string,
    private readonly token: string,
    private readonly clientToken?: string
  ) {}

  private get baseUrl() {
    return `https://api.z-api.io/instances/${this.instanceId}/token/${this.token}`;
  }

  private get headers(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    // Z-API's account-level "Client-Token" security header — separate from
    // the per-instance token in the URL. Optional because some Z-API
    // accounts don't have it enabled, but recommended by their docs.
    if (this.clientToken) headers["Client-Token"] = this.clientToken;
    return headers;
  }

  // `to` accepts either a phone number ("55DDDNUMERO") or a group id
  // (Z-API's "phone" field for groups looks like "<id>-group"). The adapter
  // doesn't distinguish — Z-API's send-text endpoint handles both the same
  // way.
  async sendMessage({ to, text }: { to: string; text: string }) {
    const res = await fetch(`${this.baseUrl}/send-text`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ phone: to, message: text }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`[ZApiWhatsappAdapter] send-text failed (${res.status}): ${body}`);
    }

    const data = (await res.json().catch(() => ({}))) as { messageId?: string; zaapId?: string };
    return { providerMessageId: data.messageId ?? data.zaapId ?? `zapi-${Date.now()}` };
  }

  async createGroup({ name, participantPhones }: { name: string; participantPhones: string[] }) {
    const res = await fetch(`${this.baseUrl}/create-group`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ groupName: name, phones: participantPhones }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`[ZApiWhatsappAdapter] create-group failed (${res.status}): ${body}`);
    }

    const data = (await res.json().catch(() => ({}))) as { phone?: string };
    return { groupJid: data.phone ?? "" };
  }
}

class StubWhatsappAdapter implements WhatsappAdapter {
  async sendMessage(params: { to: string; text: string }) {
    console.warn("[StubWhatsappAdapter] sendMessage — ZAPI_INSTANCE_ID/ZAPI_TOKEN não configurados", params);
    return { providerMessageId: `stub-message-${Date.now()}` };
  }

  async createGroup(params: { name: string; participantPhones: string[] }) {
    console.warn("[StubWhatsappAdapter] createGroup — ZAPI_INSTANCE_ID/ZAPI_TOKEN não configurados", params);
    return { groupJid: `stub-group-${Date.now()}` };
  }
}

let cached: WhatsappAdapter | null = null;

export function getWhatsappAdapter(): WhatsappAdapter {
  if (cached) return cached;

  const { ZAPI_INSTANCE_ID, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN } = process.env;
  cached =
    ZAPI_INSTANCE_ID && ZAPI_TOKEN
      ? new ZApiWhatsappAdapter(ZAPI_INSTANCE_ID, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN)
      : new StubWhatsappAdapter();

  return cached;
}
