export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { triggerUpdate } from "@/lib/ws";
import { createAuditLog } from "@/lib/logger";
import { sendProfessionalEmail } from "@/lib/mailer"; 

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
    const { sectorId, personAttended, userEmail, description } = body;

    const now = new Date();
    const brazilTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const dayOfWeek = brazilTime.getDay();
    const hour = brazilTime.getHours();

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isBusinessHours = !isWeekend && hour >= 8 && hour < 17;

    const MAX_TICKETS = isBusinessHours ? 3 : 1; 
    const TIME_WINDOW_MS = isBusinessHours ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000;

    if (userEmail) {
      const blockRecord = await prisma.blockedEmail.findUnique({
        where: { email: userEmail }
      });
      if (blockRecord) {
        if (blockRecord.isTemporary && blockRecord.expiresAt && blockRecord.expiresAt < now) {
          await prisma.blockedEmail.delete({ where: { email: userEmail } });
        } else {
          return NextResponse.json({ 
            error: `E-mail bloqueado.`,
            expiresAt: blockRecord.expiresAt 
          }, { status: 403 });
        }
      }
    }

    const cfIp = req.headers.get("cf-connecting-ip");
    const forwardedIp = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    let rawIp = cfIp || (forwardedIp ? forwardedIp.split(',')[0].trim() : null) || realIp || "ip-desconhecido";
    const ip = rawIp.replace("::ffff:", "");

    const WHITELISTED_IPS = ["192.168.0.254", "127.0.0.1", "::1"];
    const isIpWhitelisted = WHITELISTED_IPS.includes(ip);

    const handleRateLimitExceeded = async (blockType: string, identifier: string, triggerIp: string) => {
      console.log(`🚨 [SPAM] BLOQUEIO ACIONADO: ${blockType} para ${identifier}`);
      
      const expirationDate = new Date(now.getTime() + TIME_WINDOW_MS);
      
      if (blockType === "E-mail Múltiplo") {
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

      try {
        await triggerUpdate('nova-demanda', { tipo: 'SECURITY_ALERT', setor: 'Anti-Spam' });
      } catch (error) {}

      const lastWarningTime = alertRecord.lastWarning ? alertRecord.lastWarning.getTime() : 0;

      if (now.getTime() - lastWarningTime > 60 * 60 * 1000) {
        try {
          const alertEmailsList = await prisma.alertEmail.findMany();
          
          if (alertEmailsList.length > 0) {
            for (const alertRecord of alertEmailsList) {
              if (alertRecord.email) {
                await sendProfessionalEmail({
                  to: alertRecord.email || "", 
                  subject: `⚠️ ALERTA DE SEGURANÇA: Spam bloqueado (${blockType})`,
                  title: "Bloqueio Anti-Spam Acionado",
                  greeting: `Olá, Equipe!`,
                  message: "O sistema de segurança detectou e bloqueou um número excessivo de tentativas de abertura de chamados na página pública do sistema.",
                  isAlert: true,
                  ticketData: [
                    { label: "Tipo de Bloqueio", value: blockType },
                    { label: "Origem (IP ou E-mail)", value: identifier },
                    { label: "Data e Hora", value: new Date().toLocaleString('pt-BR') }
                  ]
                });
              }
            }
          } else {
            console.log("⚠️ [SPAM] Bloqueio acionado, mas nenhum e-mail de alerta está configurado no painel.");
          }
          await prisma.ipRateLimit.update({ where: { ip: throttleKey }, data: { lastWarning: now } });
        } catch (error) {
          console.error("❌ [SPAM] Erro ao enviar e-mail de alerta:", error);
        }
      }
      
      return { 
        message: "Acesso bloqueado por excesso de tentativas.", 
        expiresAt: expirationDate 
      };
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
        const blockInfo = await handleRateLimitExceeded("IP", ip, ip);
        return NextResponse.json({ error: blockInfo.message, expiresAt: blockInfo.expiresAt }, { status: 429 });
      }
    }

    const windowStartDate = new Date(now.getTime() - TIME_WINDOW_MS);
    const recentTickets = await prisma.externalService.count({
      where: { userEmail, createdAt: { gte: windowStartDate } }
    });

    if (recentTickets >= MAX_TICKETS) {
      const blockInfo = await handleRateLimitExceeded("E-mail Múltiplo", userEmail, ip);
      return NextResponse.json({ error: blockInfo.message, expiresAt: blockInfo.expiresAt }, { status: 429 });
    }

    const newTicket = await prisma.externalService.create({
      data: { sectorId, personAttended, userEmail, description, status: "PENDENTE" },
      include: { sector: true }
    });

    await createAuditLog({
      userEmail: userEmail || "usuario@publico.com",
      action: "CRIAR",
      resource: "Portal Público (Chamados)",
      details: `Novo chamado aberto para o setor "${newTicket.sector.name}" pelo usuário: ${personAttended}.`,
    });

    await triggerUpdate('nova-demanda', { tipo: 'CHAMADO', setor: newTicket.sector.name });

    if (newTicket.userEmail) {
      try {
        await sendProfessionalEmail({
          to: newTicket.userEmail || "", 
          subject: `Chamado Registrado na TI: ${newTicket.sector.name}`,
          title: "Chamado Aberto com Sucesso",
          greeting: `Olá, ${newTicket.personAttended}!`,
          message: "A sua solicitação foi registrada com sucesso. Nossa equipe de TI já foi notificada e em breve avaliará o seu pedido.",
          ticketData: [
            { label: "Setor Solicitante", value: newTicket.sector.name },
            { label: "Problema Relatado", value: newTicket.description || "Não informado" }, // 🔴 Correção TS aqui
            { label: "Status Atual", value: "Pendente 🕒" }
          ]
        });
      } catch (error) { 
        console.error("❌ [ERRO E-MAIL SOLICITANTE]:", error); 
      }
    }

    return NextResponse.json({ message: "Chamado aberto com sucesso!" }, { status: 201 });
  } catch (error) {
    console.error("❌ [ERRO GERAL NA ROTA]:", error);
    return NextResponse.json({ error: "Erro ao abrir chamado" }, { status: 500 });
  }
}