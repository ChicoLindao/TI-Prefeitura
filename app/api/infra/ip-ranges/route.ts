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

    const ipRanges = await prisma.ipRange.findMany({ include: { sector: true }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ ipRanges });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });

    const { range, sectorId } = await req.json();
    if (!range || !sectorId) return NextResponse.json({ error: "Preencha a faixa de IP e o setor." }, { status: 400 });

    const ipRange = await prisma.ipRange.create({ data: { range, sectorId } });

    await createAuditLog({
      userEmail: session.user.email as string,
      action: "CRIAR",
      resource: "Infra (Faixa de IP)",
      details: `Criou a faixa de IP: ${range}`,
    });

    return NextResponse.json(ipRange, { status: 201 });
  } catch (error: any) { 
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });

    const id = new URL(req.url).searchParams.get('id');
    
    const range = await prisma.ipRange.findUnique({ where: { id: String(id) } });
    await prisma.ipRange.delete({ where: { id: String(id) } });

    if (range) {
      await createAuditLog({
        userEmail: session.user.email as string,
        action: "DELETAR",
        resource: "Infra (Faixa de IP)",
        details: `Removeu a faixa de IP: ${range.range}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}