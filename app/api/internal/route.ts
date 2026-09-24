export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { triggerUpdate } from "@/lib/ws";
import { createAuditLog } from "@/lib/logger"; 
import { sendProfessionalEmail } from "@/lib/mailer"; // 🔴 IMPORTAÇÃO DO NOVO MAILER

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const maintenances = await prisma.internalMaintenance.findMany({
      include: { deviceType: true, originSector: true, techs: { select: { id: true, name: true } }, logs: { include: { tech: { select: { name: true } } }, orderBy: { createdAt: 'desc' } } },
      orderBy: { receiveDate: "asc" }
    });
    return NextResponse.json(maintenances);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar bancada interna" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    
    const techId = (session?.user as any)?.id;
    const body = await req.json();
    const { patrimony, brand, equipmentUser, userEmail, originSectorId, deviceTypeId, reportedProblem } = body;

    if (!originSectorId || !deviceTypeId || !reportedProblem) return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });

    const newMaintenance = await prisma.internalMaintenance.create({
      data: { patrimony: patrimony || null, brand: brand || "Não informada", equipmentUser: equipmentUser || "Não informado", userEmail: userEmail || null, originSectorId, deviceTypeId, reportedProblem, status: "PENDENTE" },
      include: { originSector: true, deviceType: true } 
    });

    const logData: any = { action: "Equipamento cadastrado e inserido na fila da bancada.", internalMaintenance: { connect: { id: newMaintenance.id } } };
    if (techId) logData.tech = { connect: { id: techId } };
    await prisma.internalMaintenanceLog.create({ data: logData });

    await createAuditLog({
      userEmail: session.user.email as string,
      action: "CRIAR",
      resource: "Bancada Interna",
      details: `Registrou manualmente um equipamento (${newMaintenance.deviceType.name}) do setor "${newMaintenance.originSector.name}" na bancada da TI.`,
    });

    await triggerUpdate('nova-demanda', { tipo: 'EQUIPAMENTO', setor: newMaintenance.originSector?.name || 'TI' });

    // 📧 E-MAIL PROFISSIONAL: QUANDO A TI REGISTRA O EQUIPAMENTO PARA O USUÁRIO
    if (newMaintenance.userEmail) {
      try {
        await sendProfessionalEmail({
          to: newMaintenance.userEmail,
          subject: `Ordem de Serviço Gerada: ${newMaintenance.deviceType.name}`,
          title: "Ordem de Serviço Registrada",
          greeting: `Olá, ${newMaintenance.equipmentUser}!`,
          message: "O equipamento foi recebido e registrado com sucesso em nossa bancada de TI. Você receberá atualizações automáticas sobre o andamento da manutenção.",
          ticketData: [
            { label: "Equipamento", value: newMaintenance.deviceType.name },
            { label: "Setor de Origem", value: newMaintenance.originSector.name },
            { label: "Problema Relatado", value: newMaintenance.reportedProblem },
            { label: "Status Inicial", value: "Pendente 🕒" }
          ]
        });
      } catch (error) { console.error("Erro email:", error); }
    }

    return NextResponse.json({ message: "Sucesso", maintenance: newMaintenance }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}