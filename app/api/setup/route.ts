import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const hashedPassword = await bcrypt.hash("suporteTI@2025", 10);

    // 1. Cria ou Atualiza o Administrador (Método Seguro)
    const adminExiste = await prisma.user.findUnique({ where: { email: "admin@ti.com" } });
    if (!adminExiste) {
      await prisma.user.create({
        data: {
          name: "Administrador Chefe",
          email: "admin@ti.com",
          password: hashedPassword,
          role: "ADMINISTRADOR"
        }
      });
    } else {
      await prisma.user.update({
        where: { email: "admin@ti.com" },
        data: { password: hashedPassword, role: "ADMINISTRADOR" }
      });
    }

    // 2. Cria os Setores (Método Seguro - Um por um)
    const setores = ["Gabinete", "Recursos Humanos", "Secretaria de Saúde", "Secretaria de Educação", "Secretaria da Fazenda"];
    for (const nome of setores) {
      const setorExiste = await prisma.sector.findUnique({ where: { name: nome } });
      if (!setorExiste) {
        await prisma.sector.create({ data: { name: nome } });
      }
    }

    // 3. Cria tipos de dispositivos (Método Seguro - Um por um)
    const dispositivos = ["Desktop", "Notebook", "Impressora", "Monitor"];
    for (const nome of dispositivos) {
      const dispositivoExiste = await prisma.deviceType.findUnique({ where: { name: nome } });
      if (!dispositivoExiste) {
        await prisma.deviceType.create({ data: { name: nome } });
      }
    }

    return NextResponse.json({ message: "Admin e dados básicos FORÇADOS com sucesso via método seguro! Pode fazer o login." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}