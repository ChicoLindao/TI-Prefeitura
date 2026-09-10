export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const maintenances = await prisma.internalMaintenance.findMany({
      include: {
        deviceType: true,
        originSector: true,
        techs: { select: { id: true, name: true } },
        logs: { include: { tech: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }
      },
      orderBy: { receiveDate: "asc" }
    });

    return NextResponse.json(maintenances);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar bancada interna" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const techId = user?.id;

    const body = await req.json();
    const { patrimony, brand, equipmentUser, userEmail, originSectorId, deviceTypeId, reportedProblem } = body;

    if (!originSectorId || !deviceTypeId || !reportedProblem) {
      return NextResponse.json({ error: "Preencha o Setor, o Equipamento e o Problema." }, { status: 400 });
    }

    const newMaintenance = await prisma.internalMaintenance.create({
      data: {
        patrimony: patrimony || null,
        brand: brand || "Não informada",
        equipmentUser: equipmentUser || "Não informado", 
        userEmail: userEmail || null,
        originSectorId,
        deviceTypeId,
        reportedProblem,
        status: "PENDENTE"
      }
    });

    // MÁGICA: Removido o 'type', pois essa tabela não possui essa coluna
    const logData: any = {
      action: "Equipamento cadastrado e inserido na fila da bancada.",
      internalMaintenance: { connect: { id: newMaintenance.id } }
    };
    
    if (techId) {
      logData.tech = { connect: { id: techId } };
    }

    await prisma.internalMaintenanceLog.create({ data: logData });

    return NextResponse.json({ message: "Equipamento adicionado com sucesso!", maintenance: newMaintenance }, { status: 201 });
  } catch (error) {
    console.error("Erro no POST da bancada:", error);
    return NextResponse.json({ error: "Erro interno ao cadastrar equipamento" }, { status: 500 });
  }
}