export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createAuditLog } from "@/lib/logger";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });

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

    // 2. Ordenação Alfabética do Wi-Fi
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
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });

    const body = await req.json();
    const userEmail = session.user.email as string;

    if (body.actionType === "CREATE_PRINTER") {
      await prisma.printer.create({ data: { model: body.model, ipAddress: body.ipAddress, sectorId: body.sectorId } });
      await createAuditLog({ userEmail, action: "CRIAR", resource: "Infra (Impressoras)", details: `Adicionou a impressora ${body.model} (IP: ${body.ipAddress})` });
    } 
    else if (body.actionType === "CREATE_ROUTER") {
      await prisma.router.create({ data: { networkName: body.networkName, password: body.password, sectorId: body.sectorId } });
      await createAuditLog({ userEmail, action: "CRIAR", resource: "Infra (Roteadores)", details: `Adicionou a rede Wi-Fi "${body.networkName}"` });
    } 
    else if (body.actionType === "CREATE_IP_RANGE") {
      await prisma.ipRange.create({ data: { range: body.range, sectorId: body.sectorId } });
      await createAuditLog({ userEmail, action: "CRIAR", resource: "Infra (Faixa de IP)", details: `Criou a faixa de IP: ${body.range}` });
    }
    else if (body.actionType === "CREATE_IP_ADDRESS") {
      await prisma.ipAddress.create({ data: { ip: body.ip, device: body.device, rangeId: body.rangeId } });
      await createAuditLog({ userEmail, action: "CRIAR", resource: "Infra (Endereço IP)", details: `Reservou o IP ${body.ip} para o dispositivo "${body.device}"` });
    }
    else if (body.actionType === "CREATE_REMOTE_ACCESS") {
      await prisma.remoteAccess.create({ data: { code: body.code, sectorId: body.sectorId, patrimony: body.patrimony } });
      await createAuditLog({ userEmail, action: "CRIAR", resource: "Infra (Acesso Remoto)", details: `Registrou o código de acesso remoto ${body.code} (Patrimônio: ${body.patrimony})` });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');
    const userEmail = session.user.email as string;

    if (!id || !type) return NextResponse.json({ error: "Faltam parâmetros" }, { status: 400 });

    if (type === 'PRINTER') {
      const p = await prisma.printer.findUnique({ where: { id } });
      await prisma.printer.delete({ where: { id } });
      if (p) await createAuditLog({ userEmail, action: "DELETAR", resource: "Infra (Impressoras)", details: `Removeu a impressora ${p.model} (IP: ${p.ipAddress})` });
    } 
    else if (type === 'ROUTER') {
      const r = await prisma.router.findUnique({ where: { id } });
      await prisma.router.delete({ where: { id } });
      if (r) await createAuditLog({ userEmail, action: "DELETAR", resource: "Infra (Roteadores)", details: `Removeu a rede Wi-Fi "${r.networkName}"` });
    } 
    else if (type === 'IP_RANGE') {
      const r = await prisma.ipRange.findUnique({ where: { id } });
      await prisma.ipRange.delete({ where: { id } });
      if (r) await createAuditLog({ userEmail, action: "DELETAR", resource: "Infra (Faixa de IP)", details: `Removeu a faixa de IP: ${r.range}` });
    } 
    else if (type === 'IP_ADDRESS') {
      const a = await prisma.ipAddress.findUnique({ where: { id } });
      await prisma.ipAddress.delete({ where: { id } });
      if (a) await createAuditLog({ userEmail, action: "DELETAR", resource: "Infra (Endereço IP)", details: `Liberou o IP ${a.ip} (Antes reservado para: ${a.device})` });
    } 
    else if (type === 'REMOTE_ACCESS') {
      const a = await prisma.remoteAccess.findUnique({ where: { id } });
      await prisma.remoteAccess.delete({ where: { id } });
      if (a) await createAuditLog({ userEmail, action: "DELETAR", resource: "Infra (Acesso Remoto)", details: `Removeu o acesso remoto ${a.code} (Patrimônio: ${a.patrimony})` });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });

    const body = await req.json();
    const { actionType, id, ...data } = body;
    const userEmail = session.user.email as string;

    if (actionType === "UPDATE_PRINTER") {
      await prisma.printer.update({ where: { id }, data: { model: data.model, ipAddress: data.ipAddress, sectorId: data.sectorId } });
      await createAuditLog({ userEmail, action: "ATUALIZAR", resource: "Infra (Impressoras)", details: `Atualizou os dados da impressora para ${data.model} (IP: ${data.ipAddress})` });
    } 
    else if (actionType === "UPDATE_ROUTER") {
      await prisma.router.update({ where: { id }, data: { networkName: data.networkName, password: data.password, sectorId: data.sectorId } });
      await createAuditLog({ userEmail, action: "ATUALIZAR", resource: "Infra (Roteadores)", details: `Atualizou os dados da rede Wi-Fi "${data.networkName}"` });
    } 
    else if (actionType === "UPDATE_IP_RANGE") {
      await prisma.ipRange.update({ where: { id }, data: { range: data.range, sectorId: data.sectorId } });
      await createAuditLog({ userEmail, action: "ATUALIZAR", resource: "Infra (Faixa de IP)", details: `Atualizou a faixa de IP para ${data.range}` });
    } 
    else if (actionType === "UPDATE_IP_ADDRESS") {
      await prisma.ipAddress.update({ where: { id }, data: { ip: data.ip, device: data.device } });
      await createAuditLog({ userEmail, action: "ATUALIZAR", resource: "Infra (Endereço IP)", details: `Atualizou a reserva do IP ${data.ip} para o dispositivo "${data.device}"` });
    } 
    else if (actionType === "UPDATE_REMOTE_ACCESS") {
      await prisma.remoteAccess.update({ where: { id }, data: { code: data.code, patrimony: data.patrimony, sectorId: data.sectorId } });
      await createAuditLog({ userEmail, action: "ATUALIZAR", resource: "Infra (Acesso Remoto)", details: `Atualizou o acesso remoto ${data.code} (Patrimônio: ${data.patrimony})` });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) { 
    return NextResponse.json({ error: "Erro ao editar registro." }, { status: 500 }); 
  }
}