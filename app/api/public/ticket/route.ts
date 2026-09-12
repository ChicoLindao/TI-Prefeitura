import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendNotificationEmail } from "@/lib/mailer";

// 🛡️ SISTEMA DE PROTEÇÃO: "Caderninho" na memória
const ipRateLimit = new Map<string, { count: number; startTime: number; lastWarning: number }>();

export async function GET() {
  const sectors = await prisma.sector.findMany({ orderBy: { name: 'asc' } });
  const deviceTypes = await prisma.deviceType.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ sectors, deviceTypes });
}

export async function POST(req: Request) {
  try {
    // --- 1. LÓGICA DE TEMPO (HORÁRIO DE BRASÍLIA) ---
    const now = new Date();
    const brazilTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    
    const dayOfWeek = brazilTime.getDay(); // 0 = Domingo, 6 = Sábado
    const hour = brazilTime.getHours(); // 0 a 23

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isBusinessHours = !isWeekend && hour >= 8 && hour < 17;

    // Regras Dinâmicas de Limite
    const MAX_TICKETS = isBusinessHours ? 3 : 1; 
    const TIME_WINDOW_MS = isBusinessHours ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000;

    // --- 2. PROTEÇÃO POR IP ---
    const ip = req.headers.get("x-forwarded-for")?.split(',')[0] || req.headers.get("x-real-ip") || "ip-desconhecido";
    const ipRecord = ipRateLimit.get(ip) || { count: 0, startTime: now.getTime(), lastWarning: 0 };
    
    if (now.getTime() - ipRecord.startTime > TIME_WINDOW_MS) {
      ipRecord.count = 0;
      ipRecord.startTime = now.getTime();
    }

    // Soma +1 tentativa logo de cara
    ipRecord.count += 1;
    ipRateLimit.set(ip, ipRecord);

    // FUNÇÃO AUXILIAR: Bloqueia e Notifica a TI
    const handleRateLimitExceeded = async (blockType: string, identifier: string) => {
      console.log(`[PROTEÇÃO] Bloqueio ativado por ${blockType} (${identifier}). IP: ${ip}`);
      
      // Trava de 1 hora recolocada para não lotar sua caixa de entrada
      if (now.getTime() - ipRecord.lastWarning > 60 * 60 * 1000) {
        try {
          await sendNotificationEmail(
            "chicolima1996@gmail.com", // 🔴 SEU E-MAIL
            `⚠️ ALERTA: Spam bloqueado (${blockType})`,
            `<p>O sistema de proteção bloqueou a abertura de chamados.</p>
             <p><b>Gatilho:</b> Limite atingido por ${blockType} (${identifier}).</p>
             <p><b>Contexto:</b> ${isBusinessHours ? 'Horário Comercial' : 'Fora do Horário/Fim de semana'}</p>
             <p><b>Regra Ativa:</b> Bloqueado após ${MAX_TICKETS} tentativa(s).</p>`
          );
          ipRecord.lastWarning = now.getTime();
          ipRateLimit.set(ip, ipRecord);
          console.log("[PROTEÇÃO] E-mail enviado para TI.");
        } catch (error) {
          console.error("[PROTEÇÃO] Erro no e-mail:", error);
        }
      }

      if (isWeekend) {
        return "Fim de semana detectado. Nosso limite é de apenas 1 chamado por dia. Tente novamente no próximo dia útil.";
      } else if (!isBusinessHours) {
        return "Fora do horário comercial (08h às 17h), permitimos apenas 1 chamado por dia. Tente novamente a partir das 08h.";
      } else {
        return "Muitas solicitações deste computador. Por favor, aguarde 15 minutos.";
      }
    };

    // Verifica IP
    if (ipRecord.count > MAX_TICKETS) {
      const errorMsg = await handleRateLimitExceeded("IP", ip);
      return NextResponse.json({ error: errorMsg }, { status: 429 });
    }

    const data = await req.json();
    
    // --- 3. PROTEÇÃO EXTRA POR E-MAIL NO PRISMA ---
    const windowStartDate = new Date(now.getTime() - TIME_WINDOW_MS);

    if (data.type === 'EXTERNAL') {
      const recentTickets = await prisma.externalService.count({
        where: {
          userEmail: data.userEmail,
          createdAt: { gte: windowStartDate }
        }
      });

      if (recentTickets >= MAX_TICKETS) {
        const errorMsg = await handleRateLimitExceeded("E-mail", data.userEmail);
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
        where: {
          userEmail: data.userEmail,
          receiveDate: { gte: windowStartDate }
        }
      });

      if (recentMaintenances >= MAX_TICKETS) {
        const errorMsg = await handleRateLimitExceeded("E-mail", data.userEmail);
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