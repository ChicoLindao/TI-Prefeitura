import prisma from "@/lib/prisma";
import { headers } from "next/headers";

interface LogParams {
  userEmail: string;
  action: "CRIAR" | "ATUALIZAR" | "DELETAR" | "ACESSO";
  resource: string;
  details?: string;
}

export async function createAuditLog({ userEmail, action, resource, details }: LogParams) {
  try {
    // 🔴 AQUI ESTÁ A CORREÇÃO: Adicionado o "await" antes de headers()
    const headersList = await headers(); 
    
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0] : (realIp || "127.0.0.1");

    await prisma.auditLog.create({
      data: {
        userEmail,
        action,
        resource,
        details,
        ipAddress,
      },
    });
  } catch (error) {
    console.error("Falha ao registrar Audit Log:", error);
  }
}