import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { triggerUpdate } from "@/lib/ws";

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

    // 🔥 GATILHO REMOVIDO DAQUI (Não atira mais ao carregar a página)
    
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
      },
      include: { sector: true } // Incluído para pegar o nome do setor para o aviso
    });

    // 🔥 GATILHO ADICIONADO AQUI: Dispara apenas quando o técnico clica em criar!
    await triggerUpdate('nova-demanda', { tipo: 'CHAMADO', setor: newService.sector?.name || 'TI' });

    return NextResponse.json(newService, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao criar atendimento interno" }, { status: 500 });
  }
}