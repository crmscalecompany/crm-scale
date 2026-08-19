// "Avisar inscritos" — manual broadcast triggered from the CRM's
// Automações section (lib/actions/subscribers.ts) when a new case or blog
// article goes live. Mirrors lib/email-templates/primeiro-contato.ts's
// visual language (logo header, kicker, highlighted box, gradient CTA,
// signature block) so the two feel like the same product, not two
// different templates bolted together. Marketing mail, not transactional,
// so it always carries the unsubscribe footer that one doesn't need.
export interface NovoConteudoParams {
  tipo: "Cases" | "Newsletter";
  titulo: string;
  resumo: string;
  url: string;
  unsubscribeUrl: string;
  logoUrl: string;
}

export function renderNovoConteudoEmail({ tipo, titulo, resumo, url, unsubscribeUrl, logoUrl }: NovoConteudoParams): { subject: string; html: string } {
  const kicker = tipo === "Cases" ? "NOVO CASE" : "NOVO ARTIGO";
  const subject = tipo === "Cases" ? `Novo case: ${titulo}` : `Novo artigo: ${titulo}`;
  const audienceLabel = tipo === "Cases" ? "novos cases" : "novos artigos";
  const boxLabel = tipo === "Cases" ? "RESULTADO" : "NO ARTIGO DE HOJE";
  const ctaLabel = tipo === "Cases" ? "Ver o case completo →" : "Ler o artigo →";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scale Company</title>
</head>

<body style="margin:0; padding:0; background:#070A12; font-family:Arial, Helvetica, sans-serif;">

  <!-- PREHEADER -->
  <div style="
    display:none;
    max-height:0;
    overflow:hidden;
    opacity:0;
    color:transparent;
  ">
    ${titulo}
  </div>

  <table width="100%" border="0" cellspacing="0" cellpadding="0"
    style="background:#070A12; margin:0; padding:0;">

    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- CONTAINER -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0"
          style="
            max-width:620px;
            background:#0B1020;
            border:1px solid #17213E;
            border-radius:20px;
            overflow:hidden;
          ">

          <!-- HEADER -->
          <tr>
            <td style="
              padding:32px 40px;
              background:
                radial-gradient(circle at 90% 0%, #114DDB 0%, #0B1020 35%, #0B1020 100%);
            ">
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width:42px; height:42px; vertical-align:middle;">
                    <img src="${logoUrl}" width="42" height="42" alt="Scale" style="display:block; border-radius:10px;">
                  </td>
                  <td style="padding-left:12px; vertical-align:middle;">
                    <div style="color:#ffffff; font-size:22px; font-weight:700; line-height:1;">Scale</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CONTEÚDO -->
          <tr>
            <td style="padding:10px 40px 42px 40px;">

              <!-- TAG -->
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

              <!-- HEADLINE -->
              <h1 style="
                margin:0 0 22px 0;
                color:#ffffff;
                font-size:30px;
                line-height:1.2;
                font-weight:600;
                letter-spacing:-0.6px;
              ">
                ${titulo}
              </h1>

              <!-- BOX -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0"
                style="
                  background:rgba(17,77,219,0.10);
                  border:1px solid rgba(17,77,219,0.35);
                  border-radius:14px;
                  margin-bottom:30px;
                ">
                <tr>
                  <td style="padding:22px 24px;">
                    <div style="
                      color:#4574E3;
                      font-size:11px;
                      font-weight:700;
                      letter-spacing:1.2px;
                      margin-bottom:8px;
                    ">
                      ${boxLabel}
                    </div>
                    <div style="
                      color:#ffffff;
                      font-size:17px;
                      line-height:1.55;
                      font-weight:500;
                    ">
                      ${resumo}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
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
                      ${ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- ASSINATURA -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0"
                style="
                  border-top:1px solid #1B2440;
                  padding-top:25px;
                ">
                <tr>
                  <td style="padding-top:24px;">
                    <div style="color:#ffffff; font-size:15px; font-weight:700;">Equipe Scale Company</div>
                    <div style="color:#77829E; font-size:13px; margin-top:5px;">
                      Sempre que sai ${tipo === "Cases" ? "um case novo" : "um artigo novo"}, avisamos por aqui.
                    </div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>

        <!-- RODAPÉ -->
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
