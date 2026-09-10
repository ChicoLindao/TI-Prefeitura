import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
  const { type, name } = await req.json();
  if (type === 'SECTOR') await prisma.sector.create({ data: { name } });
  if (type === 'DEVICE') await prisma.deviceType.create({ data: { name } });
  return NextResponse.json({ message: "Criado com sucesso" }, { status: 201 });
}

// NOVO: Função para atualizar nomes de Setores ou Equipamentos
export async function PUT(req: Request) {
  const { id, type, name } = await req.json();
  try {
    if (type === 'SECTOR') {
      await prisma.sector.update({ where: { id }, data: { name } });
    } else if (type === 'DEVICE') {
      await prisma.deviceType.update({ where: { id }, data: { name } });
    }
    return NextResponse.json({ message: "Atualizado com sucesso" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  
  try {
    if (type === 'SECTOR') {
      const s = await prisma.sector.findUnique({ where: { id: id! } });
      if (s) await prisma.sector.update({ where: { id: id! }, data: { name: s.name + " (Inativo)" } });
    }
    if (type === 'DEVICE') {
      const d = await prisma.deviceType.findUnique({ where: { id: id! } });
      if (d) await prisma.deviceType.update({ where: { id: id! }, data: { name: d.name + " (Inativo)" } });
    }
    return NextResponse.json({ message: "Removido" });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao desativar." }, { status: 500 });
  }
}