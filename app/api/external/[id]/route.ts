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
    include: { sector: true, techs: { select: { id: true, name: true, email: true } }, logs: { include: { tech: { select: { name: true } } }, orderBy: { createdAt: 'desc' } } }
  });
  const users = await prisma.user.findMany({ where: { NOT: { name: { contains: "(Inativo)" } } }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } });
  return NextResponse.json({ service, users, currentUserRole });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const techId = (session?.user as any)?.id;
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const body = await req.json();

  const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });

  if (body.actionType === "UPDATE_STATUS") {
    const updatedService = await prisma.externalService.update({ where: { id }, data: { status: body.status }, include: { sector: true } });
    const dataToSave: any = { description: `Status alterado para ${body.status.replace(/_/g, ' ')}`, type: "SISTEMA", externalService: { connect: { id } } };
    if (techId) dataToSave.tech = { connect: { id: techId } };
    await prisma.externalServiceLog.create({ data: dataToSave });
    await triggerUpdate('nova-demanda', { tipo: 'CHAMADO', setor: 'Status Atualizado' });

    if (updatedService.userEmail) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: updatedService.userEmail,
          subject: `Atualização no Chamado: ${updatedService.sector.name}`,
          html: `<h3>Seu chamado foi atualizado!</h3><p>O novo status do seu atendimento é: <strong>${body.status.replace(/_/g, ' ')}</strong></p>`
        });
      } catch (e) {}
    }
  }

  if (body.actionType === "ADD_LOG") {
    const dataToSave: any = { description: body.logText, type: "MANUAL", externalService: { connect: { id } } };
    if (techId) dataToSave.tech = { connect: { id: techId } };
    await prisma.externalServiceLog.create({ data: dataToSave });
    await triggerUpdate('nova-demanda', { tipo: 'CHAMADO', setor: 'Novo Histórico' });

    // 📧 E-MAIL: QUANDO UM NOVO HISTÓRICO É ADICIONADO
    const srv = await prisma.externalService.findUnique({ where: { id }, include: { sector: true } });
    if (srv?.userEmail) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: srv.userEmail,
          subject: `Nova Atividade no Chamado: ${srv.sector.name}`,
          html: `<h3>Nova atualização registrada!</h3><p>A equipe de TI adicionou uma nova atividade ao seu chamado:</p><blockquote style="background:#f4f4f5; padding:10px; border-left:4px solid #3b82f6;">${body.logText}</blockquote>`
        });
      } catch (e) {}
    }
  }

  if (body.actionType === "UPDATE_TECHS") {
    await prisma.externalService.update({ where: { id }, data: { techs: { set: body.techIds.map((tId: string) => ({ id: tId })) } } });
    await triggerUpdate('nova-demanda', { tipo: 'CHAMADO', setor: 'Técnico Atribuído' });

    const srv = await prisma.externalService.findUnique({ where: { id }, include: { sector: true }});
    
    if (body.addedTechId) {
      const tech = await prisma.user.findUnique({ where: { id: body.addedTechId } });
      
      // 📧 E-MAIL PARA O TÉCNICO
      if (tech?.email && srv) {
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: tech.email,
            subject: `Novo Atendimento Externo: ${srv.sector.name}`,
            html: `<h3>Você foi designado para um atendimento!</h3><p><a href="${process.env.NEXTAUTH_URL}/dashboard/external/${id}">Acessar Atendimento</a></p>`
          });
        } catch (e) {}
      }
      
      // 📧 E-MAIL PARA O SOLICITANTE
      if (srv?.userEmail && tech) {
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: srv.userEmail,
            subject: `Técnico Designado: ${srv.sector.name}`,
            html: `<h3>Seu chamado está em andamento!</h3><p>O técnico <strong>${tech.name}</strong> assumiu o seu atendimento e está trabalhando nele.</p>`
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
    await prisma.externalService.delete({ where: { id: (await params).id } });
    await triggerUpdate('nova-demanda', { tipo: 'CHAMADO', setor: 'Chamado Excluído' });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Erro" }, { status: 500 }); }
}