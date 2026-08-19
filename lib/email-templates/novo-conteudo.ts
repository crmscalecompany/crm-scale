// "Avisar inscritos" — manual broadcast triggered from the CRM's
// Automações section (lib/actions/subscribers.ts) when a new case or blog
// article goes live. Same visual language as
// lib/email-templates/primeiro-contato.ts (dark Scale theme), but this one
// is marketing mail, not transactional, so it always carries the
// unsubscribe footer that template doesn't need.
export interface NovoConteudoParams {
  tipo: "Cases" | "Newsletter";
  titulo: string;
  resumo: string;
  url: string;
  unsubscribeUrl: string;
}

export function renderNovoConteudoEmail({ tipo, titulo, resumo, url, unsubscribeUrl }: NovoConteudoParams): { subject: string; html: string } {
  const kicker = tipo === "Cases" ? "NOVO CASE" : "NOVO ARTIGO";
  const subject = tipo === "Cases" ? `Novo case: ${titulo}` : `Novo artigo: ${titulo}`;
  const audienceLabel = tipo === "Cases" ? "novos cases" : "novos artigos";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scale Company</title>
</head>

<body style="margin:0; padding:0; background:#070A12; font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" border="0" cellspacing="0" cellpadding="0"
    style="background:#070A12; margin:0; padding:0;">

    <tr>
      <td align="center" style="padding:40px 16px;">

        <table width="100%" border="0" cellspacing="0" cellpadding="0"
          style="
            max-width:620px;
            background:#0B1020;
            border:1px solid #17213E;
            border-radius:20px;
            overflow:hidden;
          ">

          <tr>
            <td style="
              padding:32px 40px;
              background:
                radial-gradient(circle at 90% 0%, #114DDB 0%, #0B1020 35%, #0B1020 100%);
            ">
              <div style="color:#ffffff; font-size:22px; font-weight:700;">Scale</div>
            </td>
          </tr>

          <tr>
            <td style="padding:10px 40px 42px 40px;">

              <div style="
                display:inline-block;
                margin-top:24px;
                margin-bottom:18px;
                color:#4574E3;
                font-size:12px;
                font-weight:700;
                letter-spacing:1.4px;
                text-transform:uppercase;
              ">
                ${kicker}
              </div>

              <h1 style="
                margin:0 0 22px 0;
                color:#ffffff;
                font-size:28px;
                line-height:1.2;
                font-weight:600;
                letter-spacing:-0.5px;
              ">
                ${titulo}
              </h1>

              <p style="
                margin:0 0 28px 0;
                color:#B5BDD1;
                font-size:16px;
                line-height:1.7;
              ">
                ${resumo}
              </p>

              <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom:8px;">
                <tr>
                  <td
                    align="center"
                    bgcolor="#114DDB"
                    style="
                      border-radius:10px;
                      background:#114DDB;
                      background-image:linear-gradient(90deg, #114DDB 0%, #4574E3 100%);
                    ">
                    <a
                      href="${url}"
                      target="_blank"
                      style="
                        display:inline-block;
                        padding:16px 26px;
                        color:#ffffff;
                        font-size:15px;
                        font-weight:700;
                        text-decoration:none;
                      ">
                      Ler agora →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>

        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:620px;">
          <tr>
            <td align="center" style="
              padding:22px 20px;
              color:#4C566F;
              font-size:11px;
              line-height:1.6;
            ">
              Você está recebendo este e-mail porque se inscreveu para saber sobre ${audienceLabel} da Scale Company.
              <br>
              <a href="${unsubscribeUrl}" style="color:#4C566F; text-decoration:underline;">Cancelar inscrição</a>
            </td>
          </tr>
        </table>

      </td>
    </tr>

  </table>

</body>
</html>`;

  return { subject, html };
}
