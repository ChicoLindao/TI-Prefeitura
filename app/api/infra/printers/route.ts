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
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });

    const { model, ipAddress, sectorId } = await req.json();
    if (!model || !ipAddress || !sectorId) return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });

    const printer = await prisma.printer.create({ data: { model, ipAddress, sectorId } });

    await createAuditLog({
      userEmail: session.user.email as string,
      action: "CRIAR",
      resource: "Infra (Impressoras)",
      details: `Adicionou a impressora ${model} (IP: ${ipAddress})`,
    });

    return NextResponse.json(printer, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao cadastrar" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });

    const printer = await prisma.printer.findUnique({ where: { id } });
    await prisma.printer.delete({ where: { id } });

    if (printer) {
      await createAuditLog({
        userEmail: session.user.email as string,
        action: "DELETAR",
        resource: "Infra (Impressoras)",
        details: `Removeu a impressora ${printer.model} (IP: ${printer.ipAddress})`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao deletar" }, { status: 500 });
  }
}