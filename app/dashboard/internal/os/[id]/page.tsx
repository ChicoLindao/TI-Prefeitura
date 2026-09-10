import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import PrintButton from "./PrintButton";

export default async function OrderOfServicePrint({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const maintenance = await prisma.internalMaintenance.findUnique({
    where: { id },
    include: {
      receivedBy: { select: { name: true } },
      tech: { select: { name: true } },
      logs: { include: { tech: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
    }
  });

  if (!maintenance) return redirect("/dashboard/internal");

  return (
    <div className="min-h-screen bg-white text-black p-8 max-w-4xl mx-auto print:p-0 print:m-0 font-sans">
      <PrintButton />

      {/* CABEÇALHO */}
      <div className="border-b-2 border-gray-800 pb-4 mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wider">Ordem de Serviço</h1>
          <p className="text-gray-600 font-medium">Departamento de Tecnologia da Informação</p>
        </div>
        <div className="text-right text-sm text-gray-500">
          <p>OS Número: <strong className="text-gray-800">{maintenance.id.split("-")[0].toUpperCase()}</strong></p>
          <p>Data de Entrada: {new Date(maintenance.receiveDate).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* DADOS DO EQUIPAMENTO E SOLICITANTE */}
      <div className="mb-6 grid grid-cols-2 gap-4 border border-gray-300 p-4 rounded bg-gray-50 print:bg-transparent">
        <div>
          <p className="text-sm mb-1"><strong>Setor:</strong> {maintenance.originSector}</p>
          <p className="text-sm mb-1"><strong>Usuário:</strong> {maintenance.equipmentUser}</p>
          <p className="text-sm mb-1"><strong>Telefone:</strong> {maintenance.userPhone || 'Não informado'}</p>
        </div>
        <div>
          <p className="text-sm mb-1"><strong>Dispositivo:</strong> {maintenance.deviceType} {maintenance.brand ? `(${maintenance.brand})` : ''}</p>
          <p className="text-sm mb-1"><strong>Patrimônio:</strong> {maintenance.patrimony || 'N/A'}</p>
          <p className="text-sm mb-1"><strong>Data da Solicitação:</strong> {new Date(maintenance.receiveDate).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* PROBLEMA E RESOLUÇÃO */}
      <div className="mb-8 space-y-6">
        <div>
          <h3 className="text-lg font-bold border-b border-gray-300 mb-2">Defeito Relatado</h3>
          <p className="text-gray-800 text-sm">{maintenance.reportedProblem}</p>
        </div>

        <div>
          <h3 className="text-lg font-bold border-b border-gray-300 mb-2">Serviço Executado (Diagnóstico)</h3>
          {maintenance.logs.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1">
              {maintenance.logs.map((log: any) => (
                <li key={log.id} className="text-sm text-gray-800">
                  {log.action} <span className="text-xs text-gray-500">({log.tech.name})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">Nenhum log registrado para este serviço.</p>
          )}
        </div>
      </div>

      {/* ASSINATURAS (RODAPÉ) - LIMPO E OTIMIZADO */}
      <div className="mt-20 pt-8 border-t-2 border-gray-800">
        <div className="mb-12 flex justify-center">
          <p className="text-sm font-bold">Data de Retirada / Entrega: _____/_____/_______</p>
        </div>
        
        <div className="grid grid-cols-2 gap-12">
          <div className="text-center">
            <div className="border-b border-gray-800 w-full mb-2"></div>
            <p className="text-sm font-bold">Entregue por (Técnico TI)</p>
            <p className="text-xs mt-2">Nome: _____________________________________</p>
          </div>
          <div className="text-center">
            <div className="border-b border-gray-800 w-full mb-2"></div>
            <p className="text-sm font-bold">Recebido por (Usuário/Setor)</p>
            <p className="text-xs mt-2">Nome: _____________________________________</p>
          </div>
        </div>
      </div>
      
    </div>
  );
}