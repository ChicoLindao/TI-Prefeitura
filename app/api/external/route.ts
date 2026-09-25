import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { triggerUpdate } from "@/lib/ws";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createAuditLog } from "@/lib/logger"; 
import { sendProfessionalEmail } from "@/lib/mailer";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });

    const services = await prisma.externalService.findMany({
      include: { sector: true, techs: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    
    const sectors = await prisma.sector.findMany({
      where: { NOT: { name: { contains: "(Inativo)" } } },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json({ services, sectors });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar atendimentos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });

    const { sectorId, personAttended, userEmail, description } = await req.json();
    
    const newService = await prisma.externalService.create({
      data: { sectorId, personAttended, userEmail, description, status: "PENDENTE" },
      include: { sector: true }
    });

    await createAuditLog({
      userEmail: session.user?.email || "sistema@ti.com",
      action: "CRIAR",
      resource: "Chamados Externos",
      details: `Criou manualmente um chamado para o setor "${newService.sector.name}" no nome de: ${personAttended}.`,
    });

    await triggerUpdate('nova-demanda', { tipo: 'CHAMADO', setor: newService.sector?.name || 'TI' });

    if (newService.userEmail) {
      try {
        await sendProfessionalEmail({
          to: newService.userEmail || "", 
          subject: `Chamado Aberto Por Técnico: ${newService.sector.name}`,
          title: "Novo Chamado Registrado",
          greeting: `Olá, ${newService.personAttended}!`,
          message: "Um chamado foi registrado internamente por nossa equipe técnica em seu nome. Você receberá atualizações automáticas sobre o andamento do serviço.",
          ticketData: [
            { label: "Setor", value: newService.sector.name },
            { label: "Descrição", value: newService.description || "Não informada" }, // 🔴 Correção TS aqui
            { label: "Status Inicial", value: "Pendente 🕒" }
          ]
        });
      } catch (error) { console.error("Erro no email:", error); }
    }

    return NextResponse.json(newService, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao criar atendimento" }, { status: 500 });
  }
}