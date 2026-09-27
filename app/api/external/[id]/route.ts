export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { triggerUpdate } from "@/lib/ws";
import { createAuditLog } from "@/lib/logger"; 
import { sendProfessionalEmail } from "@/lib/mailer";

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
    // 🔴 FORMATA O STATUS PARA FICAR BONITO (Ex: EM_ANDAMENTO -> Em Andamento)
    const formattedStatus = body.status.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

    const updatedService = await prisma.externalService.update({ where: { id }, data: { status: body.status }, include: { sector: true } });
    
    const dataToSave: any = { description: `Status alterado para ${formattedStatus}`, type: "SISTEMA", externalService: { connect: { id } } };
    if (techId) dataToSave.tech = { connect: { id: techId } };
    await prisma.externalServiceLog.create({ data: dataToSave });

    await createAuditLog({
      userEmail: session.user.email as string,
      action: "ATUALIZAR",
      resource: "Chamados Externos",
      details: `Alterou o status do chamado do setor "${updatedService.sector.name}" para: ${formattedStatus}`,
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
            { label: "Novo Status", value: formattedStatus }
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
    // 🔴 LÓGICA INTELIGENTE DE COMPARAÇÃO
    const oldRecord = await prisma.externalService.findUnique({ where: { id }, include: { techs: true, sector: true }});
    const oldTechIds = oldRecord?.techs.map((t: any) => t.id) || [];
    const newTechIds = body.techIds || [];

    const added = newTechIds.filter((tId: string) => !oldTechIds.includes(tId));
    const removed = oldTechIds.filter((tId: string) => !newTechIds.includes(tId));

    let wsMessage = 'Técnicos Atualizados';
    if (added.length > 0 && removed.length === 0) wsMessage = 'Técnico Atribuído';
    else if (removed.length > 0 && added.length === 0) wsMessage = 'Técnico Removido';

    await prisma.externalService.update({ where: { id }, data: { techs: { set: newTechIds.map((tId: string) => ({ id: tId })) } } });
    await triggerUpdate('nova-demanda', { tipo: 'CHAMADO', setor: wsMessage });

    if (oldRecord) {
      await createAuditLog({
        userEmail: session.user.email as string,
        action: "ATUALIZAR",
        resource: "Chamados Externos (Técnicos)",
        details: `Modificou a lista de técnicos responsáveis pelo chamado do setor "${oldRecord.sector.name}".`,
      });
    }

    // Se adicionou alguém, manda e-mail
    if (added.length > 0) {
      const tech = await prisma.user.findUnique({ where: { id: added[0] } });
      
      if (tech?.email && oldRecord) {
        try {
          await sendProfessionalEmail({
            to: tech.email,
            subject: `Novo Atendimento Atribuído: ${oldRecord.sector.name}`,
            title: "Atendimento Designado",
            greeting: `Olá, ${tech.name}!`,
            message: `Você foi marcado como responsável por um chamado externo. Por favor, acesse o painel para verificar os detalhes.`,
            ticketData: [
              { label: "Setor do Chamado", value: oldRecord.sector.name },
              { label: "Utilizador", value: oldRecord.personAttended || "Não informado" },
              { label: "Problema Relatado", value: oldRecord.description || "Não informado" }
            ],
            buttonText: "Acessar Atendimento",
            buttonLink: `${process.env.NEXTAUTH_URL}/dashboard/external/${id}` 
          });
        } catch (e) {}
      }
      
      if (oldRecord?.userEmail && tech) {
        try {
          await sendProfessionalEmail({
            to: oldRecord.userEmail,
            subject: `Técnico Designado: ${oldRecord.sector.name}`,
            title: "Atendimento em Andamento",
            greeting: "Olá!",
            message: "O seu chamado já foi visualizado e um técnico responsável acaba de ser atribuído para a resolução.",
            ticketData: [
              { label: "Setor", value: oldRecord.sector.name },
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