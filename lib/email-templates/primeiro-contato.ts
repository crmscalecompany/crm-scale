// "Primeiro contato" — sent by an SDR from the lead card, always signed and
// sent as José Matheus (this is that specific outreach persona/template,
// not a per-SDR dynamic one — see lib/actions/leads.ts::sendFirstContactEmailAction).
export interface PrimeiroContatoParams {
  primeiroNome: string;
  nomeEscritorio: string;
  whatsappNumber: string; // "55DDDNUMERO", digits only
}

function whatsappLink(whatsappNumber: string): string {
  const text = encodeURIComponent("Olá José Matheus, preenchi o formulário da Scale e recebi seu e-mail.");
  return `https://wa.me/${whatsappNumber}?text=${text}`;
}

export function renderPrimeiroContatoEmail({ primeiroNome, nomeEscritorio, whatsappNumber }: PrimeiroContatoParams): { subject: string; html: string } {
  const subject = `${primeiroNome}, antes de te enviar uma proposta, preciso te perguntar uma coisa`;
  const href = whatsappLink(whatsappNumber);

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
    Recebemos suas informações e quero conversar com você sobre os próximos passos.
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

              <!-- LOGO -->
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width:42px; height:42px; vertical-align:middle;">
                    <img src="cid:scale-logo" width="42" height="42" alt="Scale" style="display:block; border-radius:10px;">
                  </td>

                  <td style="padding-left:12px; vertical-align:middle;">
                    <div style="
                      color:#ffffff;
                      font-size:22px;
                      font-weight:700;
                      line-height:1;
                    ">
                      Scale
                    </div>
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
                SEU CONTATO CHEGOU ATÉ NÓS
              </div>

              <!-- HEADLINE -->
              <h1 style="
                margin:0 0 22px 0;
                color:#ffffff;
                font-size:32px;
                line-height:1.15;
                font-weight:600;
                letter-spacing:-0.7px;
              ">
                ${primeiroNome}, recebemos suas informações.
              </h1>

              <!-- TEXTO -->
              <p style="
                margin:0 0 18px 0;
                color:#B5BDD1;
                font-size:16px;
                line-height:1.7;
              ">
                Meu nome é <strong style="color:#ffffff;">José Matheus</strong>,
                faço parte da Scale Company.
              </p>

              <p style="
                margin:0 0 18px 0;
                color:#B5BDD1;
                font-size:16px;
                line-height:1.7;
              ">
                Vi que você demonstrou interesse em entender como podemos ajudar
                <strong style="color:#ffffff;">
                  ${nomeEscritorio}
                </strong>
                a estruturar uma operação mais previsível de aquisição de clientes.
              </p>

              <p style="
                margin:0 0 28px 0;
                color:#B5BDD1;
                font-size:16px;
                line-height:1.7;
              ">
                Antes de simplesmente te enviar uma proposta pronta, quero entender
                um pouco melhor o seu cenário. Existem alguns pontos que podem mudar
                bastante a estratégia ideal para o seu escritório.
              </p>

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
                      PRÓXIMO PASSO
                    </div>

                    <div style="
                      color:#ffffff;
                      font-size:18px;
                      line-height:1.45;
                      font-weight:600;
                    ">
                      Quero te fazer algumas perguntas rápidas e entender o que
                      faria mais sentido para sua operação.
                    </div>

                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table border="0" cellspacing="0" cellpadding="0"
                style="margin-bottom:28px;">

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
                      href="${href}"
                      target="_blank"
                      style="
                        display:inline-block;
                        padding:16px 26px;
                        color:#ffffff;
                        font-size:15px;
                        font-weight:700;
                        text-decoration:none;
                      ">
                      Falar com José Matheus →
                    </a>

                  </td>
                </tr>
              </table>

              <!-- MICROCOPY -->
              <p style="
                margin:0 0 32px 0;
                color:#737E99;
                font-size:13px;
                line-height:1.6;
              ">
                Você será direcionado diretamente para o meu WhatsApp.
              </p>

              <!-- ASSINATURA -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0"
                style="
                  border-top:1px solid #1B2440;
                  padding-top:25px;
                ">

                <tr>
                  <td style="padding-top:24px;">

                    <div style="
                      color:#ffffff;
                      font-size:15px;
                      font-weight:700;
                    ">
                      José Matheus
                    </div>

                    <div style="
                      color:#77829E;
                      font-size:13px;
                      margin-top:5px;
                    ">
                      Scale Company
                    </div>

                  </td>
                </tr>

              </table>

            </td>
          </tr>

        </table>

        <!-- RODAPÉ -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0"
          style="max-width:620px;">

          <tr>
            <td align="center" style="
              padding:22px 20px;
              color:#4C566F;
              font-size:11px;
              line-height:1.5;
            ">
              Você está recebendo este e-mail porque solicitou contato
              através de um formulário da Scale Company.
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
