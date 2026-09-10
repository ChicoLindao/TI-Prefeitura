export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const printers = await prisma.printer.findMany({ include: { sector: true }, orderBy: { createdAt: 'desc' } });
    const routers = await prisma.router.findMany({ include: { sector: true }, orderBy: { createdAt: 'desc' } });
    const ipRanges = await prisma.ipRange.findMany({ include: { sector: true, ips: true }, orderBy: { createdAt: 'desc' } });
    const remoteAccesses = await prisma.remoteAccess.findMany({ include: { sector: true }, orderBy: { createdAt: 'desc' } });
    const sectors = await prisma.sector.findMany({ orderBy: { name: 'asc' } });
    
    return NextResponse.json({ printers, routers, ipRanges, remoteAccesses, sectors });
  } catch (error) {
    // ESSA LINHA VAI MOSTRAR O ERRO REAL NO SEU TERMINAL (TELA PRETA)
    console.error("ERRO FATAL NA API DE INFRA:", error); 
    return NextResponse.json({ error: "Erro ao buscar dados." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.actionType === "CREATE_PRINTER") {
      await prisma.printer.create({ data: { model: body.model, ipAddress: body.ipAddress, sectorId: body.sectorId } });
    } 
    else if (body.actionType === "CREATE_ROUTER") {
      await prisma.router.create({ data: { networkName: body.networkName, password: body.password, sectorId: body.sectorId } });
    } 
    else if (body.actionType === "CREATE_IP_RANGE") {
      await prisma.ipRange.create({ data: { range: body.range, sectorId: body.sectorId } });
    }
    else if (body.actionType === "CREATE_IP_ADDRESS") {
      await prisma.ipAddress.create({ data: { ip: body.ip, device: body.device, rangeId: body.rangeId } });
    }
    else if (body.actionType === "CREATE_REMOTE_ACCESS") {
      await prisma.remoteAccess.create({ data: { code: body.code, sectorId: body.sectorId, patrimony: body.patrimony } });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id || !type) return NextResponse.json({ error: "Faltam parâmetros" }, { status: 400 });

    if (type === 'PRINTER') await prisma.printer.delete({ where: { id } });
    else if (type === 'ROUTER') await prisma.router.delete({ where: { id } });
    else if (type === 'IP_RANGE') await prisma.ipRange.delete({ where: { id } });
    else if (type === 'IP_ADDRESS') await prisma.ipAddress.delete({ where: { id } });
    else if (type === 'REMOTE_ACCESS') await prisma.remoteAccess.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}