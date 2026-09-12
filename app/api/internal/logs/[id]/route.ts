import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    try {
      await prisma.internalMaintenanceLog.delete({ where: { id } });
      return NextResponse.json({ message: "Histórico interno apagado!" }, { status: 200 });
    } catch (e) {
      await prisma.externalServiceLog.delete({ where: { id } });
      return NextResponse.json({ message: "Histórico externo apagado!" }, { status: 200 });
    }
  } catch (error) { return NextResponse.json({ error: "Erro ao apagar." }, { status: 500 }); }
}

// NOVA FUNÇÃO: Editar (PATCH)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await req.json();
    const { text } = body;

    try {
      await prisma.internalMaintenanceLog.update({ where: { id }, data: { action: text } });
      return NextResponse.json({ success: true });
    } catch (e) {
      await prisma.externalServiceLog.update({ where: { id }, data: { description: text } });
      return NextResponse.json({ success: true });
    }
  } catch (error) { return NextResponse.json({ error: "Erro ao atualizar." }, { status: 500 }); }
}