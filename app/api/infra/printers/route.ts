export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const printers = await prisma.printer.findMany({ 
      include: { sector: true }, 
      orderBy: { createdAt: 'desc' } 
    });
    const sectors = await prisma.sector.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json({ printers, sectors });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar impressoras" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { model, ipAddress, sectorId } = await req.json();
    if (!model || !ipAddress || !sectorId) return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });

    const printer = await prisma.printer.create({ data: { model, ipAddress, sectorId } });
    return NextResponse.json(printer, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao cadastrar" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });

    await prisma.printer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao deletar" }, { status: 500 });
  }
}