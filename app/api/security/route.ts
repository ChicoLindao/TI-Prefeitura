import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Busca os IPs que já tentaram abrir chamados
    const ipLimits = await prisma.ipRateLimit.findMany({
      where: { count: { gt: 0 } },
      orderBy: { count: 'desc' }
    });

    const blockedEmails = await prisma.blockedEmail.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const alertEmails = await prisma.alertEmail.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ ipLimits, blockedEmails, alertEmails });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar dados de segurança" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { action, email } = await req.json();

    if (action === "addBlockedEmail") {
      await prisma.blockedEmail.create({ data: { email } });
    } else if (action === "addAlertEmail") {
      await prisma.alertEmail.create({ data: { email } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao adicionar registro (O e-mail já pode estar cadastrado)" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });

    if (action === "removeBlockedEmail") {
      await prisma.blockedEmail.delete({ where: { id } });
    } else if (action === "removeAlertEmail") {
      await prisma.alertEmail.delete({ where: { id } });
    } else if (action === "resetIp") {
      // O ID do IpRateLimit é o próprio endereço IP
      await prisma.ipRateLimit.update({
        where: { ip: id },
        data: { count: 0 }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao remover registro" }, { status: 500 });
  }
}