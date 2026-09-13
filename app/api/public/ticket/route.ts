import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendNotificationEmail } from "@/lib/mailer";

export async function GET() {
  const sectors = await prisma.sector.findMany({ orderBy: { name: 'asc' } });
  const deviceTypes = await prisma.deviceType.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ sectors, deviceTypes });
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // --- 1. VERIFICA BLOQUEIO PERMANENTE DE E-MAIL ---
    if (data.userEmail) {
      const isBlocked = await prisma.blockedEmail.findUnique({
        where: { email: data.userEmail }
      });
      if (isBlocked) {
        return NextResponse.json({ error: "Este e-mail foi bloqueado permanentemente pelo administrador." }, { status: 403 });
      }
    }

    // --- 2. LÓGICA DE TEMPO (HORÁRIO DE BRASÍLIA) ---
    const now = new Date();
    const brazilTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    
    const dayOfWeek = brazilTime.getDay();
    const hour = brazilTime.getHours();

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isBusinessHours = !isWeekend && hour >= 8 && hour < 17;

    const MAX_TICKETS = isBusinessHours ? 3 : 1; 
    const TIME_WINDOW_MS = isBusinessHours ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000;

    // --- 3. PROTEÇÃO POR IP (COM WHITELIST DO FIREWALL) ---
    const cfIp = req.headers.get("cf-connecting-ip");
    const forwardedIp = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");

    let rawIp = cfIp || (forwardedIp ? forwardedIp.split(',')[0].trim() : null) || realIp || "ip-desconhecido";
    const ip = rawIp.replace("::ffff:", "");

    // 🔴 LISTA DE IPs IGNORADOS (Firewall da Prefeitura e Localhost)
    const WHITELISTED_IPS = ["192.168.0.254", "127.0.0.1", "::1"];
    const isIpWhitelisted = WHITELISTED_IPS.includes(ip);

    // FUNÇÃO AUXILIAR: Bloqueia e Notifica a TI
    const handleRateLimitExceeded = async (blockType: string, identifier: string, triggerIp: string) => {
      
      // Cria um registro temporário só para controlar o tempo de reenvio do e-mail de alerta (1x por hora)
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
              `<p>O sistema de proteção bloqueou a abertura de chamados.</p>
               <p><b>Gatilho:</b> Limite atingido por ${blockType} (${identifier}).</p>
               <p><b>IP de Origem:</b> ${triggerIp} ${isIpWhitelisted ? '(Ignorado pela Whitelist)' : ''}</p>
               <p><b>Contexto:</b> ${isBusinessHours ? 'Horário Comercial' : 'Fora do Horário/Fim de semana'}</p>
               <p><b>Regra Ativa:</b> Bloqueado após ${MAX_TICKETS} tentativa(s).</p>`
            );
          }
          await prisma.ipRateLimit.update({
            where: { ip: throttleKey },
            data: { lastWarning: now }
          });
        } catch (error) {
          console.error("[PROTEÇÃO] Erro ao enviar e-mails de alerta:", error);
        }
      }

      if (isWeekend) return "Fim de semana detectado. Nosso limite é de apenas 1 chamado por dia. Tente novamente no próximo dia útil.";
      if (!isBusinessHours) return "Fora do horário comercial (08h às 17h), permitimos apenas 1 chamado por dia. Tente novamente a partir das 08h.";
      return `Muitas solicitações registradas. Por favor, aguarde ${isBusinessHours ? '15 minutos' : 'algumas horas'}.`;
    };

    // Só aplica a trava de IP se ele NÃO estiver na Whitelist
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

    // --- 4. PROTEÇÃO EXTRA POR E-MAIL NO PRISMA ---
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
      
      await sendNotificationEmail(
        data.userEmail, 
        "Demanda Registrada - Setor de Informática", 
        `<p>Olá, <b>${data.personAttended}</b>.</p><p>Recebemos sua solicitação de atendimento para o setor <b>${newTicket.sector.name}</b>.</p><p><b>Problema relatado:</b> ${data.description}</p><p>Em breve nossa equipe iniciará o atendimento.</p>`
      );
      
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
      
      await sendNotificationEmail(
        data.userEmail, 
        "Equipamento Recebido - Setor de Informática", 
        `<p>Olá, <b>${data.personAttended}</b>.</p><p>Registramos a entrada do seu equipamento (${newMaintenance.deviceType.name}) vindo do setor <b>${newMaintenance.originSector.name}</b>.</p><p><b>Defeito:</b> ${data.description}</p><p>Avisaremos neste e-mail assim que ele estiver pronto para retirada.</p>`
      );

      return NextResponse.json({ message: "Equipamento registrado!" }, { status: 201 });
    }
  } catch (error) {
    console.error("Erro na API:", error);
    return NextResponse.json({ error: "Erro ao criar chamado" }, { status: 500 });
  }
}