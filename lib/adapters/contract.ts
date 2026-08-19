// Typed seam for the future ZapSign integration (Phase 1, week 5 per the
// roadmap). See lib/adapters/whatsapp.ts for the pattern this follows.
export interface ESignatureAdapter {
  createContract(params: {
    dealId: string;
    templateId: string;
    dados: Record<string, unknown>;
  }): Promise<{ docUrl: string; providerContractId: string }>;
}

class StubESignatureAdapter implements ESignatureAdapter {
  async createContract(params: { dealId: string; templateId: string; dados: Record<string, unknown> }) {
    console.warn("[StubESignatureAdapter] createContract — no ZapSign integration wired yet", params);
    return { docUrl: `stub://contract/${params.dealId}`, providerContractId: `stub-${Date.now()}` };
  }
}

let cached: ESignatureAdapter | null = null;

export function getESignatureAdapter(): ESignatureAdapter {
  if (!cached) cached = new StubESignatureAdapter();
  return cached;
}
