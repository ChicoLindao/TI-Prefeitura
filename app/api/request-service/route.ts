export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";
import { triggerUpdate } from "@/lib/ws";

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("👉 [1] DADOS RECEBIDOS DO FRONTEND:", body);

    const { sectorId, personAttended, userEmail, description } = body;

    const now = new Date();
    const brazilTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const dayOfWeek = brazilTime.getDay();
    const hour = brazilTime.getHours();

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isBusinessHours = !isWeekend && hour >= 8 && hour < 17;

    const MAX_TICKETS = isBusinessHours ? 3 : 1; 
    const TIME_WINDOW_MS = isBusinessHours ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    console.log("👉 [2] E-MAIL CADASTRADO NO ENV:", process.env.EMAIL_USER);

    // --- 1. VERIFICA BLOQUEIO DE E-MAIL ---
    if (userEmail) {
      const blockRecord = await prisma.blockedEmail.findUnique({
        where: { email: userEmail }
      });
      if (blockRecord) {
        if (blockRecord.isTemporary && blockRecord.expiresAt && blockRecord.expiresAt < now) {
          await prisma.blockedEmail.delete({ where: { email: userEmail } });
        } else {
          return NextResponse.json({ error: `E-mail bloqueado.` }, { status: 403 });
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

    console.log(`👉 [3] VERIFICANDO IP: ${ip} (Whitelist: ${isIpWhitelisted})`);

    const handleRateLimitExceeded = async (blockType: string, identifier: string, triggerIp: string) => {
      console.log(`🚨 [SPAM] BLOQUEIO ACIONADO: ${blockType} para ${identifier}`);
      
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

      if (now.getTime() - lastWarningTime > 60 * 60 * 1000) {
        try {
          const admins = await prisma.user.findMany({ where: { role: 'ADMINISTRADOR' } });
          console.log(`📧 [SPAM] Preparando envio de alerta para ${admins.length} administradores...`);
          
          for (const admin of admins) {
            if (admin.email) {
              await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: admin.email,
                subject: `⚠️ ALERTA: Spam bloqueado (${blockType})`,
                html: `<p>O sistema bloqueou a abertura de chamados.</p>
                       <p><b>Gatilho:</b> ${blockType} (${identifier}).</p>`
              });
              console.log(`✅ [SPAM] E-mail enviado para Admin: ${admin.email}`);
            }
          }
          await prisma.ipRateLimit.update({ where: { ip: throttleKey }, data: { lastWarning: now } });
        } catch (error) {
          console.error("❌ [SPAM] Erro ao enviar e-mail de alerta:", error);
        }
      }
      return `Muitas solicitações. Aguarde 15 minutos.`;
    };

    if (!isIpWhitelisted) {
      let ipRecord = await prisma.ipRateLimit.upsert({
        where: { ip },
        update: {},
        create: { ip, count: 0, startTime: now }
      });
      if (now.getTime() - ipRecord.startTime.getTime() > TIME_WINDOW_MS) {
        ipRecord = await prisma.ipRateLimit.update({ where: { ip }, data: { count: 0, startTime: now } });
      }
      ipRecord = await prisma.ipRateLimit.update({ where: { ip }, data: { count: ipRecord.count + 1 } });

      if (ipRecord.count > MAX_TICKETS) {
        const errorMsg = await handleRateLimitExceeded("IP", ip, ip);
        return NextResponse.json({ error: errorMsg }, { status: 429 });
      }
    }

    const windowStartDate = new Date(now.getTime() - TIME_WINDOW_MS);
    const recentTickets = await prisma.externalService.count({
      where: { userEmail, createdAt: { gte: windowStartDate } }
    });

    if (recentTickets >= MAX_TICKETS) {
      const errorMsg = await handleRateLimitExceeded("E-mail Múltiplo", userEmail, ip);
      return NextResponse.json({ error: errorMsg }, { status: 429 });
    }

    // --- CRIAÇÃO DO CHAMADO ---
    console.log("👉 [4] SALVANDO CHAMADO NO BANCO DE DADOS...");
    const newTicket = await prisma.externalService.create({
      data: { sectorId, personAttended, userEmail, description, status: "PENDENTE" },
      include: { sector: true }
    });

    await triggerUpdate('nova-demanda', { tipo: 'CHAMADO', setor: newTicket.sector.name });
    console.log("👉 [5] WEBSOCKET DISPARADO!");

    if (newTicket.userEmail) {
      console.log(`👉 [6] TENTANDO ENVIAR E-MAIL PARA O SOLICITANTE: ${newTicket.userEmail}`);
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: newTicket.userEmail,
          subject: `Chamado Aberto com Sucesso: ${newTicket.sector.name}`,
          html: `<p>Seu chamado foi registrado na TI.</p>`
        });
        console.log("✅ [7] E-MAIL DO SOLICITANTE ENVIADO COM SUCESSO!");
      } catch (error) { 
        console.error("❌ [ERRO E-MAIL SOLICITANTE]:", error); 
      }
    } else {
      console.log("⚠️ [ALERTA] O e-mail do usuário chegou VAZIO do frontend!");
    }

    return NextResponse.json({ message: "Chamado aberto com sucesso!" }, { status: 201 });
  } catch (error) {
    console.error("❌ [ERRO GERAL NA ROTA]:", error);
    return NextResponse.json({ error: "Erro ao abrir chamado" }, { status: 500 });
  }
}