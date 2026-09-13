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
  
  const service = await prisma.externalService.findUnique({
    where: { id },
    include: {
      sector: true,
      techs: { select: { id: true, name: true, email: true } },
      logs: { include: { tech: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }
    }
  });
  
  const users = await prisma.user.findMany({
    where: { NOT: { name: { contains: "(Inativo)" } } },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' }
  });
  
  return NextResponse.json({ service, users, currentUserRole });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const techId = user?.id;
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const body = await req.json();

  if (body.actionType === "UPDATE_STATUS") {
    const updatedService = await prisma.externalService.update({ 
      where: { id }, 
      data: { status: body.status },
      include: { sector: true }
    });

    const dataToSave: any = { description: `Status alterado para ${body.status.replace(/_/g, ' ')}`, type: "SISTEMA", externalService: { connect: { id } } };
    if (techId) dataToSave.tech = { connect: { id: techId } };
    await prisma.externalServiceLog.create({ data: dataToSave });

    // 🔥 GATILHO: Status do Chamado
    await triggerUpdate('nova-demanda', { tipo: 'CHAMADO', setor: 'Status Atualizado' });

    if (updatedService.userEmail) {
      try {
        const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
        transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: updatedService.userEmail,
          subject: `Atualização no Chamado: ${updatedService.sector.name}`,
          html: `<h3>Seu chamado foi atualizado!</h3>
                 <p>O novo status do seu atendimento é: <strong>${body.status.replace(/_/g, ' ')}</strong></p>
                 <p>Você pode acompanhar os detalhes acessando o painel principal do TI.</p>`
        }).catch(err => console.log("Erro no e-mail do usuário:", err));
      } catch (error) { console.error("Erro ao configurar email:", error); }
    }
  }

  if (body.actionType === "ADD_LOG") {
    const dataToSave: any = { description: body.logText, type: "MANUAL", externalService: { connect: { id } } };
    if (techId) dataToSave.tech = { connect: { id: techId } };
    await prisma.externalServiceLog.create({ data: dataToSave });

    // 🔥 GATILHO: Novo Histórico
    await triggerUpdate('nova-demanda', { tipo: 'CHAMADO', setor: 'Novo Histórico' });
  }

  if (body.actionType === "UPDATE_TECHS") {
    await prisma.externalService.update({
      where: { id },
      data: { techs: { set: body.techIds.map((tId: string) => ({ id: tId })) } }
    });

    // 🔥 GATILHO: Técnico Atribuído
    await triggerUpdate('nova-demanda', { tipo: 'CHAMADO', setor: 'Técnico Atribuído' });

    if (body.addedTechId) {
      const tech = await prisma.user.findUnique({ where: { id: body.addedTechId } });
      const srv = await prisma.externalService.findUnique({ where: { id }, include: { sector: true }});
      if (tech?.email && srv) {
        try {
          const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
          transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: tech.email,
            subject: `Novo Atendimento Externo: ${srv.sector.name}`,
            html: `<h3>Você foi designado para um atendimento externo!</h3><p><a href="${process.env.NEXTAUTH_URL}/dashboard/external/${id}">Acessar Atendimento no Sistema</a></p>`
          }).catch(err => console.log("Erro no e-mail:", err));
        } catch (error) { console.error("Erro ao configurar email:", error); }
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
    await prisma.externalService.delete({ where: { id } });

    // 🔥 GATILHO: Chamado Excluído (Para sumir da tela pública na hora)
    await triggerUpdate('nova-demanda', { tipo: 'CHAMADO', setor: 'Chamado Excluído' });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}