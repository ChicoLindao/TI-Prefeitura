import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createAuditLog } from "@/lib/logger";
import { triggerUpdate } from "@/lib/ws"; // <-- Importamos o WebSocket

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any).role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });

    if (userId === (session.user as any).id) {
       return NextResponse.json({ error: "Você não pode expulsar a si mesmo por aqui." }, { status: 400 });
    }

    const userTarget = await prisma.user.findUnique({ where: { id: userId } });
    if (!userTarget) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    await prisma.user.update({
      where: { id: userId },
      data: { forceLogoutAt: new Date() }
    });

    await createAuditLog({
      userEmail: session.user.email as string,
      action: "ATUALIZAR",
      resource: "Controle de Sessão",
      details: `Forçou a desconexão (logout) do usuário: ${userTarget.name} (${userTarget.email}).`
    });

    // 🔴 DISPARA O WEBSOCKET AVISANDO A REDE SOBRE A EXPULSÃO
    await triggerUpdate('nova-demanda', { tipo: 'FORCE_LOGOUT', alvoId: userId });

    return NextResponse.json({ success: true, message: "Sessão encerrada com sucesso." });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao encerrar sessão" }, { status: 500 });
  }
}