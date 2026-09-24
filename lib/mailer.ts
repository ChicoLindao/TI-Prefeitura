import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  title: string;
  greeting?: string;
  message: string;
  ticketData?: {
    label: string;
    value: string;
  }[];
  buttonText?: string;
  buttonLink?: string;
  isAlert?: boolean; // Se for true, muda as cores para vermelho (ex: alertas de SPAM)
}

export async function sendProfessionalEmail({
  to,
  subject,
  title,
  greeting = "Olá,",
  message,
  ticketData,
  buttonText,
  buttonLink,
  isAlert = false,
}: EmailOptions) {
  
  if (!to) {
    console.error("❌ E-mail não fornecido para o destinatário.");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Paleta de Cores
    const themeColor = isAlert ? "#dc2626" : "#2563eb"; // Vermelho para Alerta, Azul para Padrão
    const lightThemeColor = isAlert ? "#fef2f2" : "#eff6ff";

    // Construção da Tabela de Informações (se existirem dados)
    let detailsHtml = "";
    if (ticketData && ticketData.length > 0) {
      detailsHtml = `
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #e2e8f0;">
          <h3 style="margin-top: 0; margin-bottom: 15px; color: #334155; font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
            Resumo do Atendimento
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${ticketData.map(item => `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; width: 35%; color: #64748b; font-weight: 600; font-size: 14px;">${item.label}:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px;">${item.value}</td>
              </tr>
            `).join("")}
          </table>
        </div>
      `;
    }

    // Botão de Ação (se existir)
    let buttonHtml = "";
    if (buttonText && buttonLink) {
      buttonHtml = `
        <div style="text-align: center; margin-top: 30px; margin-bottom: 10px;">
          <a href="${buttonLink}" style="background-color: ${themeColor}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 15px;">
            ${buttonText}
          </a>
        </div>
      `;
    }

    // Template HTML Principal
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px;">
      
      <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center">
            <div style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin: 0 auto; text-align: left;">
              
              <!-- Cabeçalho -->
              <div style="background-color: ${lightThemeColor}; padding: 30px; text-align: center; border-bottom: 4px solid ${themeColor};">
                <!-- Se você tiver uma URL pública do seu logo, pode substituir aqui. Ex: https://suaprefeitura.gov.br/logo.png -->
                <h1 style="color: ${themeColor}; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">SISTEMA DO DEPARTAMENTO DE INFORMÁTICA</h1>
              </div>

              <!-- Corpo do E-mail -->
              <div style="padding: 40px 30px;">
                <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 20px; font-size: 20px;">${title}</h2>
                <p style="color: #475569; font-size: 16px; margin-bottom: 10px;">${greeting}</p>
                <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  ${message}
                </p>

                ${detailsHtml}

                ${buttonHtml}
              </div>

              <!-- Rodapé -->
              <div style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; color: #64748b; font-size: 13px;">
                  Este é um e-mail automático enviado pelo <strong>Sistema de Gerenciamento do Departamento de Informática</strong>. Por favor, não responda diretamente a este e-mail.
                </p>
                <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 12px;">
                  &copy; ${new Date().getFullYear()} Departamento de Informática
                </p>
              </div>

            </div>
          </td>
        </tr>
      </table>

    </body>
    </html>
    `;

    // Disparo do E-mail
    await transporter.sendMail({
      from: `"Setor de TI" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlTemplate,
    });

    console.log(`✅ [MAILER] E-mail "${subject}" enviado com sucesso para ${to}.`);

  } catch (error) {
    console.error("❌ [MAILER] Erro crítico ao enviar e-mail:", error);
  }
}