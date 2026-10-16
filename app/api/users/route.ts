import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createAuditLog } from "@/lib/logger";
import { triggerUpdate } from "@/lib/ws"; // 🔴 IMPORTAÇÃO DO WEBSOCKET ADICIONADA

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { NOT: { name: { contains: "(Inativo)" } } },
      select: { id: true, name: true, email: true, role: true, lastLogin: true, forceLogoutAt: true },
      orderBy: { name: "asc" }
    });

    const usersWithIp = await Promise.all(users.map(async (user) => {
      const lastLog = await prisma.auditLog.findFirst({
        where: { userEmail: user.email },
        orderBy: { createdAt: 'desc' },
        select: { ipAddress: true }
      });
      return { ...user, lastIp: lastLog?.ipAddress || "Desconhecido" };
    }));

    return NextResponse.json(usersWithIp);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar usuários" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
    }

    const { name, email, role } = await req.json();
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return NextResponse.json({ error: "E-mail já em uso." }, { status: 400 });
    
    const hashedPassword = await bcrypt.hash("adm@26pfm", 10);
    await prisma.user.create({ data: { name, email, password: hashedPassword, role } });
    
    await createAuditLog({
      userEmail: session.user.email as string,
      action: "CRIAR",
      resource: "Técnicos (Usuários)",
      details: `Criou um novo usuário: ${name} (${email}) com cargo de ${role}.`,
    });

    return NextResponse.json({ message: "Criado com sucesso!" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao criar usuário" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
    }

    const { id, name, email, role, resetPassword } = await req.json();
    let updateData: any = { name, email, role };
    const currentUser = session.user as any;
    
    if (resetPassword) {
      updateData.password = await bcrypt.hash("adm@26pfm", 10);
    }

    // 🔴 FORÇA O LOGOUT NO BANCO DE DADOS (Se não for o próprio admin alterando a si mesmo)
    if (id !== currentUser.id) {
      updateData.forceLogoutAt = new Date();
    }
    
    await prisma.user.update({ where: { id }, data: updateData });

    await createAuditLog({
      userEmail: currentUser.email as string,
      action: "ATUALIZAR",
      resource: "Técnicos (Usuários)",
      details: `Atualizou os dados do usuário: ${name} (${email}). ${resetPassword ? "[Senha Redefinida pelo Admin]" : ""}`,
    });

    // 🔴 GATILHO WEBSOCKET: Desconecta o utilizador instantaneamente na tela dele
    if (id !== currentUser.id) {
      await triggerUpdate('nova-demanda', { tipo: 'FORCE_LOGOUT', alvoId: id });
    }

    return NextResponse.json({ message: "Atualizado com sucesso!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Erro na atualização" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const currentUser = session?.user as any;

    if (currentUser?.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID do usuário não fornecido." }, { status: 400 });
    }

    if (id === currentUser.id) {
      return NextResponse.json({ error: "Operação bloqueada: Impossível excluir a própria conta." }, { status: 400 });
    }

    const userTarget = await prisma.user.findUnique({ where: { id } });
    if (!userTarget) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    try {
      await prisma.user.delete({ where: { id } });

      await createAuditLog({
        userEmail: currentUser.email,
        action: "DELETAR",
        resource: "Técnicos (Usuários)",
        details: `Removeu definitivamente o usuário do sistema: ${userTarget.name} (${userTarget.email}).`,
      });

      // 🔴 GATILHO WEBSOCKET: Excluiu? Desconecta na hora!
      await triggerUpdate('nova-demanda', { tipo: 'FORCE_LOGOUT', alvoId: id });

      return NextResponse.json({ success: true, message: "Usuário removido definitivamente do sistema." });
      
    } catch (dbError: any) {
      // Falha por Foreign Key (Histórico existe) -> Inativa o usuário
      if (dbError.code === 'P2003') {
        if (!userTarget.name.includes("(Inativo)")) {
          await prisma.user.update({
            where: { id },
            data: { 
              name: `${userTarget.name} (Inativo)`,
              forceLogoutAt: new Date() // Força logout no BD
            }
          });

          await createAuditLog({
            userEmail: currentUser.email,
            action: "DELETAR",
            resource: "Técnicos (Usuários)",
            details: `Inativou o usuário por possuir histórico de chamados: ${userTarget.name} (${userTarget.email}).`,
          });

          // 🔴 GATILHO WEBSOCKET: Inativou? Desconecta na hora também!
          await triggerUpdate('nova-demanda', { tipo: 'FORCE_LOGOUT', alvoId: id });

          return NextResponse.json({ success: true, message: "Usuário inativado para preservação do histórico de chamados." });
        }
        
        return NextResponse.json({ success: true, message: "Usuário já se encontra inativo no sistema." });
      }
      
      throw dbError; 
    }

  } catch (error) {
    console.error("❌ [API USERS] Falha crítica ao processar DELETE:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}