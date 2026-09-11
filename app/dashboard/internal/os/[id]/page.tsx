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
      <div className="border-b-2 border-slate-800 pb-4 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wider text-slate-900">Ordem de Serviço</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Departamento de Tecnologia da Informação</p>
        </div>
        <div className="text-right text-sm text-slate-500">
          <p>OS Número: <strong className="text-slate-800">{maintenance.id.split("-")[0].toUpperCase()}</strong></p>
          <p className="mt-1">Data de Entrada: {new Date(maintenance.receiveDate).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* DADOS DO EQUIPAMENTO E SOLICITANTE */}
      <div className="mb-8 grid grid-cols-2 gap-6 border border-slate-300 p-5 rounded-lg bg-slate-50 print:bg-transparent">
        <div className="space-y-1.5">
          <p className="text-sm"><strong className="text-slate-700">Setor:</strong> <span className="text-slate-600">{maintenance.originSector}</span></p>
          <p className="text-sm"><strong className="text-slate-700">Usuário:</strong> <span className="text-slate-600">{maintenance.equipmentUser}</span></p>
          <p className="text-sm"><strong className="text-slate-700">Telefone:</strong> <span className="text-slate-600">{maintenance.userPhone || 'Não informado'}</span></p>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm"><strong className="text-slate-700">Dispositivo:</strong> <span className="text-slate-600">{maintenance.deviceType} {maintenance.brand ? `(${maintenance.brand})` : ''}</span></p>
          <p className="text-sm"><strong className="text-slate-700">Patrimônio:</strong> <span className="text-slate-600">{maintenance.patrimony || 'N/A'}</span></p>
          <p className="text-sm"><strong className="text-slate-700">Solicitação:</strong> <span className="text-slate-600">{new Date(maintenance.receiveDate).toLocaleDateString('pt-BR')}</span></p>
        </div>
      </div>

      {/* PROBLEMA E RESOLUÇÃO */}
      <div className="mb-10 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 border-b-2 border-slate-300 mb-3 pb-1">Defeito Relatado</h3>
          <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200 print:bg-transparent print:border-slate-300">{maintenance.reportedProblem}</p>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-800 border-b-2 border-slate-300 mb-3 pb-1">Serviço Executado (Diagnóstico)</h3>
          {maintenance.logs.length > 0 ? (
            <ol className="list-decimal pl-6 space-y-2">
              {maintenance.logs.map((log: any) => (
                <li key={log.id} className="text-sm text-slate-700 leading-relaxed">
                  {log.action} <span className="text-xs text-slate-400">({log.tech.name} - {new Date(log.createdAt).toLocaleDateString('pt-BR')})</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-400 italic">Nenhum log registrado para este serviço.</p>
          )}
        </div>
      </div>

      {/* ASSINATURAS */}
      <div className="mt-20 pt-8 border-t-2 border-slate-800">
        <div className="mb-12 flex justify-center">
          <p className="text-sm font-bold text-slate-700">Data de Retirada / Entrega: _____/_____/_______</p>
        </div>
        
        <div className="grid grid-cols-2 gap-12">
          <div className="text-center">
            <div className="border-b border-slate-800 w-full mb-2"></div>
            <p className="text-sm font-bold text-slate-700">Entregue por (Técnico TI)</p>
            <p className="text-xs text-slate-500 mt-2">Nome: _____________________________________</p>
          </div>
          <div className="text-center">
            <div className="border-b border-slate-800 w-full mb-2"></div>
            <p className="text-sm font-bold text-slate-700">Recebido por (Usuário/Setor)</p>
            <p className="text-xs text-slate-500 mt-2">Nome: _____________________________________</p>
          </div>
        </div>
      </div>
      
    </div>
  );
}