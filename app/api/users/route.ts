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
    const loggedInUserId = (session?.user as any)?.id;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id === loggedInUserId) {
      return NextResponse.json({ error: "Você não pode apagar a si mesmo!" }, { status: 400 });
    }
    
    // Como a relação com os chamados é N:N, o Prisma permite deletar o usuário.
    // Ele vai apenas remover este usuário das listas de técnicos dos chamados, 
    // mas não vai apagar os chamados em si.
    await prisma.user.delete({ where: { id: id! } });
    
    return NextResponse.json({ message: "Removido!" }, { status: 200 });
  } catch (error) {
    console.error("ERRO AO EXCLUIR USUÁRIO:", error);
    return NextResponse.json({ error: "Erro ao remover" }, { status: 500 });
  }
}