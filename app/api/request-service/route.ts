export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";
import { triggerUpdate } from "@/lib/ws";

// GET: Busca apenas os setores ativos para preencher a caixinha de seleção
export async function GET() {
  try {
    const sectors = await prisma.sector.findMany({
      where: { NOT: { name: { contains: "(Inativo)" } } },
      orderBy: { name: "asc" }
    });
    return NextResponse.json(sectors);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar setores" }, { status: 500 });
  }
}

// POST: Recebe os dados do formulário público, verifica spam e cria o chamado
export async function POST(req: Request) {
  try {
    const { sectorId, personAttended, userEmail, description } = await req.json();

    const now = new Date();
    const brazilTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const dayOfWeek = brazilTime.getDay();
    const hour = brazilTime.getHours();

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isBusinessHours = !isWeekend && hour >= 8 && hour < 17;

    const MAX_TICKETS = isBusinessHours ? 3 : 1; 
    const TIME_WINDOW_MS = isBusinessHours ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000;

    // Configuração do carteiro de e-mails
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    // --- 1. VERIFICA BLOQUEIO DE E-MAIL ---
    if (userEmail) {
      const blockRecord = await prisma.blockedEmail.findUnique({
        where: { email: userEmail }
      });
      
      if (blockRecord) {
        if (blockRecord.isTemporary && blockRecord.expiresAt && blockRecord.expiresAt < now) {
          await prisma.blockedEmail.delete({ where: { email: userEmail } });
        } else {
          const tipo = blockRecord.isTemporary ? "temporariamente por limite de chamados" : "permanentemente pelo administrador";
          return NextResponse.json({ error: `Este e-mail está bloqueado ${tipo}.` }, { status: 403 });
        }
      }
    }

    // --- 2. PROTEÇÃO POR IP ---
    const cfIp = req.headers.get("cf-connecting-ip");
    const forwardedIp = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");

    let rawIp = cfIp || (forwardedIp ? forwardedIp.split(',')[0].trim() : null) || realIp || "ip-desconhecido";
    const ip = rawIp.replace("::ffff:", "");

    const WHITELISTED_IPS = ["192.168.0.254", "127.0.0.1", "::1"];
    const isIpWhitelisted = WHITELISTED_IPS.includes(ip);

    // FUNÇÃO: PUNE QUEM FAZ SPAM E AVISA A TI
    const handleRateLimitExceeded = async (blockType: string, identifier: string, triggerIp: string) => {
      if (blockType === "E-mail Múltiplo") {
        const expirationDate = new Date(now.getTime() + TIME_WINDOW_MS);
        await prisma.blockedEmail.upsert({
          where: { email: identifier },
          update: { isTemporary: true, expiresAt: expirationDate },
          create: { email: identifier, isTemporary: true, expiresAt: expirationDate }
        });
      }

      const throttleKey = isIpWhitelisted ? `alerta_email_${identifier}` : triggerIp;
      let alertRecord = await prisma.ipRateLimit.upsert({
        where: { ip: throttleKey },
        update: {},
        create: { ip: throttleKey, count: 0, startTime: now }
      });

      const lastWarningTime = alertRecord.lastWarning ? alertRecord.lastWarning.getTime() : 0;

      // DISPARA O ALERTA (COM AWAIT) PARA OS ADMINISTRADORES
      if (now.getTime() - lastWarningTime > 60 * 60 * 1000) {
        try {
          const admins = await prisma.user.findMany({ where: { role: 'ADMINISTRADOR' } });
          for (const admin of admins) {
            if (admin.email) {
              await transporter.sendMail({ // <-- AWAIT COLOCADO AQUI
                from: process.env.EMAIL_USER,
                to: admin.email,
                subject: `⚠️ ALERTA: Spam bloqueado (${blockType})`,
                html: `<p>O sistema bloqueou a abertura de chamados pela Tela Pública.</p>
                       <p><b>Gatilho:</b> ${blockType} (${identifier}).</p>
                       <p><b>IP de Origem:</b> ${triggerIp} ${isIpWhitelisted ? '(Ignorado pela Whitelist)' : ''}</p>`
              });
            }
          }
          await prisma.ipRateLimit.update({
            where: { ip: throttleKey },
            data: { lastWarning: now }
          });
        } catch (error) {
          console.error("[PROTEÇÃO] Erro ao enviar alerta:", error);
        }
      }

      if (isWeekend) return "Fim de semana detectado. Limite de 1 chamado por dia. Tente amanhã.";
      if (!isBusinessHours) return "Fora do horário comercial. Limite de 1 chamado. Tente a partir das 08h.";
      return `Muitas solicitações. Aguarde 15 minutos.`;
    };

    // --- 3. TRAVA DE IP ---
    if (!isIpWhitelisted) {
      let ipRecord = await prisma.ipRateLimit.upsert({
        where: { ip },
        update: {},
        create: { ip, count: 0, startTime: now }
      });
      
      if (now.getTime() - ipRecord.startTime.getTime() > TIME_WINDOW_MS) {
        ipRecord = await prisma.ipRateLimit.update({
          where: { ip },
          data: { count: 0, startTime: now }
        });
      }

      ipRecord = await prisma.ipRateLimit.update({
        where: { ip },
        data: { count: ipRecord.count + 1 }
      });

      if (ipRecord.count > MAX_TICKETS) {
        const errorMsg = await handleRateLimitExceeded("IP", ip, ip);
        return NextResponse.json({ error: errorMsg }, { status: 429 });
      }
    }

    // --- 4. TRAVA DE E-MAIL ---
    const windowStartDate = new Date(now.getTime() - TIME_WINDOW_MS);
    const recentTickets = await prisma.externalService.count({
      where: { userEmail, createdAt: { gte: windowStartDate } }
    });

    if (recentTickets >= MAX_TICKETS) {
      const errorMsg = await handleRateLimitExceeded("E-mail Múltiplo", userEmail, ip);
      return NextResponse.json({ error: errorMsg }, { status: 429 });
    }

    // --- 5. TUDO CERTO! CRIA O CHAMADO ---
    const newTicket = await prisma.externalService.create({
      data: {
        sectorId,
        personAttended,
        userEmail,
        description,
        status: "PENDENTE"
      },
      include: { sector: true }
    });

    // 🔥 GATILHO WEBSOCKET: Avisa o painel da TI instantaneamente
    await triggerUpdate('nova-demanda', { tipo: 'CHAMADO', setor: newTicket.sector.name });

    // 📧 ENVIO DE E-MAIL PARA O SOLICITANTE (COM AWAIT PARA GARANTIR O ENVIO)
    if (newTicket.userEmail) {
      try {
        await transporter.sendMail({ // <-- AWAIT COLOCADO AQUI
          from: process.env.EMAIL_USER,
          to: newTicket.userEmail,
          subject: `Chamado Aberto com Sucesso: ${newTicket.sector.name}`,
          html: `<h3>Olá, ${newTicket.personAttended}!</h3>
                 <p>Seu chamado para o setor <strong>${newTicket.sector.name}</strong> foi registrado e já está na fila de atendimento da TI.</p>
                 <p><strong>Descrição:</strong> ${newTicket.description}</p>
                 <p>Você será notificado por e-mail assim que a nossa equipe atualizar o status.</p>`
        });
      } catch (error) { 
        console.error("Erro ao enviar email para o solicitante:", error); 
      }
    }

    return NextResponse.json({ message: "Chamado aberto com sucesso!" }, { status: 201 });
  } catch (error) {
    console.error("Erro geral no endpoint:", error);
    return NextResponse.json({ error: "Erro ao abrir chamado" }, { status: 500 });
  }
}