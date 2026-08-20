import { FileInput, MessageCircle, Send, MailCheck } from "lucide-react";

interface AutomationCard {
  icon: typeof FileInput;
  title: string;
  trigger: string;
  whatItDoes: string;
  mode: "Automático" | "Manual";
}

// Plain-language summary of every automation actually wired up today —
// "ativa" per the user's ask, not the automation_rules/automation_logs
// schema (Week 1's "log and defer" stub, nothing consumes those rows yet,
// so it isn't listed as a real automation here). Kept as static content,
// not derived from a table, since there's no registry of these in the
// database — each one lives in its own route/action and this page exists
// specifically so a non-technical teammate doesn't have to go find them.
const AUTOMATIONS: AutomationCard[] = [
  {
    icon: FileInput,
    title: "Novo lead do site cai direto no CRM",
    trigger: 'Alguém preenche um formulário no site institucional — contato, "quero receber cases" ou "quero receber artigos".',
    whatItDoes:
      "O lead aparece aqui no CRM na hora, já separado por tipo (Formulário, Cases ou Newsletter). Ninguém precisa cadastrar nada na mão.",
    mode: "Automático",
  },
  {
    icon: MessageCircle,
    title: "Aviso no grupo do WhatsApp",
    trigger: "Qualquer um dos 3 formulários do site gera um lead novo.",
    whatItDoes:
      'Uma mensagem cai na hora no grupo "[SC] Marketing" do WhatsApp, com o nome e o contato do lead — pra ninguém perder um lead novo.',
    mode: "Automático",
  },
  {
    icon: MailCheck,
    title: "Avisar inscritos sobre novo conteúdo",
    trigger: 'Um admin preenche o formulário "Avisar inscritos" (logo abaixo) sempre que sai um case ou artigo novo, e clica em Enviar.',
    whatItDoes:
      'Todo mundo que se inscreveu pra saber de novos cases ou artigos recebe um e-mail com o link do conteúdo. Quem clicar em "Cancelar inscrição" no e-mail para de receber automaticamente, sem precisar pedir pra ninguém tirar da lista.',
    mode: "Manual",
  },
  {
    icon: Send,
    title: "E-mail de primeiro contato",
    trigger: 'O SDR clica em "Enviar e-mail" no card de um lead, no Kanban.',
    whatItDoes: 'Sai um e-mail padrão de boas-vindas, já assinado como José Matheus, sem precisar escrever do zero toda vez.',
    mode: "Manual",
  },
];

export function AutomationsOverview() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-primary">Automações ativas</h1>
        <p className="mt-1 text-sm text-muted">O que já roda sozinho no CRM hoje, e o que precisa de um clique pra disparar.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {AUTOMATIONS.map((automation) => {
          const Icon = automation.icon;
          return (
            <div key={automation.title} className="flex flex-col gap-3 rounded-lg border border-hairline bg-bg-secondary/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-primary/15 text-accent-light">
                    <Icon size={16} />
                  </div>
                  <h2 className="text-sm font-semibold text-primary">{automation.title}</h2>
                </div>
                <span
                  className={
                    automation.mode === "Automático"
                      ? "shrink-0 rounded-full bg-status-good/15 px-2 py-0.5 text-[11px] font-semibold text-status-good"
                      : "shrink-0 rounded-full bg-status-warning/15 px-2 py-0.5 text-[11px] font-semibold text-status-warning"
                  }
                >
                  {automation.mode}
                </span>
              </div>

              <div className="flex flex-col gap-1.5 text-sm">
                <p className="text-secondary">
                  <span className="font-semibold text-muted">Quando: </span>
                  {automation.trigger}
                </p>
                <p className="text-secondary">
                  <span className="font-semibold text-muted">O que acontece: </span>
                  {automation.whatItDoes}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
