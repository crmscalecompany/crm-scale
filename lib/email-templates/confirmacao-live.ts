// Confirmação de inscrição na live ("Scale Class — Treinamento de Alta
// Conversão") — HTML baseado no design em
// public/modelo-email-confirmacao-cadastro.html (mantido no repo como
// referência visual, não usado em runtime). Duas adições sobre o design
// original: saudação personalizada com o primeiro nome, e um bloco de
// data/horário (o design original não mencionava quando é o evento).
export interface ConfirmacaoLiveEmailParams {
  primeiroNome: string;
  whatsappGroupUrl: string;
  eventDateLabel: string; // ex: "31 de agosto"
  eventTimeLabel: string; // ex: "12h"
}

export function renderConfirmacaoLiveEmail({
  primeiroNome,
  whatsappGroupUrl,
  eventDateLabel,
  eventTimeLabel,
}: ConfirmacaoLiveEmailParams): { subject: string; html: string } {
  const subject = "Sua inscrição na Scale Class está confirmada";

  const html = `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">

  <title>Scale Class — Treinamento de Alta Conversão</title>

  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <!--<![endif]-->

  <style>
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: 100% !important;
    }

    body {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      background-color: #EEF0F4;
      font-family: 'Manrope', Arial, Helvetica, sans-serif;
      color: #111111;
    }

    table {
      border-spacing: 0;
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }

    img {
      border: 0;
      display: block;
      max-width: 100%;
      height: auto;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }

    a {
      text-decoration: none;
    }

    .wrapper {
      width: 100%;
      background-color: #EEF0F4;
    }

    .container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #FFFFFF;
    }

    .content {
      padding-left: 32px;
      padding-right: 32px;
    }

    .fluid {
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
    }

    /* Mobile */
    @media only screen and (max-width: 620px) {
      .outer-pad {
        padding: 12px 0 !important;
      }

      .container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 0 !important;
      }

      .content,
      td.content {
        padding-left: 18px !important;
        padding-right: 18px !important;
      }

      .header-pad {
        padding: 18px 18px !important;
      }

      .logo-header {
        width: 118px !important;
        max-width: 118px !important;
      }

      .hero-wrap {
        padding-top: 20px !important;
        padding-bottom: 4px !important;
      }

      .hero-cell {
        height: auto !important;
        min-height: 220px !important;
        border-radius: 16px !important;
      }

      .hero-inner {
        height: auto !important;
        min-height: 220px !important;
      }

      .hero-inner-td {
        padding: 24px 16px !important;
      }

      .hero-spacer {
        height: 16px !important;
        line-height: 16px !important;
        font-size: 16px !important;
      }

      .hero-overlay-title {
        font-size: 24px !important;
        line-height: 32px !important;
        max-width: 100% !important;
      }

      .welcome-title {
        font-size: 21px !important;
        line-height: 28px !important;
      }

      .body-text {
        font-size: 14px !important;
        line-height: 24px !important;
      }

      .section-title {
        font-size: 16px !important;
        line-height: 22px !important;
      }

      .step-label {
        font-size: 14px !important;
        line-height: 19px !important;
      }

      .step-num-pad {
        padding-left: 12px !important;
        padding-right: 0 !important;
      }

      .step-arrow-pad {
        padding-right: 12px !important;
      }

      .step-text-pad {
        padding-left: 10px !important;
        padding-right: 6px !important;
      }

      .cta-inner {
        padding: 28px 20px 30px 20px !important;
      }

      .cta-title {
        font-size: 20px !important;
        line-height: 28px !important;
        max-width: 100% !important;
      }

      .cta-btn {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        text-align: center !important;
        padding: 16px 20px !important;
      }

      .tags-table,
      .tags-table tbody,
      .tags-table tr {
        display: block !important;
        width: 100% !important;
      }

      .tag-cell {
        display: inline-block !important;
        padding: 0 6px 8px 0 !important;
      }

      .footer-pad {
        padding: 32px 18px 28px 18px !important;
      }

      .footer-contact,
      .footer-contact tbody,
      .footer-contact tr {
        display: block !important;
        width: 100% !important;
      }

      .footer-contact td {
        display: block !important;
        width: 100% !important;
        padding: 6px 0 !important;
        border-right: 0 !important;
        text-align: center !important;
      }

      .footer-links a {
        display: inline-block !important;
        padding: 4px 6px !important;
      }

      .mobile-center {
        text-align: center !important;
      }
    }
  </style>
</head>

<body style="margin:0;padding:0;background-color:#EEF0F4;font-family:'Manrope',Arial,Helvetica,sans-serif;">

  <!-- PREHEADER -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">
    Sua inscrição na Scale Class está confirmada. Prepare-se para o Treinamento de Alta Conversão.
  </div>

  <table role="presentation" width="100%" class="wrapper" style="width:100%;background-color:#EEF0F4;">
    <tr>
      <td class="outer-pad" align="center" style="padding:24px 12px;">

        <table role="presentation" width="100%" class="container" style="width:100%;max-width:600px;background-color:#FFFFFF;border-radius:20px;overflow:hidden;">


          <!-- ========== HEADER ========== -->
          <tr>
            <td class="header-pad" style="background-color:#3B66F5;padding:22px 32px;">
              <table role="presentation" width="100%" style="width:100%;">
                <tr>
                  <td valign="middle">
                    <img
                      class="logo-header"
                      src="https://www.scalecompany.com.br/images/scale-logo.svg"
                      width="132"
                      alt="Scale Company"
                      style="width:132px;max-width:132px;height:auto;display:block;"
                    >
                  </td>
                </tr>
              </table>
            </td>
          </tr>


          <!-- ========== HERO ========== -->
          <tr>
            <td class="content hero-wrap" style="padding:28px 32px 8px 32px;">

              <table role="presentation" width="100%" style="width:100%;border-radius:20px;overflow:hidden;">
                <tr>
                  <td
                    class="hero-cell"
                    background="https://placehold.co/1072x640/1a1a2e/3B66F5?text=Scale+Class"
                    bgcolor="#1A1A2E"
                    width="100%"
                    height="320"
                    valign="middle"
                    style="
                      background-image:url('https://dev.scalecompany.com.br/wp-content/uploads/2026/08/Captura-de-tela-2026-08-12-022610.png');
                      background-size:cover;
                      background-position:center;
                      background-color:#1A1A2E;
                      border-radius:20px;
                      height:320px;
                      text-align:center;
                      padding:0;
                    "
                  >
                    <!--[if gte mso 9]>
                    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:536px;height:320px;">
                      <v:fill type="frame" src="https://placehold.co/1072x640/1a1a2e/3B66F5?text=Scale+Class" color="#1A1A2E" />
                      <v:textbox inset="0,0,0,0">
                    <![endif]-->
                    <div>
                      <table role="presentation" class="hero-inner" width="100%" height="320" style="width:100%;height:320px;">
                        <tr>
                          <td class="hero-inner-td" align="center" valign="middle" style="padding:28px 24px;">

                            <!-- Badge -->
                            <div style="
                              display:inline-block;
                              background-color:rgba(0,0,0,0.55);
                              border-radius:100px;
                              padding:8px 14px;
                              color:#FFFFFF;
                              font-family:'Manrope',Arial,Helvetica,sans-serif;
                              font-size:12px;
                              line-height:16px;
                              font-weight:500;
                            ">
                              <span style="color:#22C55E;">●</span>&nbsp; Inscrição confirmada
                            </div>

                            <div class="hero-spacer" style="height:28px;line-height:28px;font-size:28px;">&nbsp;</div>

                            <!-- Overlay title -->
                            <div class="hero-overlay-title" style="
                              font-family:'Manrope',Arial,Helvetica,sans-serif;
                              font-size:34px;
                              line-height:42px;
                              font-weight:700;
                              color:#FFFFFF;
                              letter-spacing:-0.5px;
                              max-width:420px;
                              margin:0 auto;
                            ">
                              Treinamento de<br>Alta Conversão
                            </div>

                          </td>
                        </tr>
                      </table>
                    </div>
                    <!--[if gte mso 9]>
                      </v:textbox>
                    </v:rect>
                    <![endif]-->
                  </td>
                </tr>
              </table>

            </td>
          </tr>


          <!-- ========== WELCOME ========== -->
          <tr>
            <td class="content" style="padding:36px 32px 8px 32px;">

              <div class="welcome-title" style="
                font-family:'Manrope',Arial,Helvetica,sans-serif;
                font-size:26px;
                line-height:34px;
                font-weight:700;
                color:#111111;
                letter-spacing:-0.4px;
              ">
                Bem-vindo à Scale Class — Onde atendimento vira contrato!
              </div>

              <div style="height:20px;line-height:20px;">&nbsp;</div>

              <div class="body-text" style="
                font-family:'Manrope',Arial,Helvetica,sans-serif;
                font-size:15px;
                line-height:26px;
                color:#5A5A5A;
                font-weight:400;
              ">
                Olá, ${primeiroNome},
                <br><br>
                Sua inscrição está confirmada. Nesta Scale Class, o
                <strong style="color:#111111;font-weight:600;">Gabriel Dias</strong>
                vai mostrar como estruturar um atendimento jurídico preparado para
                <strong style="color:#111111;font-weight:600;">transformar oportunidades em contratos</strong>
                — do primeiro contato ao fechamento.
              </div>

            </td>
          </tr>


          <!-- ========== EVENT DETAILS ========== -->
          <tr>
            <td class="content" style="padding:20px 32px 8px 32px;">
              <table role="presentation" width="100%" style="width:100%;border:1px solid #E8EAEF;border-radius:16px;">
                <tr>
                  <td width="50%" valign="middle" style="padding:18px 16px;border-right:1px solid #E8EAEF;">
                    <div style="font-family:'Manrope',Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#3B66F5;margin-bottom:4px;">Data</div>
                    <div style="font-family:'Manrope',Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;color:#111111;">${eventDateLabel}</div>
                  </td>
                  <td width="50%" valign="middle" style="padding:18px 16px;">
                    <div style="font-family:'Manrope',Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#3B66F5;margin-bottom:4px;">Horário</div>
                    <div style="font-family:'Manrope',Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;color:#111111;">${eventTimeLabel}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>


          <!-- ========== SPEAKER ========== -->
          <tr>
            <td class="content" style="padding:28px 32px 8px 32px;">

              <table role="presentation" width="100%" style="
                border:1px solid #E8EAEF;
                border-radius:16px;
                overflow:hidden;
              ">
                <tr>
                  <td width="88" valign="middle" style="padding:16px 0 16px 16px;">
                    <!-- Placeholder foto -->
                    <img
                      src="https://dev.scalecompany.com.br/wp-content/uploads/2026/08/656005429_18112975135684428_1351260058302722449_n.jpg"
                      width="64"
                      height="64"
                      alt="Gabriel Dias"
                      style="
                        width:64px;
                        height:64px;
                        border-radius:50%;
                        display:block;
                        object-fit:cover;
                      "
                    >
                  </td>
                  <td valign="middle" style="padding:16px 16px 16px 14px;">
                    <div style="
                      font-family:'Manrope',Arial,Helvetica,sans-serif;
                      font-size:15px;
                      line-height:20px;
                      font-weight:600;
                      color:#111111;
                    ">
                      Gabriel Dias
                    </div>
                    <div style="
                      font-family:'Manrope',Arial,Helvetica,sans-serif;
                      font-size:13px;
                      line-height:18px;
                      color:#6B6B6B;
                      margin-top:3px;
                    ">
                      COO da Scale Company
                    </div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>


          <!-- ========== WHAT WE OFFER / STEPS ========== -->
          <tr>
            <td class="content" style="padding:36px 32px 8px 32px;">

              <div class="section-title" style="
                font-family:'Manrope',Arial,Helvetica,sans-serif;
                font-size:18px;
                line-height:24px;
                font-weight:700;
                color:#111111;
              ">
                O que você vai aprender:
              </div>

              <div style="height:18px;line-height:18px;">&nbsp;</div>

              <!-- Step 01 -->
              <table role="presentation" width="100%" class="step-card" style="
                width:100%;
                border:1px solid #E8EAEF;
                border-radius:14px;
                margin-bottom:10px;
              ">
                <tr>
                  <td class="step-num-pad" width="48" valign="middle" style="padding:16px 0 16px 16px;">
                    <div style="
                      width:36px;
                      height:36px;
                      background-color:#EEF2FF;
                      border-radius:10px;
                      text-align:center;
                      line-height:36px;
                      font-family:'Manrope',Arial,Helvetica,sans-serif;
                      font-size:12px;
                      font-weight:700;
                      color:#3B66F5;
                    ">01</div>
                  </td>
                  <td class="step-text-pad" valign="middle" style="padding:16px 8px;">
                    <div class="step-label" style="
                      font-family:'Manrope',Arial,Helvetica,sans-serif;
                      font-size:15px;
                      line-height:20px;
                      font-weight:600;
                      color:#111111;
                    ">Atendimento Rápido</div>
                  </td>
                  <td class="step-arrow-pad" width="44" align="right" valign="middle" style="padding:16px 16px 16px 0;">
                    <div style="
                      width:28px;
                      height:28px;
                      border:1px solid #E0E3EA;
                      border-radius:50%;
                      text-align:center;
                      line-height:28px;
                      color:#3B66F5;
                      font-size:14px;
                    ">→</div>
                  </td>
                </tr>
              </table>

              <!-- Step 02 -->
              <table role="presentation" width="100%" style="width:100%;border:1px solid #E8EAEF;border-radius:14px;margin-bottom:10px;">
                <tr>
                  <td class="step-num-pad" width="48" valign="middle" style="padding:16px 0 16px 16px;">
                    <div style="width:36px;height:36px;background-color:#EEF2FF;border-radius:10px;text-align:center;line-height:36px;font-family:'Manrope',Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#3B66F5;">02</div>
                  </td>
                  <td class="step-text-pad" valign="middle" style="padding:16px 8px;">
                    <div class="step-label" style="font-family:'Manrope',Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:600;color:#111111;">Conexão</div>
                  </td>
                  <td class="step-arrow-pad" width="44" align="right" valign="middle" style="padding:16px 16px 16px 0;">
                    <div style="width:28px;height:28px;border:1px solid #E0E3EA;border-radius:50%;text-align:center;line-height:28px;color:#3B66F5;font-size:14px;">→</div>
                  </td>
                </tr>
              </table>

              <!-- Step 03 -->
              <table role="presentation" width="100%" style="width:100%;border:1px solid #E8EAEF;border-radius:14px;margin-bottom:10px;">
                <tr>
                  <td class="step-num-pad" width="48" valign="middle" style="padding:16px 0 16px 16px;">
                    <div style="width:36px;height:36px;background-color:#EEF2FF;border-radius:10px;text-align:center;line-height:36px;font-family:'Manrope',Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#3B66F5;">03</div>
                  </td>
                  <td class="step-text-pad" valign="middle" style="padding:16px 8px;">
                    <div class="step-label" style="font-family:'Manrope',Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:600;color:#111111;">Entendimento da Dor</div>
                  </td>
                  <td class="step-arrow-pad" width="44" align="right" valign="middle" style="padding:16px 16px 16px 0;">
                    <div style="width:28px;height:28px;border:1px solid #E0E3EA;border-radius:50%;text-align:center;line-height:28px;color:#3B66F5;font-size:14px;">→</div>
                  </td>
                </tr>
              </table>

              <!-- Step 04 -->
              <table role="presentation" width="100%" style="width:100%;border:1px solid #E8EAEF;border-radius:14px;margin-bottom:10px;">
                <tr>
                  <td class="step-num-pad" width="48" valign="middle" style="padding:16px 0 16px 16px;">
                    <div style="width:36px;height:36px;background-color:#EEF2FF;border-radius:10px;text-align:center;line-height:36px;font-family:'Manrope',Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#3B66F5;">04</div>
                  </td>
                  <td class="step-text-pad" valign="middle" style="padding:16px 8px;">
                    <div class="step-label" style="font-family:'Manrope',Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:600;color:#111111;">Mostrar Como Pode Resolver</div>
                  </td>
                  <td class="step-arrow-pad" width="44" align="right" valign="middle" style="padding:16px 16px 16px 0;">
                    <div style="width:28px;height:28px;border:1px solid #E0E3EA;border-radius:50%;text-align:center;line-height:28px;color:#3B66F5;font-size:14px;">→</div>
                  </td>
                </tr>
              </table>

              <!-- Step 05 -->
              <table role="presentation" width="100%" style="width:100%;border:1px solid #E8EAEF;border-radius:14px;margin-bottom:10px;">
                <tr>
                  <td class="step-num-pad" width="48" valign="middle" style="padding:16px 0 16px 16px;">
                    <div style="width:36px;height:36px;background-color:#EEF2FF;border-radius:10px;text-align:center;line-height:36px;font-family:'Manrope',Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#3B66F5;">05</div>
                  </td>
                  <td class="step-text-pad" valign="middle" style="padding:16px 8px;">
                    <div class="step-label" style="font-family:'Manrope',Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:600;color:#111111;">Apresentar a Proposta</div>
                  </td>
                  <td class="step-arrow-pad" width="44" align="right" valign="middle" style="padding:16px 16px 16px 0;">
                    <div style="width:28px;height:28px;border:1px solid #E0E3EA;border-radius:50%;text-align:center;line-height:28px;color:#3B66F5;font-size:14px;">→</div>
                  </td>
                </tr>
              </table>

              <!-- Step 06 -->
              <table role="presentation" width="100%" style="width:100%;border:1px solid #E8EAEF;border-radius:14px;margin-bottom:10px;">
                <tr>
                  <td class="step-num-pad" width="48" valign="middle" style="padding:16px 0 16px 16px;">
                    <div style="width:36px;height:36px;background-color:#EEF2FF;border-radius:10px;text-align:center;line-height:36px;font-family:'Manrope',Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#3B66F5;">06</div>
                  </td>
                  <td class="step-text-pad" valign="middle" style="padding:16px 8px;">
                    <div class="step-label" style="font-family:'Manrope',Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:600;color:#111111;">Trabalhar Objeções</div>
                  </td>
                  <td class="step-arrow-pad" width="44" align="right" valign="middle" style="padding:16px 16px 16px 0;">
                    <div style="width:28px;height:28px;border:1px solid #E0E3EA;border-radius:50%;text-align:center;line-height:28px;color:#3B66F5;font-size:14px;">→</div>
                  </td>
                </tr>
              </table>

              <!-- Step 07 -->
              <table role="presentation" width="100%" style="width:100%;border:1px solid #E8EAEF;border-radius:14px;">
                <tr>
                  <td class="step-num-pad" width="48" valign="middle" style="padding:16px 0 16px 16px;">
                    <div style="width:36px;height:36px;background-color:#3B66F5;border-radius:10px;text-align:center;line-height:36px;font-family:'Manrope',Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#FFFFFF;">07</div>
                  </td>
                  <td class="step-text-pad" valign="middle" style="padding:16px 8px;">
                    <div class="step-label" style="font-family:'Manrope',Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:600;color:#111111;">Fechamento</div>
                  </td>
                  <td class="step-arrow-pad" width="44" align="right" valign="middle" style="padding:16px 16px 16px 0;">
                    <div style="width:28px;height:28px;border:1px solid #E0E3EA;border-radius:50%;text-align:center;line-height:28px;color:#3B66F5;font-size:14px;">→</div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>


          <!-- ========== DARK CTA ========== -->
          <tr>
            <td class="content" style="padding:36px 32px 8px 32px;">

              <table role="presentation" width="100%" style="
                width:100%;
                background-color:#0B0B0F;
                background-image:radial-gradient(ellipse at 85% 100%, rgba(59,102,245,0.55) 0%, rgba(11,11,15,0) 55%);
                border-radius:20px;
              ">
                <tr>
                  <td class="cta-inner" align="left" style="padding:36px 28px 38px 28px;">

                    <!-- Tags -->
                    <table role="presentation" class="tags-table" cellpadding="0" cellspacing="0" style="margin:0 auto 0 0;">
                      <tr>
                        <td class="tag-cell" style="padding:0 6px 0 0;">
                          <div style="
                            display:inline-block;
                            border:1px solid #3A3A42;
                            border-radius:100px;
                            padding:6px 12px;
                            font-family:'Manrope',Arial,Helvetica,sans-serif;
                            font-size:11px;
                            line-height:14px;
                            font-weight:500;
                            color:#C8C8D0;
                          ">Advocacia</div>
                        </td>
                        <td class="tag-cell" style="padding:0 6px 0 0;">
                          <div style="
                            display:inline-block;
                            border:1px solid #3A3A42;
                            border-radius:100px;
                            padding:6px 12px;
                            font-family:'Manrope',Arial,Helvetica,sans-serif;
                            font-size:11px;
                            line-height:14px;
                            font-weight:500;
                            color:#C8C8D0;
                          ">Conversão</div>
                        </td>
                        <td class="tag-cell" style="padding:0 6px 0 0;">
                          <div style="
                            display:inline-block;
                            border:1px solid #3A3A42;
                            border-radius:100px;
                            padding:6px 12px;
                            font-family:'Manrope',Arial,Helvetica,sans-serif;
                            font-size:11px;
                            line-height:14px;
                            font-weight:500;
                            color:#C8C8D0;
                          ">WhatsApp</div>
                        </td>
                        <td class="tag-cell" style="padding:0;">
                          <div style="
                            display:inline-block;
                            border:1px solid #3A3A42;
                            border-radius:100px;
                            padding:6px 12px;
                            font-family:'Manrope',Arial,Helvetica,sans-serif;
                            font-size:11px;
                            line-height:14px;
                            font-weight:500;
                            color:#C8C8D0;
                          ">Fechamento</div>
                        </td>
                      </tr>
                    </table>

                    <div style="height:22px;line-height:22px;">&nbsp;</div>

                    <div class="cta-title" style="
                      font-family:'Manrope',Arial,Helvetica,sans-serif;
                      font-size:26px;
                      line-height:34px;
                      font-weight:700;
                      color:#FFFFFF;
                      letter-spacing:-0.3px;
                      max-width:420px;
                    ">
                      Falta apenas um passo para a Scale Class.
                    </div>

                    <div style="height:24px;line-height:24px;">&nbsp;</div>

                    <a
                      class="cta-btn"
                      href="${whatsappGroupUrl}"
                      target="_blank"
                      style="
                        display:inline-block;
                        background-color:#3B66F5;
                        color:#FFFFFF;
                        font-family:'Manrope',Arial,Helvetica,sans-serif;
                        font-size:14px;
                        line-height:18px;
                        font-weight:600;
                        padding:16px 28px;
                        border-radius:100px;
                        text-decoration:none;
                        box-sizing:border-box;
                      "
                    >
                      Entrar no Grupo do WhatsApp →
                    </a>

                  </td>
                </tr>
              </table>

            </td>
          </tr>


          <!-- ========== CLOSING NOTE ========== -->
          <tr>
            <td class="content" style="padding:32px 32px 8px 32px;">

              <div style="
                font-family:'Manrope',Arial,Helvetica,sans-serif;
                font-size:15px;
                line-height:24px;
                font-weight:600;
                color:#111111;
              ">
                Nos vemos na Scale Class.
              </div>
              <div style="
                font-family:'Manrope',Arial,Helvetica,sans-serif;
                font-size:13px;
                line-height:21px;
                color:#6B6B6B;
                margin-top:6px;
              ">
                Prepare-se para olhar para o seu atendimento comercial de outra forma.
              </div>

            </td>
          </tr>


          <!-- ========== FOOTER ========== -->
          <tr>
            <td class="footer-pad" align="center" style="padding:40px 32px 36px 32px;">

              <img
                src="https://dev.scalecompany.com.br/wp-content/uploads/2026/08/scale-logo-1-1-1.png"
                width="120"
                alt="Scale Company"
                style="width:120px;max-width:120px;margin:0 auto 12px auto;display:block;"
              >

              <div style="
                font-family:'Manrope',Arial,Helvetica,sans-serif;
                font-size:12px;
                line-height:18px;
                color:#8A8A8A;
              ">
                Scale Company | Marketing e Performance para Advocacia
              </div>

              <div style="height:22px;line-height:22px;">&nbsp;</div>

              <!-- Contact row -->
              <table role="presentation" class="footer-contact" align="center" width="100%" style="width:100%;max-width:480px;margin:0 auto;">
                <tr>
                  <td style="
                    font-family:'Manrope',Arial,Helvetica,sans-serif;
                    font-size:12px;
                    line-height:16px;
                    color:#6B6B6B;
                    padding:0 12px;
                    border-right:1px solid #D5D8E0;
                    text-align:center;
                  ">
                    scalecompany.com.br
                  </td>
                  <td style="
                    font-family:'Manrope',Arial,Helvetica,sans-serif;
                    font-size:12px;
                    line-height:16px;
                    color:#6B6B6B;
                    padding:0 12px;
                    border-right:1px solid #D5D8E0;
                    text-align:center;
                  ">
                    contato@scalecompany.com.br
                  </td>
                  <td style="
                    font-family:'Manrope',Arial,Helvetica,sans-serif;
                    font-size:12px;
                    line-height:16px;
                    color:#6B6B6B;
                    padding:0 12px;
                    text-align:center;
                  ">
                    Instagram
                  </td>
                </tr>
              </table>

              <div style="height:20px;line-height:20px;">&nbsp;</div>

              <div class="footer-links" style="
                font-family:'Manrope',Arial,Helvetica,sans-serif;
                font-size:11px;
                line-height:16px;
                color:#9A9A9A;
              ">
                <a href="#" style="color:#9A9A9A;text-decoration:underline;">Central de Ajuda</a>
                &nbsp;&nbsp;
                <a href="#" style="color:#9A9A9A;text-decoration:underline;">Privacidade</a>
                &nbsp;&nbsp;
                <a href="#" style="color:#9A9A9A;text-decoration:underline;">Termos &amp; Condições</a>
              </div>

              <div style="
                font-family:'Manrope',Arial,Helvetica,sans-serif;
                font-size:10px;
                line-height:16px;
                color:#B0B0B0;
                margin-top:14px;
              ">
                © 2026 Scale Company. Todos os direitos reservados.
              </div>

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
