import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";
import { triggerUpdate } from "@/lib/ws";

// GET: Busca apenas os setores ativos para preencher a caixinha de seleção
export async function GET() {
  try {
    const sectors = await prisma.sector.findMany({
      where: { NOT: { name: { contains: "(Inativo)" } } },
      orderBy: { name: "asc" }
    });
    return NextResponse.json(sectors);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar setores" }, { status: 500 });
  }
}

// POST: Recebe os dados do formulário público e cria o chamado
export async function POST(req: Request) {
  try {
    const { sectorId, personAttended, userEmail, description } = await req.json();

    const newTicket = await prisma.externalService.create({
      data: {
        sectorId,
        personAttended,
        userEmail,
        description,
        status: "PENDENTE" // Entra automaticamente na fila
      },
      include: { sector: true } // Precisamos disso para pegar o nome do setor pro aviso e pro e-mail
    });

    // 🔥 GATILHO WEBSOCKET: Avisa o painel da TI instantaneamente
    await triggerUpdate('nova-demanda', { tipo: 'CHAMADO', setor: newTicket.sector.name });

    // 📧 ENVIO DE E-MAIL PARA O SOLICITANTE
    if (newTicket.userEmail) {
      try {
        const transporter = nodemailer.createTransport({ 
          service: "gmail", 
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } 
        });
        
        transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: newTicket.userEmail,
          subject: `Chamado Aberto com Sucesso: ${newTicket.sector.name}`,
          html: `<h3>Olá, ${newTicket.personAttended}!</h3>
                 <p>Seu chamado para o setor <strong>${newTicket.sector.name}</strong> foi registrado e já está na fila de atendimento da TI.</p>
                 <p><strong>Descrição:</strong> ${newTicket.description}</p>
                 <p>Você será notificado por e-mail assim que a nossa equipe atualizar o status.</p>`
        }).catch(err => console.log("Erro no e-mail de criação externa:", err));
      } catch (error) { 
        console.error("Erro ao configurar email:", error); 
      }
    }

    return NextResponse.json({ message: "Chamado aberto com sucesso!" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao abrir chamado" }, { status: 500 });
  }
}