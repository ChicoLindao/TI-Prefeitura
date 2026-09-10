import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendNotificationEmail } from "@/lib/mailer";

// Carrega os selects do formulário
export async function GET() {
  const sectors = await prisma.sector.findMany({ orderBy: { name: 'asc' } });
  const deviceTypes = await prisma.deviceType.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ sectors, deviceTypes });
}

// Salva a nova demanda
export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    if (data.type === 'EXTERNAL') {
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
    return NextResponse.json({ error: "Erro ao criar chamado" }, { status: 500 });
  }
}