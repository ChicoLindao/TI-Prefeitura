export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { triggerUpdate } from "@/lib/ws";

export async function GET() {
  try {
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

    await triggerUpdate('nova-demanda', { tipo: 'EQUIPAMENTO', setor: newMaintenance.originSector?.name || 'TI' });

    // 📧 E-MAIL: QUANDO A TI REGISTRA O EQUIPAMENTO PARA O USUÁRIO
    if (newMaintenance.userEmail) {
      try {
        const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: newMaintenance.userEmail,
          subject: `Ordem de Serviço Gerada: ${newMaintenance.deviceType.name}`,
          html: `<h3>Olá, ${newMaintenance.equipmentUser}!</h3>
                 <p>O equipamento <strong>${newMaintenance.deviceType.name}</strong> do setor <strong>${newMaintenance.originSector.name}</strong> foi registrado em nossa bancada de TI.</p>
                 <p><strong>Problema relatado:</strong> ${newMaintenance.reportedProblem}</p>
                 <p>Você será notificado por e-mail a cada atualização.</p>`
        });
      } catch (error) { console.error("Erro email:", error); }
    }

    return NextResponse.json({ message: "Sucesso", maintenance: newMaintenance }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}