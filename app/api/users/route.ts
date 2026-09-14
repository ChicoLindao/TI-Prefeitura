import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      // Esta linha esconde qualquer usuário que tenha "Inativo" no nome
      where: { NOT: { name: { contains: "(Inativo)" } } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" }
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar usuários" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, email, role } = await req.json();
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return NextResponse.json({ error: "E-mail já em uso." }, { status: 400 });
    
    const hashedPassword = await bcrypt.hash("suporteTI@2025", 10);
    await prisma.user.create({ data: { name, email, password: hashedPassword, role } });
    
    return NextResponse.json({ message: "Criado com sucesso!" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao criar usuário" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, name, email, role, resetPassword } = await req.json();
    let updateData: any = { name, email, role };
    
    if (resetPassword) {
      updateData.password = await bcrypt.hash("suporteTI@2025", 10);
    }
    
    await prisma.user.update({ where: { id }, data: updateData });
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

    // 1. EXTRAÇÃO CORRETA: Lendo parâmetros da URL, sem exigir req.json()
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID do usuário não fornecido." }, { status: 400 });
    }

    // Evita o suicídio digital do Admin
    if (id === currentUser.id) {
      return NextResponse.json({ error: "Operação bloqueada: Impossível excluir a própria conta." }, { status: 400 });
    }

    // 2. LÓGICA DE EXCLUSÃO COM PRESERVAÇÃO RELACIONAL (Graceful Fallback)
    try {
      // Tenta fazer o Hard Delete (apagar de fato do banco)
      await prisma.user.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Usuário removido definitivamente do sistema." });
      
    } catch (dbError: any) {
      // P2003 = Erro de Foreign Key Constraint no Prisma. Significa que o usuário tem histórico vinculado.
      if (dbError.code === 'P2003') {
        const userToInactivate = await prisma.user.findUnique({ where: { id } });
        
        if (userToInactivate && !userToInactivate.name.includes("(Inativo)")) {
          // Faz o Soft Delete: Mantém no banco mas inativa o nome
          await prisma.user.update({
            where: { id },
            data: { name: `${userToInactivate.name} (Inativo)` }
          });
          return NextResponse.json({ success: true, message: "Usuário inativado para preservação do histórico de chamados." });
        }
        
        return NextResponse.json({ success: true, message: "Usuário já se encontra inativo no sistema." });
      }
      
      // Se não for um erro de relacionamento, joga pro catch principal
      throw dbError; 
    }

  } catch (error) {
    console.error("❌ [API USERS] Falha crítica ao processar DELETE:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}