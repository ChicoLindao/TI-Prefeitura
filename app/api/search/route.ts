import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const date = searchParams.get("date");
    const monthStr = searchParams.get("month");
    const yearStr = searchParams.get("year");

    let dateFilterExt: any = {};
    let dateFilterInt: any = {};

    // 1. Se o usuário clicou em um DIA específico no calendário
    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      dateFilterExt = { createdAt: { gte: start, lte: end } };
      dateFilterInt = { receiveDate: { gte: start, lte: end } };
    } 
    // 2. Se não clicou num dia, filtra pelo MÊS que está na tela
    else if (monthStr && yearStr) {
      const month = parseInt(monthStr);
      const year = parseInt(yearStr);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      dateFilterExt = { createdAt: { gte: start, lt: end } };
      dateFilterInt = { receiveDate: { gte: start, lt: end } };
    }

    // Filtros de texto (se o usuário digitou algo na barra de pesquisa)
    const textFilterExt = q ? {
      OR: [
        { sector: { name: { contains: q, mode: 'insensitive' as const } } },
        { description: { contains: q, mode: 'insensitive' as const } },
        { personAttended: { contains: q, mode: 'insensitive' as const } }
      ]
    } : {};

    const textFilterInt = q ? {
      OR: [
        { deviceType: { name: { contains: q, mode: 'insensitive' as const } } },
        { originSector: { name: { contains: q, mode: 'insensitive' as const } } },
        { reportedProblem: { contains: q, mode: 'insensitive' as const } },
        { patrimony: { contains: q, mode: 'insensitive' as const } }
      ]
    } : {};

    // Conta no banco cruzando a Data com a Palavra-chave
    const externalCount = await prisma.externalService.count({
      where: { ...dateFilterExt, ...textFilterExt }
    });

    const internalCount = await prisma.internalMaintenance.count({
      where: { ...dateFilterInt, ...textFilterInt }
    });

    return NextResponse.json({ externalCount, internalCount });
  } catch (error) {
    return NextResponse.json({ error: "Erro na busca" }, { status: 500 });
  }
}