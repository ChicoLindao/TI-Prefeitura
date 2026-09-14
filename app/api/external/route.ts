import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";
import { triggerUpdate } from "@/lib/ws";

export async function GET() {
  try {
    const services = await prisma.externalService.findMany({
      include: { sector: true, techs: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    // Filtrando apenas os que não possuem "(Inativo)" no nome:
    const sectors = await prisma.sector.findMany({
      where: { NOT: { name: { contains: "(Inativo)" } } },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json({ services, sectors });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar atendimentos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { sectorId, personAttended, userEmail, description } = await req.json();
    
    const newService = await prisma.externalService.create({
      data: { sectorId, personAttended, userEmail, description, status: "PENDENTE" },
      include: { sector: true } 
    });

    await triggerUpdate('nova-demanda', { tipo: 'CHAMADO', setor: newService.sector?.name || 'TI' });

    // 📧 E-MAIL: QUANDO A TI CRIA O CHAMADO PARA O USUÁRIO
    if (newService.userEmail) {
      try {
        const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: newService.userEmail,
          subject: `Chamado Aberto Pela TI: ${newService.sector.name}`,
          html: `<h3>Olá, ${newService.personAttended}!</h3>
                 <p>Um chamado para o setor <strong>${newService.sector.name}</strong> foi registrado por nossa equipe para você.</p>
                 <p><strong>Descrição:</strong> ${newService.description}</p>
                 <p>Você será notificado por e-mail a cada atualização.</p>`
        });
      } catch (error) { console.error("Erro no email:", error); }
    }

    return NextResponse.json(newService, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao criar atendimento" }, { status: 500 });
  }
}