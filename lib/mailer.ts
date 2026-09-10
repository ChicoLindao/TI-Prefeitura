import nodemailer from 'nodemailer';

export async function sendNotificationEmail(to: string, subject: string, html: string) {
  try {
    // Se não tiver as credenciais no .env, ele imprime no terminal do servidor simulando o envio
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log("\n=========================================");
      console.log(`📧 SIMULAÇÃO DE E-MAIL (Configure o .env para envio real)`);
      console.log(`Para: ${to}\nAssunto: ${subject}`);
      console.log(`Corpo:\n${html.replace(/<[^>]*>?/gm, '')}`); 
      console.log("=========================================\n");
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Setor de Informática" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);
  }
}