import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/automation/unsubscribe-token";
import { optOutEmail } from "@/lib/data/subscribers";

interface UnsubscribePageProps {
  searchParams: Promise<{ tipo?: string; email?: string; token?: string }>;
}

const AUDIENCE_LABEL: Record<string, string> = {
  Cases: "novos cases",
  Newsletter: "novos artigos",
};

// Public landing page for the unsubscribe link embedded in every "Avisar
// inscritos" email (lib/actions/subscribers.ts) — must stay out of the
// login redirect (see PUBLIC_PATHS in lib/supabase/proxy.ts), since
// whoever clicks it has no CRM session. Uses the admin client for the same
// reason: there's no session to run an RLS-scoped query against.
export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { tipo, email, token } = await searchParams;
  const valid = !!tipo && !!email && !!token && verifyUnsubscribeToken(tipo, email, token);

  if (valid) {
    const db = createAdminClient();
    await optOutEmail(db, email);
  }

  return (
    <main
      style={{
        maxWidth: 480,
        margin: "96px auto",
        padding: "0 20px",
        fontFamily: "Arial, Helvetica, sans-serif",
        textAlign: "center",
        color: "#0B1020",
      }}
    >
      {valid ? (
        <>
          <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Inscrição cancelada</h1>
          <p style={{ color: "#555", fontSize: 14, lineHeight: 1.6 }}>
            Você não vai mais receber e-mails sobre {AUDIENCE_LABEL[tipo] ?? "novidades"} da Scale Company.
          </p>
        </>
      ) : (
        <>
          <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Link inválido</h1>
          <p style={{ color: "#555", fontSize: 14, lineHeight: 1.6 }}>Esse link de descadastro não é válido.</p>
        </>
      )}
    </main>
  );
}
