export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const routers = await prisma.router.findMany({ include: { sector: true }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ routers });
  } catch (error) { return NextResponse.json({ error: "Erro ao buscar" }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const { networkName, password, sectorId } = await req.json();
    if (!networkName || !password || !sectorId) return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });

    const router = await prisma.router.create({ data: { networkName, password, sectorId } });
    return NextResponse.json(router, { status: 201 });
  } catch (error) { return NextResponse.json({ error: "Erro ao cadastrar" }, { status: 500 }); }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    await prisma.router.delete({ where: { id: String(id) } });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Erro ao deletar" }, { status: 500 }); }
}