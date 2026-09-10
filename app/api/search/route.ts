export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const date = searchParams.get("date"); // Formato YYYY-MM-DD

  let extWhere: any = {};
  let intWhere: any = {};

  // 1. FILTRO DE TEXTO (Busca global em vários campos)
  if (q) {
    extWhere.OR = [
      { description: { contains: q, mode: 'insensitive' } },
      { personAttended: { contains: q, mode: 'insensitive' } },
      { sector: { name: { contains: q, mode: 'insensitive' } } }
    ];
    intWhere.OR = [
      { reportedProblem: { contains: q, mode: 'insensitive' } },
      { brand: { contains: q, mode: 'insensitive' } },
      { patrimony: { contains: q, mode: 'insensitive' } },
      { equipmentUser: { contains: q, mode: 'insensitive' } },
      { originSector: { name: { contains: q, mode: 'insensitive' } } },
      { deviceType: { name: { contains: q, mode: 'insensitive' } } }
    ];
  }

  // 2. FILTRO DE CALENDÁRIO (Busca se foi criado NO DIA ou se teve algum LOG NO DIA)
  if (date) {
    const [y, m, d] = date.split('-');
    // Pega do primeiro segundo ao último segundo do dia selecionado
    const start = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0);
    const end = new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999);

    const dateFilterExt = {
      OR: [
        { createdAt: { gte: start, lte: end } },
        { logs: { some: { createdAt: { gte: start, lte: end } } } }
      ]
    };

    const dateFilterInt = {
      OR: [
        { receiveDate: { gte: start, lte: end } },
        { logs: { some: { createdAt: { gte: start, lte: end } } } }
      ]
    };

    // Junta o filtro de texto com o de data (se ambos existirem)
    extWhere = q ? { AND: [extWhere, dateFilterExt] } : dateFilterExt;
    intWhere = q ? { AND: [intWhere, dateFilterInt] } : dateFilterInt;
  }

  try {
    const external = await prisma.externalService.findMany({
      where: extWhere,
      include: { sector: true, techs: { select: { name: true } }, logs: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limita para não travar o navegador
    });

    const internal = await prisma.internalMaintenance.findMany({
      where: intWhere,
      include: { deviceType: true, originSector: true, techs: { select: { name: true } }, logs: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { receiveDate: 'desc' },
      take: 50
    });

    return NextResponse.json({ external, internal });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao realizar pesquisa" }, { status: 500 });
  }
}