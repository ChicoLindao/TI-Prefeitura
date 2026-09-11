export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const currentUserRole = (session?.user as any)?.role;

  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  const maintenance = await prisma.internalMaintenance.findUnique({
    where: { id },
    include: {
      deviceType: true,
      originSector: true,
      techs: { select: { id: true, name: true, email: true } },
      logs: { include: { tech: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }
    }
  });

  const users = await prisma.user.findMany({
    where: { NOT: { name: { contains: "(Inativo)" } } },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' }
  });
  
  return NextResponse.json({ maintenance, users, currentUserRole });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const techId = user?.id;
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const body = await req.json();

  if (body.actionType === "UPDATE_STATUS") {
    const updatedMaint = await prisma.internalMaintenance.update({ 
      where: { id }, 
      data: { status: body.status },
      include: { deviceType: true }
    });

    const dataToSave: any = { action: `Status alterado para ${body.status.replace(/_/g, ' ')}`, internalMaintenance: { connect: { id } } };
    if (techId) dataToSave.tech = { connect: { id: techId } };
    await prisma.internalMaintenanceLog.create({ data: dataToSave });

    // Envia e-mail para o usuário (solicitante)
    if (updatedMaint.userEmail) {
      try {
        const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
        transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: updatedMaint.userEmail,
          subject: `Atualização na Bancada: ${updatedMaint.deviceType.name}`,
          html: `<h3>O status do seu equipamento mudou!</h3>
                 <p>O equipamento que está na bancada agora consta como: <strong>${body.status.replace(/_/g, ' ')}</strong></p>
                 <p>Você pode acompanhar o andamento no painel principal do TI.</p>`
        }).catch(err => console.log("Erro no e-mail do usuário:", err));
      } catch (error) { console.error("Erro ao configurar email:", error); }
    }
  }

  if (body.actionType === "ADD_ACTION") {
    const dataToSave: any = { action: body.actionText, internalMaintenance: { connect: { id } } };
    if (techId) dataToSave.tech = { connect: { id: techId } };
    await prisma.internalMaintenanceLog.create({ data: dataToSave });
  }

  if (body.actionType === "UPDATE_TECHS") {
    await prisma.internalMaintenance.update({
      where: { id },
      data: { techs: { set: body.techIds.map((tId: string) => ({ id: tId })) } }
    });
    if (body.addedTechId) {
      const tech = await prisma.user.findUnique({ where: { id: body.addedTechId } });
      const maint = await prisma.internalMaintenance.findUnique({ where: { id }, include: { deviceType: true, originSector: true }});
      if (tech?.email && maint) {
        try {
          const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
          transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: tech.email,
            subject: `Novo Chamado na Bancada: ${maint.deviceType.name}`,
            html: `<h3>Você foi designado para um equipamento!</h3><p><a href="${process.env.NEXTAUTH_URL}/dashboard/internal/${id}">Acessar Chamado no Sistema</a></p>`
          }).catch(err => console.log("Erro no e-mail:", err));
        } catch (error) { console.error("Erro ao enviar email:", error); }
      }
    }
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (user?.role !== "ADMINISTRADOR") return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const resolvedParams = await params;
  const id = resolvedParams.id;
  try {
    await prisma.internalMaintenance.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}