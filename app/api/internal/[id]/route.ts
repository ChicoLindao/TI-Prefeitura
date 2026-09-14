export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { triggerUpdate } from "@/lib/ws";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const currentUserRole = (session?.user as any)?.role;
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  const maintenance = await prisma.internalMaintenance.findUnique({
    where: { id },
    include: { deviceType: true, originSector: true, techs: { select: { id: true, name: true, email: true } }, logs: { include: { tech: { select: { name: true } } }, orderBy: { createdAt: 'desc' } } }
  });
  const users = await prisma.user.findMany({ where: { NOT: { name: { contains: "(Inativo)" } } }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } });
  return NextResponse.json({ maintenance, users, currentUserRole });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const techId = (session?.user as any)?.id;
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const body = await req.json();

  const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });

  if (body.actionType === "UPDATE_STATUS") {
    const updatedMaint = await prisma.internalMaintenance.update({ where: { id }, data: { status: body.status }, include: { deviceType: true } });
    const dataToSave: any = { action: `Status alterado para ${body.status.replace(/_/g, ' ')}`, internalMaintenance: { connect: { id } } };
    if (techId) dataToSave.tech = { connect: { id: techId } };
    await prisma.internalMaintenanceLog.create({ data: dataToSave });
    await triggerUpdate('nova-demanda', { tipo: 'EQUIPAMENTO', setor: 'Status Atualizado' });

    if (updatedMaint.userEmail) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: updatedMaint.userEmail,
          subject: `Atualização no Equipamento: ${updatedMaint.deviceType.name}`,
          html: `<h3>O status do seu equipamento mudou!</h3><p>A Ordem de Serviço do seu equipamento consta agora como: <strong>${body.status.replace(/_/g, ' ')}</strong></p>`
        });
      } catch (e) {}
    }
  }

  if (body.actionType === "ADD_ACTION") {
    const dataToSave: any = { action: body.actionText, internalMaintenance: { connect: { id } } };
    if (techId) dataToSave.tech = { connect: { id: techId } };
    await prisma.internalMaintenanceLog.create({ data: dataToSave });
    await triggerUpdate('nova-demanda', { tipo: 'EQUIPAMENTO', setor: 'Novo Histórico' });

    // 📧 E-MAIL: QUANDO UM NOVO HISTÓRICO É ADICIONADO NA OS
    const maint = await prisma.internalMaintenance.findUnique({ where: { id }, include: { deviceType: true } });
    if (maint?.userEmail) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: maint.userEmail,
          subject: `Nova Atividade no Equipamento: ${maint.deviceType.name}`,
          html: `<h3>Nova atualização registrada!</h3><p>A equipe de TI adicionou uma nova atividade à Ordem de Serviço do seu equipamento:</p><blockquote style="background:#f4f4f5; padding:10px; border-left:4px solid #10b981;">${body.actionText}</blockquote>`
        });
      } catch (e) {}
    }
  }

  if (body.actionType === "UPDATE_TECHS") {
    await prisma.internalMaintenance.update({ where: { id }, data: { techs: { set: body.techIds.map((tId: string) => ({ id: tId })) } } });
    await triggerUpdate('nova-demanda', { tipo: 'EQUIPAMENTO', setor: 'Técnico Atribuído' });

    const maint = await prisma.internalMaintenance.findUnique({ where: { id }, include: { deviceType: true, originSector: true }});
    
    if (body.addedTechId) {
      const tech = await prisma.user.findUnique({ where: { id: body.addedTechId } });
      
      // 📧 E-MAIL PARA O TÉCNICO
      if (tech?.email && maint) {
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: tech.email,
            subject: `Nova OS na Bancada: ${maint.deviceType.name}`,
            html: `<h3>Você foi designado para um equipamento!</h3><p><a href="${process.env.NEXTAUTH_URL}/dashboard/internal/${id}">Acessar Ordem de Serviço</a></p>`
          });
        } catch (e) {}
      }

      // 📧 E-MAIL PARA O SOLICITANTE
      if (maint?.userEmail && tech) {
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: maint.userEmail,
            subject: `Técnico Designado: ${maint.deviceType.name}`,
            html: `<h3>Sua Ordem de Serviço está em andamento!</h3><p>O técnico <strong>${tech.name}</strong> assumiu a manutenção do seu equipamento e está trabalhando nele.</p>`
          });
        } catch (e) {}
      }
    }
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMINISTRADOR") return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  try {
    await prisma.internalMaintenance.delete({ where: { id: (await params).id } });
    await triggerUpdate('nova-demanda', { tipo: 'EQUIPAMENTO', setor: 'OS Excluída' });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Erro" }, { status: 500 }); }
}