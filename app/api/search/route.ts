import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const query = searchParams.get("q") || "";
    const date = searchParams.get("date");

    let startDate: Date;
    let endDate: Date;

    if (date) {
      startDate = new Date(`${date}T00:00:00.000-03:00`);
      endDate = new Date(`${date}T23:59:59.999-03:00`);
    } else {
      // Mês começa no dia 1 e vai até o último dia
      startDate = new Date(Number(year), Number(month) - 1, 1);
      endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
    }

    const externalWhere: any = {
      createdAt: { gte: startDate, lte: endDate }
    };

    const internalWhere: any = {
      receiveDate: { gte: startDate, lte: endDate }
    };

    // Adiciona o filtro de palavras-chave caso o usuário digite algo
    if (query) {
      externalWhere.OR = [
        { personAttended: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { userEmail: { contains: query, mode: "insensitive" } },
        { sector: { name: { contains: query, mode: "insensitive" } } }
      ];

      internalWhere.OR = [
        { equipmentUser: { contains: query, mode: "insensitive" } },
        { reportedProblem: { contains: query, mode: "insensitive" } },
        { patrimony: { contains: query, mode: "insensitive" } },
        { userEmail: { contains: query, mode: "insensitive" } },
        { originSector: { name: { contains: query, mode: "insensitive" } } },
        { deviceType: { name: { contains: query, mode: "insensitive" } } }
      ];
    }

    const [externals, internals] = await Promise.all([
      prisma.externalService.findMany({
        where: externalWhere,
        include: { sector: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.internalMaintenance.findMany({
        where: internalWhere,
        include: { originSector: true, deviceType: true },
        orderBy: { receiveDate: 'desc' }
      })
    ]);

    return NextResponse.json({
      externals,
      internals,
      externalCount: externals.length,
      internalCount: internals.length
    });
  } catch (error) {
    console.error("Erro na busca:", error);
    return NextResponse.json({ error: "Erro ao buscar dados" }, { status: 500 });
  }
}