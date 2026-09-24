export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { triggerUpdate } from "@/lib/ws";
import { createAuditLog } from "@/lib/logger"; 
import { sendProfessionalEmail } from "@/lib/mailer"; // 🔴 IMPORTAÇÃO DO NOVO MAILER

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

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
  if (!session || !session.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const techId = (session?.user as any)?.id;
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const body = await req.json();

  if (body.actionType === "UPDATE_STATUS") {
    const updatedMaint = await prisma.internalMaintenance.update({ where: { id }, data: { status: body.status }, include: { deviceType: true } });
    const dataToSave: any = { action: `Status alterado para ${body.status.replace(/_/g, ' ')}`, internalMaintenance: { connect: { id } } };
    if (techId) dataToSave.tech = { connect: { id: techId } };
    await prisma.internalMaintenanceLog.create({ data: dataToSave });
    
    await createAuditLog({
      userEmail: session.user.email as string,
      action: "ATUALIZAR",
      resource: "Bancada Interna",
      details: `Alterou o status do equipamento "${updatedMaint.deviceType.name}" para: ${body.status.replace(/_/g, ' ')}`,
    });

    await triggerUpdate('nova-demanda', { tipo: 'EQUIPAMENTO', setor: 'Status Atualizado' });

    if (updatedMaint.userEmail) {
      try {
        await sendProfessionalEmail({
          to: updatedMaint.userEmail,
          subject: `Atualização no Equipamento: ${updatedMaint.deviceType.name}`,
          title: "Status da OS Atualizado",
          greeting: "Olá!",
          message: "O status da Ordem de Serviço do seu equipamento foi modificado pela nossa equipe na bancada.",
          ticketData: [
            { label: "Equipamento", value: updatedMaint.deviceType.name },
            { label: "Novo Status", value: body.status.replace(/_/g, ' ') }
          ]
        });
      } catch (e) {}
    }
  }

  if (body.actionType === "ADD_ACTION") {
    const dataToSave: any = { action: body.actionText, internalMaintenance: { connect: { id } } };
    if (techId) dataToSave.tech = { connect: { id: techId } };
    await prisma.internalMaintenanceLog.create({ data: dataToSave });

    const maint = await prisma.internalMaintenance.findUnique({ where: { id }, include: { deviceType: true } });
    
    if (maint) {
      await createAuditLog({
        userEmail: session.user.email as string,
        action: "ATUALIZAR",
        resource: "Bancada Interna (Histórico)",
        details: `Adicionou um histórico na OS do equipamento "${maint.deviceType.name}": "${body.actionText}"`,
      });
    }

    await triggerUpdate('nova-demanda', { tipo: 'EQUIPAMENTO', setor: 'Novo Histórico' });

    if (maint?.userEmail) {
      try {
        await sendProfessionalEmail({
          to: maint.userEmail,
          subject: `Nova Atividade no Equipamento: ${maint.deviceType.name}`,
          title: "Nova Atividade Registrada",
          greeting: "Olá!",
          message: "A equipe de TI adicionou uma nova atividade ou observação à Ordem de Serviço do seu equipamento.",
          ticketData: [
            { label: "Atividade Realizada", value: body.actionText }
          ]
        });
      } catch (e) {}
    }
  }

  if (body.actionType === "UPDATE_TECHS") {
    await prisma.internalMaintenance.update({ where: { id }, data: { techs: { set: body.techIds.map((tId: string) => ({ id: tId })) } } });
    await triggerUpdate('nova-demanda', { tipo: 'EQUIPAMENTO', setor: 'Técnico Atribuído' });

    const maint = await prisma.internalMaintenance.findUnique({ where: { id }, include: { deviceType: true, originSector: true }});
    
    if (maint) {
      await createAuditLog({
        userEmail: session.user.email as string,
        action: "ATUALIZAR",
        resource: "Bancada Interna (Técnicos)",
        details: `Modificou a lista de técnicos responsáveis pelo equipamento "${maint.deviceType.name}".`,
      });
    }

    if (body.addedTechId) {
      const tech = await prisma.user.findUnique({ where: { id: body.addedTechId } });
      
      // 📧 E-MAIL PARA O TÉCNICO
      if (tech?.email && maint) {
        try {
          await sendProfessionalEmail({
            to: tech.email,
            subject: `Nova OS: ${maint.deviceType.name}`,
            title: "Ordem de Serviço Designada",
            greeting: `Olá, ${tech.name}!`,
            message: "Você foi marcado como responsável pela manutenção de um equipamento na bancada. Por favor, acesse o painel para verificar os detalhes.",
            ticketData: [
              { label: "Equipamento", value: maint.deviceType.name },
              { label: "Setor de Origem", value: maint.originSector.name }
            ],
            buttonText: "Acessar Ordem de Serviço",
            buttonLink: `${process.env.NEXTAUTH_URL}/dashboard/internal/${id}`
          });
        } catch (e) {}
      }

      // 📧 E-MAIL PARA O SOLICITANTE
      if (maint?.userEmail && tech) {
        try {
          await sendProfessionalEmail({
            to: maint.userEmail,
            subject: `Técnico Designado: ${maint.deviceType.name}`,
            title: "Manutenção em Andamento",
            greeting: "Olá!",
            message: "A Ordem de Serviço do seu equipamento já foi assumida e um técnico acaba de ser atribuído para a manutenção.",
            ticketData: [
              { label: "Equipamento", value: maint.deviceType.name },
              { label: "Técnico Responsável", value: tech.name }
            ]
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
    const resolvedParams = await params;
    
    const maint = await prisma.internalMaintenance.findUnique({ where: { id: resolvedParams.id }, include: { deviceType: true } });
    
    await prisma.internalMaintenance.delete({ where: { id: resolvedParams.id } });
    
    if (maint) {
      await createAuditLog({
        userEmail: session!.user!.email as string,
        action: "DELETAR",
        resource: "Bancada Interna",
        details: `Excluiu definitivamente a OS do equipamento "${maint.deviceType.name}".`,
      });
    }

    await triggerUpdate('nova-demanda', { tipo: 'EQUIPAMENTO', setor: 'OS Excluída' });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Erro" }, { status: 500 }); }
}