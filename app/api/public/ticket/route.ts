import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendNotificationEmail } from "@/lib/mailer";
import { triggerUpdate } from "@/lib/ws"; // <-- Importação do gatilho

export async function GET() {
  const sectors = await prisma.sector.findMany({ orderBy: { name: 'asc' } });
  const deviceTypes = await prisma.deviceType.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ sectors, deviceTypes });
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const now = new Date();
    const brazilTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    
    const dayOfWeek = brazilTime.getDay();
    const hour = brazilTime.getHours();

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isBusinessHours = !isWeekend && hour >= 8 && hour < 17;

    const MAX_TICKETS = isBusinessHours ? 3 : 1; 
    const TIME_WINDOW_MS = isBusinessHours ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000;

    // --- 1. VERIFICA BLOQUEIO NA LISTA CENTRAL (PERMANENTE E TEMPORÁRIO) ---
    if (data.userEmail) {
      const blockRecord = await prisma.blockedEmail.findUnique({
        where: { email: data.userEmail }
      });
      
      if (blockRecord) {
        if (blockRecord.isTemporary && blockRecord.expiresAt && blockRecord.expiresAt < now) {
          await prisma.blockedEmail.delete({ where: { email: data.userEmail } });
        } else {
          const tipo = blockRecord.isTemporary ? "temporariamente por limite de chamados" : "permanentemente pelo administrador";
          return NextResponse.json({ error: `Este e-mail está bloqueado ${tipo}.` }, { status: 403 });
        }
      }
    }

    // --- 2. PROTEÇÃO POR IP (COM WHITELIST DO FIREWALL) ---
    const cfIp = req.headers.get("cf-connecting-ip");
    const forwardedIp = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");

    let rawIp = cfIp || (forwardedIp ? forwardedIp.split(',')[0].trim() : null) || realIp || "ip-desconhecido";
    const ip = rawIp.replace("::ffff:", "");

    const WHITELISTED_IPS = ["192.168.0.254", "127.0.0.1", "::1"];
    const isIpWhitelisted = WHITELISTED_IPS.includes(ip);

    // FUNÇÃO AUXILIAR: Bloqueia, Notifica e ADICIONA NA LISTA DA UI
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

      if (now.getTime() - lastWarningTime > 60 * 60 * 1000) {
        try {
          const alertEmails = await prisma.alertEmail.findMany();
          for (const admin of alertEmails) {
            await sendNotificationEmail(
              admin.email,
              `⚠️ ALERTA: Spam bloqueado (${blockType})`,
              `<p>O sistema bloqueou a abertura de chamados.</p>
               <p><b>Gatilho:</b> ${blockType} (${identifier}).</p>
               <p><b>IP de Origem:</b> ${triggerIp} ${isIpWhitelisted ? '(Ignorado pela Whitelist)' : ''}</p>`
            );
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

    // --- 3. APLICA A TRAVA DE IP ---
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

    // --- 4. CONTA OS CHAMADOS NO BANCO PARA APLICAR A TRAVA DE E-MAIL ---
    const windowStartDate = new Date(now.getTime() - TIME_WINDOW_MS);

    if (data.type === 'EXTERNAL') {
      const recentTickets = await prisma.externalService.count({
        where: { userEmail: data.userEmail, createdAt: { gte: windowStartDate } }
      });

      if (recentTickets >= MAX_TICKETS) {
        const errorMsg = await handleRateLimitExceeded("E-mail Múltiplo", data.userEmail, ip);
        return NextResponse.json({ error: errorMsg }, { status: 429 });
      }

      const newTicket = await prisma.externalService.create({
        data: {
          sectorId: data.sectorId,
          personAttended: data.personAttended,
          userEmail: data.userEmail,
          description: data.description, 
          status: "PENDENTE"
        },
        include: { sector: true }
      });
      
      // 👉 Gatilho WebSocket para Chamados Externos:
      await triggerUpdate('nova-demanda', { tipo: 'CHAMADO', setor: newTicket.sector.name });

      return NextResponse.json({ message: "Chamado aberto!" }, { status: 201 });
      
    } else {
      const recentMaintenances = await prisma.internalMaintenance.count({
        where: { userEmail: data.userEmail, receiveDate: { gte: windowStartDate } }
      });

      if (recentMaintenances >= MAX_TICKETS) {
        const errorMsg = await handleRateLimitExceeded("E-mail Múltiplo", data.userEmail, ip);
        return NextResponse.json({ error: errorMsg }, { status: 429 });
      }

      const newMaintenance = await prisma.internalMaintenance.create({
        data: {
          deviceTypeId: data.deviceTypeId,
          patrimony: data.patrimony || null,
          originSectorId: data.sectorId,
          equipmentUser: data.personAttended,
          userEmail: data.userEmail,
          reportedProblem: data.description,
          status: "PENDENTE"
        },
        include: { originSector: true, deviceType: true }
      });

      // 👉 Gatilho WebSocket para Equipamentos:
      await triggerUpdate('nova-demanda', { tipo: 'EQUIPAMENTO', setor: newMaintenance.originSector.name });

      return NextResponse.json({ message: "Equipamento registrado!" }, { status: 201 });
    }
  } catch (error) {
    console.error("Erro na API:", error);
    return NextResponse.json({ error: "Erro ao criar chamado" }, { status: 500 });
  }
}