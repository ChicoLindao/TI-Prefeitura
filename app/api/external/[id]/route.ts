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
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });

  const currentUserRole = (session?.user as any)?.role;
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  const service = await prisma.externalService.findUnique({
    where: { id },
    include: { sector: true, techs: { select: { id: true, name: true, email: true } }, logs: { include: { tech: { select: { name: true } } }, orderBy: { createdAt: 'desc' } } }
  });
  const users = await prisma.user.findMany({ where: { NOT: { name: { contains: "(Inativo)" } } }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } });
  return NextResponse.json({ service, users, currentUserRole });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });

  const techId = (session?.user as any)?.id;
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const body = await req.json();

  if (body.actionType === "UPDATE_STATUS") {
    const updatedService = await prisma.externalService.update({ where: { id }, data: { status: body.status }, include: { sector: true } });
    const dataToSave: any = { description: `Status alterado para ${body.status.replace(/_/g, ' ')}`, type: "SISTEMA", externalService: { connect: { id } } };
    if (techId) dataToSave.tech = { connect: { id: techId } };
    await prisma.externalServiceLog.create({ data: dataToSave });

    await createAuditLog({
      userEmail: session.user.email as string,
      action: "ATUALIZAR",
      resource: "Chamados Externos",
      details: `Alterou o status do chamado do setor "${updatedService.sector.name}" para: ${body.status.replace(/_/g, ' ')}`,
    });

    await triggerUpdate('nova-demanda', { tipo: 'CHAMADO', setor: 'Status Atualizado' });

    if (updatedService.userEmail) {
      try {
        await sendProfessionalEmail({
          to: updatedService.userEmail,
          subject: `Atualização no Chamado: ${updatedService.sector.name}`,
          title: "Status Atualizado",
          greeting: "Olá!",
          message: "O status da sua solicitação de atendimento foi modificado pela nossa equipe.",
          ticketData: [
            { label: "Setor", value: updatedService.sector.name },
            { label: "Novo Status", value: body.status.replace(/_/g, ' ') }
          ]
        });
      } catch (e) {}
    }
  }

  if (body.actionType === "ADD_LOG") {
    const dataToSave: any = { description: body.logText, type: "MANUAL", externalService: { connect: { id } } };
    if (techId) dataToSave.tech = { connect: { id: techId } };
    await prisma.externalServiceLog.create({ data: dataToSave });

    const srv = await prisma.externalService.findUnique({ where: { id }, include: { sector: true } });
    
    if (srv) {
      await createAuditLog({
        userEmail: session.user.email as string,
        action: "ATUALIZAR",
        resource: "Chamados Externos (Histórico)",
        details: `Adicionou um histórico no chamado do setor "${srv.sector.name}": "${body.logText}"`,
      });
    }

    await triggerUpdate('nova-demanda', { tipo: 'CHAMADO', setor: 'Novo Histórico' });

    if (srv?.userEmail) {
      try {
        await sendProfessionalEmail({
          to: srv.userEmail,
          subject: `Nova Atividade no Chamado: ${srv.sector.name}`,
          title: "Novo Histórico Adicionado",
          greeting: "Olá!",
          message: "Um técnico da equipe adicionou uma nova mensagem ou atividade no seu chamado.",
          ticketData: [
            { label: "Mensagem do Técnico", value: body.logText }
          ]
        });
      } catch (e) {}
    }
  }

  if (body.actionType === "UPDATE_TECHS") {
    await prisma.externalService.update({ where: { id }, data: { techs: { set: body.techIds.map((tId: string) => ({ id: tId })) } } });
    await triggerUpdate('nova-demanda', { tipo: 'CHAMADO', setor: 'Técnico Atribuído' });

    const srv = await prisma.externalService.findUnique({ where: { id }, include: { sector: true }});
    
    if (srv) {
      await createAuditLog({
        userEmail: session.user.email as string,
        action: "ATUALIZAR",
        resource: "Chamados Externos (Técnicos)",
        details: `Modificou a lista de técnicos responsáveis pelo chamado do setor "${srv.sector.name}".`,
      });
    }

    if (body.addedTechId) {
      const tech = await prisma.user.findUnique({ where: { id: body.addedTechId } });
      
      // 📧 E-MAIL PARA O TÉCNICO
      if (tech?.email && srv) {
        try {
          await sendProfessionalEmail({
            to: tech.email,
            subject: `Novo Atendimento Atribuído: ${srv.sector.name}`,
            title: "Atendimento Designado",
            greeting: `Olá, ${tech.name}!`,
            message: `Você foi marcado como responsável por um chamado externo da TI. Por favor, acesse o painel para verificar os detalhes.`,
            ticketData: [
              { label: "Setor do Chamado", value: srv.sector.name }
            ],
            buttonText: "Acessar Atendimento",
            buttonLink: `${process.env.NEXTAUTH_URL}/dashboard/external/${id}` // Botão para o técnico abrir o chamado
          });
        } catch (e) {}
      }
      
      // 📧 E-MAIL PARA O SOLICITANTE
      if (srv?.userEmail && tech) {
        try {
          await sendProfessionalEmail({
            to: srv.userEmail,
            subject: `Técnico Designado: ${srv.sector.name}`,
            title: "Atendimento em Andamento",
            greeting: "Olá!",
            message: "O seu chamado já foi visualizado e um técnico responsável acaba de ser atribuído para a resolução.",
            ticketData: [
              { label: "Setor", value: srv.sector.name },
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
    const srv = await prisma.externalService.findUnique({ where: { id: resolvedParams.id }, include: { sector: true } });
    
    await prisma.externalService.delete({ where: { id: resolvedParams.id } });
    
    if (srv) {
      await createAuditLog({
        userEmail: session!.user!.email as string,
        action: "DELETAR",
        resource: "Chamados Externos",
        details: `Excluiu definitivamente o chamado do setor "${srv.sector.name}".`,
      });
    }

    await triggerUpdate('nova-demanda', { tipo: 'CHAMADO', setor: 'Chamado Excluído' });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Erro" }, { status: 500 }); }
}