export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    let printers = await prisma.printer.findMany({ include: { sector: true } });
    let routers = await prisma.router.findMany({ include: { sector: true } });
    let ipRanges = await prisma.ipRange.findMany({ include: { sector: true, ips: true } });
    
    const remoteAccesses = await prisma.remoteAccess.findMany({ 
      include: { sector: true }, 
      orderBy: { sector: { name: 'asc' } } 
    });
    
    const sectors = await prisma.sector.findMany({ 
      where: { NOT: { name: { contains: "(Inativo)" } } },
      orderBy: { name: 'asc' } 
    });

    // 1. Ordenação Numérica dos IPs das Impressoras
    printers.sort((a, b) => {
      if (!a.ipAddress) return 1;
      if (!b.ipAddress) return -1;
      const numA = a.ipAddress.split('.').map(Number);
      const numB = b.ipAddress.split('.').map(Number);
      for (let i = 0; i < 4; i++) {
        if ((numA[i] || 0) < (numB[i] || 0)) return -1;
        if ((numA[i] || 0) > (numB[i] || 0)) return 1;
      }
      return 0;
    });

    // 2. Ordenação Alfabética do Wi-Fi (Ignora maiúsculas e minúsculas)
    routers.sort((a, b) => a.networkName.localeCompare(b.networkName, undefined, { sensitivity: 'base' }));

    // 3. Ordenação Alfanumérica das Faixas de IP
    ipRanges.sort((a, b) => a.range.localeCompare(b.range, undefined, { numeric: true, sensitivity: 'base' }));

    return NextResponse.json({ printers, routers, ipRanges, remoteAccesses, sectors });
  } catch (error) {
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

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { actionType, id, ...data } = body;

    if (actionType === "UPDATE_PRINTER") {
      await prisma.printer.update({ where: { id }, data: { model: data.model, ipAddress: data.ipAddress, sectorId: data.sectorId } });
    } else if (actionType === "UPDATE_ROUTER") {
      await prisma.router.update({ where: { id }, data: { networkName: data.networkName, password: data.password, sectorId: data.sectorId } });
    } else if (actionType === "UPDATE_IP_RANGE") {
      await prisma.ipRange.update({ where: { id }, data: { range: data.range, sectorId: data.sectorId } });
    } else if (actionType === "UPDATE_IP_ADDRESS") {
      await prisma.ipAddress.update({ where: { id }, data: { ip: data.ip, device: data.device } });
    } else if (actionType === "UPDATE_REMOTE_ACCESS") {
      await prisma.remoteAccess.update({ where: { id }, data: { code: data.code, patrimony: data.patrimony, sectorId: data.sectorId } });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) { 
    return NextResponse.json({ error: "Erro ao editar registro." }, { status: 500 }); 
  }
}