export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const ipRanges = await prisma.ipRange.findMany({ include: { sector: true }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ ipRanges });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const { range, sectorId } = await req.json();
    if (!range || !sectorId) return NextResponse.json({ error: "Preencha a faixa de IP e o setor." }, { status: 400 });

    const ipRange = await prisma.ipRange.create({ data: { range, sectorId } });
    return NextResponse.json(ipRange, { status: 201 });
  } catch (error: any) { 
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    await prisma.ipRange.delete({ where: { id: String(id) } });
    return NextResponse.json({ success: true });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}