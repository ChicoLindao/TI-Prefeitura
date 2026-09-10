import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

// No Next.js 16+, o tipo do params é uma Promise
export default async function TechHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  // Aguarda a resolução dos parâmetros da URL antes de usar
  const resolvedParams = await params;
  const id = resolvedParams.id;

  // Puxa o técnico e TODOS os chamados atrelados a ele, sem filtro de exclusão
  const tech = await prisma.user.findUnique({
    where: { id },
    include: {
      externalServices: {
        include: { sector: true },
        orderBy: { createdAt: 'desc' }
      },
      internalMaintenances: {
        include: { originSector: true, deviceType: true },
        orderBy: { receiveDate: 'desc' }
      }
    }
  });

  if (!tech) {
    return redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 p-8 transition-colors">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8 border-b border-gray-300 dark:border-gray-800 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Histórico de Chamados</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
              Técnico: <strong className="text-gray-900 dark:text-white">{tech.name}</strong> ({tech.email})
            </p>
          </div>
          <Link href="/dashboard" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
            ← Voltar ao Painel
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* EXTERNOS (Mostra tudo: pendentes, em andamento e entregues) */}
          <div>
            <h2 className="text-xl font-bold mb-4 border-b-2 border-blue-600 pb-2">
              Atendimentos Externos ({tech.externalServices.length})
            </h2>
            <div className="space-y-4">
              {tech.externalServices.map((srv: any) => (
                <div key={srv.id} className={`bg-white dark:bg-[#1e293b] p-4 rounded-lg shadow-sm border-l-4 ${srv.status === 'ENTREGUE' ? 'border-green-500' : 'border-blue-500'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 dark:text-white">{srv.sector.name}</h3>
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${
                      srv.status === 'ENTREGUE' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400' : 
                      srv.status === 'EM_ANDAMENTO' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-400' : 
                      'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }`}>
                      {srv.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm bg-gray-50 dark:bg-[#0f172a] p-2 rounded text-gray-700 dark:text-gray-300 mb-3">
                    Problema: {srv.description}
                  </p>
                  <Link href={`/dashboard/external/${srv.id}`} className="text-blue-600 dark:text-blue-400 text-sm font-bold hover:underline">
                    Ver Chamado →
                  </Link>
                </div>
              ))}
              {tech.externalServices.length === 0 && (
                <p className="text-gray-500 italic bg-white dark:bg-[#1e293b] p-4 rounded-lg shadow-sm">Nenhum atendimento externo registrado.</p>
              )}
            </div>
          </div>

          {/* INTERNOS (Mostra tudo: pendentes, andamento, aguardando, entregues) */}
          <div>
            <h2 className="text-xl font-bold mb-4 border-b-2 border-gray-400 pb-2">
              Bancada Interna ({tech.internalMaintenances.length})
            </h2>
            <div className="space-y-4">
              {tech.internalMaintenances.map((maint: any) => (
                <div key={maint.id} className={`bg-white dark:bg-[#1e293b] p-4 rounded-lg shadow-sm border-l-4 ${maint.status === 'ENTREGUE' || maint.status === 'AGUARDANDO_RETIRADA' ? 'border-green-500' : 'border-gray-500'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-gray-900 dark:text-white">{maint.deviceType.name}</h3>
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${
                      maint.status === 'ENTREGUE' || maint.status === 'AGUARDANDO_RETIRADA' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400' : 
                      maint.status === 'EM_ANDAMENTO' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-400' : 
                      'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }`}>
                      {maint.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">De: {maint.originSector.name}</p>
                  <p className="text-sm bg-gray-50 dark:bg-[#0f172a] p-2 rounded text-gray-700 dark:text-gray-300 mb-3">
                    Defeito: {maint.reportedProblem}
                  </p>
                  <Link href={`/dashboard/internal/${maint.id}`} className="text-blue-600 dark:text-blue-400 text-sm font-bold hover:underline">
                    Ver Equipamento →
                  </Link>
                </div>
              ))}
              {tech.internalMaintenances.length === 0 && (
                <p className="text-gray-500 italic bg-white dark:bg-[#1e293b] p-4 rounded-lg shadow-sm">Nenhum equipamento na bancada registrado.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}