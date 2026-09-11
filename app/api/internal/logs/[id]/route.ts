import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Tenta apagar primeiro na tabela de manutenção interna
    try {
      await prisma.internalMaintenanceLog.delete({
        where: { id },
      });
      return NextResponse.json({ message: "Histórico interno apagado com sucesso!" }, { status: 200 });
    } catch (e) {
      // Se não achar lá, tenta apagar na tabela de atendimento externo
      await prisma.externalServiceLog.delete({
        where: { id },
      });
      return NextResponse.json({ message: "Histórico externo apagado com sucesso!" }, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Erro ao apagar atividade do histórico." }, { status: 500 });
  }
}