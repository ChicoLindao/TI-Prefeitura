import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createAuditLog } from "@/lib/logger"; // <-- Importação do Log

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    try {
      await prisma.internalMaintenanceLog.delete({ where: { id } });
      
      // 🔴 REGISTRO NO LOG DE AUDITORIA
      await createAuditLog({
        userEmail: session.user.email as string,
        action: "DELETAR",
        resource: "Histórico de OS",
        details: `Apagou uma mensagem do histórico de um Equipamento na Bancada.`,
      });

      return NextResponse.json({ message: "Histórico interno apagado!" }, { status: 200 });
    } catch (e) {
      await prisma.externalServiceLog.delete({ where: { id } });

      // 🔴 REGISTRO NO LOG DE AUDITORIA
      await createAuditLog({
        userEmail: session.user.email as string,
        action: "DELETAR",
        resource: "Histórico de OS",
        details: `Apagou uma mensagem do histórico de um Chamado Externo.`,
      });

      return NextResponse.json({ message: "Histórico externo apagado!" }, { status: 200 });
    }
  } catch (error) { return NextResponse.json({ error: "Erro ao apagar." }, { status: 500 }); }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await req.json();
    const { text } = body;

    try {
      await prisma.internalMaintenanceLog.update({ where: { id }, data: { action: text } });
      
      // 🔴 REGISTRO NO LOG DE AUDITORIA
      await createAuditLog({
        userEmail: session.user.email as string,
        action: "ATUALIZAR",
        resource: "Histórico de OS",
        details: `Editou uma mensagem no histórico de um Equipamento na Bancada para: "${text}"`,
      });

      return NextResponse.json({ success: true });
    } catch (e) {
      await prisma.externalServiceLog.update({ where: { id }, data: { description: text } });

      // 🔴 REGISTRO NO LOG DE AUDITORIA
      await createAuditLog({
        userEmail: session.user.email as string,
        action: "ATUALIZAR",
        resource: "Histórico de OS",
        details: `Editou uma mensagem no histórico de um Chamado Externo para: "${text}"`,
      });

      return NextResponse.json({ success: true });
    }
  } catch (error) { return NextResponse.json({ error: "Erro ao atualizar." }, { status: 500 }); }
}