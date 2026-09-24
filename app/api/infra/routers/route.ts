export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createAuditLog } from "@/lib/logger";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });

    const routers = await prisma.router.findMany({ include: { sector: true }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ routers });
  } catch (error) { return NextResponse.json({ error: "Erro ao buscar" }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });

    const { networkName, password, sectorId } = await req.json();
    if (!networkName || !password || !sectorId) return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });

    const router = await prisma.router.create({ data: { networkName, password, sectorId } });

    await createAuditLog({
      userEmail: session.user.email as string,
      action: "CRIAR",
      resource: "Infra (Roteadores)",
      details: `Adicionou a rede Wi-Fi "${networkName}"`,
    });

    return NextResponse.json(router, { status: 201 });
  } catch (error) { return NextResponse.json({ error: "Erro ao cadastrar" }, { status: 500 }); }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });

    const id = new URL(req.url).searchParams.get('id');
    const router = await prisma.router.findUnique({ where: { id: String(id) } });
    
    await prisma.router.delete({ where: { id: String(id) } });

    if (router) {
      await createAuditLog({
        userEmail: session.user.email as string,
        action: "DELETAR",
        resource: "Infra (Roteadores)",
        details: `Removeu a rede Wi-Fi "${router.networkName}"`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Erro ao deletar" }, { status: 500 }); }
}