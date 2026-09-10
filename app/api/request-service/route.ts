import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Busca apenas os setores ativos para preencher a caixinha de seleção
export async function GET() {
  try {
    const sectors = await prisma.sector.findMany({
      where: { NOT: { name: { contains: "(Inativo)" } } },
      orderBy: { name: "asc" }
    });
    return NextResponse.json(sectors);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar setores" }, { status: 500 });
  }
}

// POST: Recebe os dados do formulário público e cria o chamado
export async function POST(req: Request) {
  try {
    const { sectorId, personAttended, userEmail, description } = await req.json();

    await prisma.externalService.create({
      data: {
        sectorId,
        personAttended,
        userEmail,
        description,
        status: "PENDENTE" // Entra automaticamente na fila
      }
    });

    return NextResponse.json({ message: "Chamado aberto com sucesso!" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao abrir chamado" }, { status: 500 });
  }
}