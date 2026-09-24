import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createAuditLog } from "@/lib/logger"; // <-- Importação do log

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const userId = (session.user as any).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true }
  });

  return NextResponse.json(user);
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    
    const userId = (session.user as any).id;
    const { name, email, password } = await req.json();
    
    let updateData: any = { name, email };
    
    // Se o usuário digitou uma senha nova, criptografa e salva
    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    await prisma.user.update({ where: { id: userId }, data: updateData });

    // 🔴 REGISTRO NO LOG
    await createAuditLog({
      userEmail: session.user.email as string,
      action: "ATUALIZAR",
      resource: "Meu Perfil",
      details: `Atualizou os dados do próprio perfil. ${password && password.trim() !== "" ? "[Senha Alterada]" : ""}`,
    });

    return NextResponse.json({ message: "Perfil atualizado com sucesso!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Erro na atualização" }, { status: 500 });
  }
}