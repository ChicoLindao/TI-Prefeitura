export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createAuditLog } from "@/lib/logger";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // 🔥 CORREÇÃO: Oculta os registros internos de controle de e-mail ("alerta_email_...")
    const ipLimits = await prisma.ipRateLimit.findMany({
      where: {
        NOT: {
          ip: {
            startsWith: "alerta_email_"
          }
        }
      },
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
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { action, email } = await req.json();

    if (action === 'addBlockedEmail') {
      await prisma.blockedEmail.upsert({
        where: { email },
        update: { isTemporary: false },
        create: { email, isTemporary: false }
      });

      await createAuditLog({
        userEmail: (session.user as any).email,
        action: "CRIAR",
        resource: "Segurança (Blacklist)",
        details: `Adicionou permanentemente o e-mail ${email} à Blacklist.`
      });
    } else if (action === 'addAlertEmail') {
      await prisma.alertEmail.upsert({
        where: { email },
        update: {},
        create: { email }
      });

      await createAuditLog({
        userEmail: (session.user as any).email,
        action: "CRIAR",
        resource: "Segurança (Alertas)",
        details: `Adicionou o e-mail ${email} aos alertas de spam.`
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao salvar configuração de segurança" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const idOrKey = searchParams.get("id");

    if (!action || !idOrKey) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    if (action === 'removeBlockedEmail') {
      const blocked = await prisma.blockedEmail.findUnique({ where: { id: idOrKey } });
      
      if (blocked) {
        // 1. Remove da blacklist
        await prisma.blockedEmail.delete({ where: { id: idOrKey } });

        // 2. Apaga o controle de tentativas de spam associado a este e-mail (Fantasma)
        await prisma.ipRateLimit.deleteMany({
          where: { ip: `alerta_email_${blocked.email}` }
        });

        // 3. Apaga os chamados recentes enviados por este e-mail para zerar a contagem de spam
        await prisma.externalService.deleteMany({
          where: { userEmail: blocked.email }
        });

        await createAuditLog({
          userEmail: (session.user as any).email,
          action: "DELETAR",
          resource: "Segurança (Blacklist)",
          details: `Removeu o e-mail ${blocked.email} da Blacklist e limpou o histórico de spam.`
        });
      }
    } else if (action === 'removeAlertEmail') {
      await prisma.alertEmail.delete({ where: { id: idOrKey } });
    } else if (action === 'resetIp') {
      await prisma.ipRateLimit.delete({ where: { ip: idOrKey } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ [API SECURITY DELETE] Erro:", error);
    return NextResponse.json({ error: "Erro ao executar ação de segurança" }, { status: 500 });
  }
}