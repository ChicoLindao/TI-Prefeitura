import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any).role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    // Lógica de filtro flexível (busca por e-mail, ação, recurso, IP ou detalhes)
    const whereClause = search ? {
      OR: [
        { userEmail: { contains: search, mode: "insensitive" as const } },
        { action: { contains: search, mode: "insensitive" as const } },
        { resource: { contains: search, mode: "insensitive" as const } },
        { details: { contains: search, mode: "insensitive" as const } },
        { ipAddress: { contains: search, mode: "insensitive" as const } },
      ]
    } : {};

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: search ? 500 : 150, // Se estiver pesquisando, traz mais resultados
    });

    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar logs" }, { status: 500 });
  }
}