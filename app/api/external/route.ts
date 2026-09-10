import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Busca os chamados incluindo o nome do setor e a lista de técnicos
    const services = await prisma.externalService.findMany({
      include: {
        sector: true,
        techs: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Busca os setores para popular o formulário interno
    const sectors = await prisma.sector.findMany({ orderBy: { name: 'asc' } });
    
    return NextResponse.json({ services, sectors });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar atendimentos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { sectorId, personAttended, userEmail, description } = await req.json();
    
    const newService = await prisma.externalService.create({
      data: {
        sectorId,
        personAttended,
        userEmail,
        description,
        status: "PENDENTE"
      }
    });

    return NextResponse.json(newService, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao criar atendimento interno" }, { status: 500 });
  }
}