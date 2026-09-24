import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createAuditLog } from "@/lib/logger";

export async function GET() {
  const sectors = await prisma.sector.findMany({ 
    where: { NOT: { name: { contains: "(Inativo)" } } }, 
    orderBy: { name: 'asc' } 
  });
  const devices = await prisma.deviceType.findMany({ 
    where: { NOT: { name: { contains: "(Inativo)" } } }, 
    orderBy: { name: 'asc' } 
  });
  
  return NextResponse.json({ sectors, devices });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });

    const { type, name } = await req.json();
    
    if (type === 'SECTOR') {
      await prisma.sector.create({ data: { name } });
    }
    if (type === 'DEVICE') {
      await prisma.deviceType.create({ data: { name } });
    }

    // 🔴 REGISTRO NO LOG
    await createAuditLog({
      userEmail: session.user.email as string,
      action: "CRIAR",
      resource: type === 'SECTOR' ? "Setores" : "Dispositivos",
      details: `Criou o ${type === 'SECTOR' ? "setor" : "tipo de dispositivo"}: "${name}".`,
    });

    return NextResponse.json({ message: "Criado com sucesso" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });

    const { id, type, name } = await req.json();
    
    if (type === 'SECTOR') {
      await prisma.sector.update({ where: { id }, data: { name } });
    } else if (type === 'DEVICE') {
      await prisma.deviceType.update({ where: { id }, data: { name } });
    }

    // 🔴 REGISTRO NO LOG
    await createAuditLog({
      userEmail: session.user.email as string,
      action: "ATUALIZAR",
      resource: type === 'SECTOR' ? "Setores" : "Dispositivos",
      details: `Renomeou o ${type === 'SECTOR' ? "setor" : "dispositivo"} para "${name}".`,
    });

    return NextResponse.json({ message: "Atualizado com sucesso" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!id || !type) return NextResponse.json({ error: "Faltam parâmetros" }, { status: 400 });
    
    let nomeInativado = "";

    if (type === 'SECTOR') {
      const s = await prisma.sector.findUnique({ where: { id } });
      if (s) {
        nomeInativado = s.name;
        await prisma.sector.update({ where: { id }, data: { name: `${s.name} (Inativo)` } });
      }
    }
    if (type === 'DEVICE') {
      const d = await prisma.deviceType.findUnique({ where: { id } });
      if (d) {
        nomeInativado = d.name;
        await prisma.deviceType.update({ where: { id }, data: { name: `${d.name} (Inativo)` } });
      }
    }

    // 🔴 REGISTRO NO LOG
    if (nomeInativado) {
      await createAuditLog({
        userEmail: session.user.email as string,
        action: "DELETAR",
        resource: type === 'SECTOR' ? "Setores" : "Dispositivos",
        details: `Inativou o ${type === 'SECTOR' ? "setor" : "dispositivo"}: "${nomeInativado}".`,
      });
    }

    return NextResponse.json({ message: "Removido" });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao desativar." }, { status: 500 });
  }
}