import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    try {
      await prisma.internalMaintenanceLog.delete({
        where: { id },
      });
      return NextResponse.json({ message: "Histórico interno apagado!" }, { status: 200 });
    } catch (e) {
      await prisma.externalServiceLog.delete({
        where: { id },
      });
      return NextResponse.json({ message: "Histórico externo apagado!" }, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Erro ao apagar atividade." }, { status: 500 });
  }
}
