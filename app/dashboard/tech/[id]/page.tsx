import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function TechHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 transition-colors px-4 py-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-600 font-bold mb-1">Histórico</p>
            <h1 className="text-3xl font-bold text-slate-800">Chamados do Técnico</h1>
            <p className="text-sm text-slate-500 mt-1">
              <strong className="text-slate-700">{tech.name}</strong> ({tech.email})
            </p>
          </div>
          <a href="/dashboard" className="text-slate-500 hover:text-slate-700 hover:underline font-medium text-sm transition-colors">
            ← Voltar ao Painel
          </a>
        </div>

        {/* Resumo */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-blue-600 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-1">Resumo de Atividades</h2>
              <p className="text-slate-500 text-sm">
                Total de atendimentos: <strong className="text-slate-700">{tech.externalServices.length}</strong> |
                Total de equipamentos: <strong className="text-slate-700">{tech.internalMaintenances.length}</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* EXTERNOS */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-8 bg-blue-500 rounded-full" />
              <h2 className="text-xl font-bold text-slate-800">
                Atendimentos Externos
              </h2>
              <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                {tech.externalServices.length}
              </span>
            </div>
            <div className="space-y-4">
              {tech.externalServices.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                  <p className="text-slate-400 text-sm">Nenhum atendimento externo registrado.</p>
                </div>
              ) : (
                tech.externalServices.map((srv: any) => (
                  <div
                    key={srv.id}
                    className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 flex flex-col gap-3 transition-all duration-200 hover:shadow-md hover:border-slate-300 ${
                      srv.status === 'ENTREGUE' ? 'border-l-emerald-500' :
                      srv.status === 'EM_ANDAMENTO' ? 'border-l-amber-400' :
                      'border-l-red-500'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-900">{srv.sector.name}</h3>
                      <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${
                        srv.status === 'ENTREGUE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : srv.status === 'EM_ANDAMENTO'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {srv.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl text-sm text-slate-600 border border-slate-100">
                      <strong>Problema:</strong> {srv.description}
                    </div>
                    <div className="flex justify-end border-t border-slate-100 pt-3">
                      <Link
                        href={`/dashboard/external/${srv.id}`}
                        className="text-blue-600 text-sm font-bold hover:text-blue-800 transition-colors"
                      >
                        Ver Chamado →
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* INTERNOS */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-8 bg-slate-700 rounded-full" />
              <h2 className="text-xl font-bold text-slate-800">
                Equipamentos no Setor
              </h2>
              <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                {tech.internalMaintenances.length}
              </span>
            </div>
            <div className="space-y-4">
              {tech.internalMaintenances.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                  <p className="text-slate-400 text-sm">Nenhum equipamento na bancada registrado.</p>
                </div>
              ) : (
                tech.internalMaintenances.map((maint: any) => (
                  <div
                    key={maint.id}
                    className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 flex flex-col gap-3 transition-all duration-200 hover:shadow-md hover:border-slate-300 ${
                      maint.status === 'ENTREGUE' || maint.status === 'PRONTO_PARA_RETIRADA'
                        ? 'border-l-emerald-500'
                        : maint.status === 'EM_ANDAMENTO'
                        ? 'border-l-amber-400'
                        : 'border-l-red-500'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-900">{maint.deviceType.name}</h3>
                      <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${
                        maint.status === 'ENTREGUE' || maint.status === 'PRONTO_PARA_RETIRADA'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : maint.status === 'EM_ANDAMENTO'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {maint.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      De: <strong className="text-slate-700">{maint.originSector.name}</strong>
                    </p>
                    <div className="bg-slate-50 p-3 rounded-xl text-sm text-slate-600 border border-slate-100">
                      <strong>Defeito:</strong> {maint.reportedProblem}
                    </div>
                    <div className="flex justify-end border-t border-slate-100 pt-3">
                      <Link
                        href={`/dashboard/internal/${maint.id}`}
                        className="text-blue-600 text-sm font-bold hover:text-blue-800 transition-colors"
                      >
                        Ver Equipamento →
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}