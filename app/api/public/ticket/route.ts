import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendNotificationEmail } from "@/lib/mailer";

// 🛡️ SISTEMA DE PROTEÇÃO: "Caderninho" na memória para anotar os IPs
const ipRateLimit = new Map<string, { count: number; startTime: number }>();
const MAX_TICKETS = 3; // Limite de chamados por IP/Email
const TIME_WINDOW_MS = 15 * 60 * 1000; // 15 minutos em milissegundos

// Carrega os selects do formulário
export async function GET() {
  const sectors = await prisma.sector.findMany({ orderBy: { name: 'asc' } });
  const deviceTypes = await prisma.deviceType.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ sectors, deviceTypes });
}

// Salva a nova demanda
export async function POST(req: Request) {
  try {
    // --- INÍCIO DO CÃO DE GUARDA (RATE LIMIT) ---
    
    // 1. Pega o IP do computador que está acessando
    const ip = req.headers.get("x-forwarded-for")?.split(',')[0] || req.headers.get("x-real-ip") || "ip-desconhecido";
    const now = Date.now();
    
    // Verifica o registro desse IP
    const ipRecord = ipRateLimit.get(ip) || { count: 0, startTime: now };
    
    // Se já passou o tempo de castigo (15 min), zera a contagem
    if (now - ipRecord.startTime > TIME_WINDOW_MS) {
      ipRecord.count = 0;
      ipRecord.startTime = now;
    }

    // Se esse IP já passou do limite, bloqueamos imediatamente
    if (ipRecord.count >= MAX_TICKETS) {
      return NextResponse.json(
        { error: "Muitas solicitações deste computador. Por favor, aguarde 15 minutos." }, 
        { status: 429 } // 429 = Too Many Requests
      );
    }
    // --- FIM DA PROTEÇÃO DE IP ---

    const data = await req.json();
    
    // 2. Proteção Extra via Prisma (Verifica pelo E-mail do solicitante)
    const fifteenMinutesAgo = new Date(Date.now() - TIME_WINDOW_MS);

    if (data.type === 'EXTERNAL') {
      
      // Conta quantos chamados esse e-mail abriu nos últimos 15 min
      const recentTickets = await prisma.externalService.count({
        where: {
          userEmail: data.userEmail,
          createdAt: { gte: fifteenMinutesAgo }
        }
      });

      if (recentTickets >= MAX_TICKETS) {
        return NextResponse.json(
          { error: "Este e-mail já registrou muitos chamados recentes. Aguarde 15 minutos." }, 
          { status: 429 }
        );
      }

      // Tudo certo! Registra o chamado...
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
      
      // E anota +1 na ficha desse IP
      ipRecord.count += 1;
      ipRateLimit.set(ip, ipRecord);

      return NextResponse.json({ message: "Chamado aberto!" }, { status: 201 });
      
    } else {
      // (A mesma verificação de e-mail pode ser feita aqui para manutenções internas)
      const recentMaintenances = await prisma.internalMaintenance.count({
        where: {
          userEmail: data.userEmail,
          receiveDate: { gte: fifteenMinutesAgo }
        }
      });

      if (recentMaintenances >= MAX_TICKETS) {
        return NextResponse.json(
          { error: "Este e-mail já registrou muitas manutenções recentes. Aguarde 15 minutos." }, 
          { status: 429 }
        );
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

      // E anota +1 na ficha desse IP
      ipRecord.count += 1;
      ipRateLimit.set(ip, ipRecord);

      return NextResponse.json({ message: "Equipamento registrado!" }, { status: 201 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Erro ao criar chamado" }, { status: 500 });
  }
}