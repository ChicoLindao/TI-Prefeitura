export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import AutoRefresh from "@/app/components/AutoRefresh";
import Notifier from "@/app/components/Notifier";
import LogoutButton from "@/app/components/LogoutButton";

function timeAgo(date: Date) {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  if (diffHours > 0) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffMinutes > 0) return `Há ${diffMinutes} min`;
  return "Agora mesmo";
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const user = session.user as any;
  const isAdmin = user.role === "ADMINISTRADOR";

  let relatorio: any[] = [];
  let adminActiveExt: any[] = [];
  let adminActiveInt: any[] = [];

  let myActiveExt: any[] = [];
  let myActiveInt: any[] = [];
  let globalActiveExt: any[] = [];
  let globalActiveInt: any[] = [];
  let myResolvedExt: any[] = [];
  let myResolvedInt: any[] = [];

  if (isAdmin) {
    const usersStats = await prisma.user.findMany({
      where: { NOT: { name: { contains: "(Inativo)" } } },
      select: {
        id: true, name: true,
        externalServices: { select: { status: true } },
        internalMaintenances: { select: { status: true } }
      }
    });

    relatorio = usersStats.map(u => {
      const activeExt = u.externalServices.filter((s: any) => s.status !== 'ENTREGUE').length;
      const activeInt = u.internalMaintenances.filter((m: any) => m.status !== 'ENTREGUE').length;
      const resolvedExt = u.externalServices.filter((s: any) => s.status === 'ENTREGUE').length;
      const resolvedInt = u.internalMaintenances.filter((m: any) => m.status === 'ENTREGUE').length;
      return { id: u.id, name: u.name, activeExt, activeInt, totalResolved: resolvedExt + resolvedInt };
    }).sort((a, b) => b.totalResolved - a.totalResolved);

    adminActiveExt = await prisma.externalService.findMany({
      where: { status: { not: 'ENTREGUE' } },
      include: { sector: true, techs: { select: { id: true, name: true } }, logs: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'asc' }
    });

    adminActiveInt = await prisma.internalMaintenance.findMany({
      where: { status: { not: 'ENTREGUE' } },
      include: { deviceType: true, originSector: true, techs: { select: { id: true, name: true } }, logs: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { receiveDate: 'asc' }
    });

  } else {
    myActiveExt = await prisma.externalService.findMany({
      where: { status: { not: 'ENTREGUE' }, techs: { some: { id: user.id } } },
      include: { sector: true, techs: { select: { id: true, name: true } }, logs: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'asc' }
    });
    
    myActiveInt = await prisma.internalMaintenance.findMany({
      where: { status: { not: 'ENTREGUE' }, techs: { some: { id: user.id } } },
      include: { deviceType: true, originSector: true, techs: { select: { id: true, name: true } }, logs: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { receiveDate: 'asc' }
    });

    globalActiveExt = await prisma.externalService.findMany({
      where: { status: { not: 'ENTREGUE' }, techs: { none: { id: user.id } } },
      include: { sector: true, techs: { select: { id: true, name: true } }, logs: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'asc' }
    });

    globalActiveInt = await prisma.internalMaintenance.findMany({
      where: { status: { not: 'ENTREGUE' }, techs: { none: { id: user.id } } },
      include: { deviceType: true, originSector: true, techs: { select: { id: true, name: true } }, logs: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { receiveDate: 'asc' }
    });

    myResolvedExt = await prisma.externalService.findMany({
      where: { status: 'ENTREGUE', techs: { some: { id: user.id } } },
      include: { sector: true, techs: { select: { id: true, name: true } }, logs: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' }
    });

    myResolvedInt = await prisma.internalMaintenance.findMany({
      where: { status: 'ENTREGUE', techs: { some: { id: user.id } } },
      include: { deviceType: true, originSector: true, techs: { select: { id: true, name: true } }, logs: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { receiveDate: 'desc' }
    });
  }

  // AGORA SIM: Passa todos os chamados completos para o Notificador (Admins e Técnicos)
  const ticketsForNotification = [
    ...adminActiveExt,
    ...adminActiveInt,
    ...myActiveExt,
    ...myActiveInt,
    ...globalActiveExt,
    ...globalActiveInt
  ];

  const renderCard = (item: any, type: 'EXT' | 'INT') => {
    const isExt = type === 'EXT';
    const isResolved = item.status === 'ENTREGUE' || item.status === 'PRONTO_PARA_RETIRADA';
    const borderColor = isResolved ? 'border-green-500' : (item.status === 'PENDENTE' ? 'border-red-500' : 'border-yellow-500');
    const badgeColor = isResolved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : (item.status === 'PENDENTE' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200');
    
    return (
      <div key={item.id} className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${borderColor}`}>
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-slate-800">{isExt ? item.sector.name : `${item.deviceType.name} (${item.originSector.name})`}</h3>
          <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${badgeColor}`}>{item.status.replace(/_/g, ' ')}</span>
        </div>
        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
          <strong>{isExt ? 'Problema' : 'Defeito'}:</strong> {isExt ? item.description : item.reportedProblem}
        </p>
        
        {item.logs && item.logs.length > 0 && (
          <p className="text-xs text-blue-600 font-medium italic mt-1 px-1">
            Último log: {item.logs[0].description || item.logs[0].action} ({timeAgo(item.logs[0].createdAt).toLowerCase()})
          </p>
        )}

        <div className="flex justify-between items-end mt-2 border-t border-slate-100 pt-3">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-medium">⏳ {isExt ? 'Aberto:' : 'Na bancada:'} {timeAgo(isExt ? item.createdAt : item.receiveDate)}</span>
            <span className="text-[10px] text-slate-400 mt-1">Técnicos: {item.techs?.length > 0 ? item.techs.map((t:any)=>t.name).join(', ') : 'Nenhum'}</span>
          </div>
          <a href={`/dashboard/${isExt ? 'external' : 'internal'}/${item.id}`} className="text-blue-600 text-sm font-bold hover:text-blue-800 transition-colors">
            Ver Chamado →
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 transition-colors px-4 py-6 sm:p-8">
      
      <AutoRefresh interval={30000} />
      {/* AGORA SIM: Enviando a lista completa de chamados + ID do usuário para saber se ele foi designado */}
      <Notifier tickets={ticketsForNotification} currentUserId={user.id} />

      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div><p className="text-xs uppercase tracking-[0.2em] text-blue-600 font-bold mb-1">Central de atendimento</p><h1 className="text-3xl font-bold text-slate-800">Painel do Sistema</h1></div>
          <div className="flex items-center gap-3">
            <a href="/" className="bg-slate-800 text-white px-4 py-2.5 rounded-xl hover:bg-slate-700 transition-all duration-200 font-semibold shadow-sm hover:shadow-md text-sm">
              Ver Tela Pública
            </a>
            <LogoutButton />
          </div>
        </header>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-blue-600 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Bem-vindo, {user?.name}!</h2>
            <p className="text-slate-500">
              Logado com: <strong>{user?.email}</strong> | Acesso: <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full text-xs font-bold">{isAdmin ? 'Administrador' : 'Técnico Padrão'}</span>
            </p>
          </div>
          <a href="/dashboard/profile" className="bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-100 transition-all duration-200 shadow-sm whitespace-nowrap text-sm">
            👤 Meu Perfil
          </a>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 ${isAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
          <a href="/dashboard/external" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-b-4 border-b-blue-600 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 text-center font-semibold text-slate-700">🚑 Atendimentos</a>
          <a href="/dashboard/internal" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-b-4 border-b-slate-700 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 text-center font-semibold text-slate-700">🏢 Setor</a>
          
          <a href="/dashboard/infra" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-b-4 border-b-emerald-600 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 text-center font-semibold text-slate-700">
            📡 Infraestrutura
          </a>

          <a href="/dashboard/search" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-b-4 border-b-cyan-600 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 text-center font-semibold text-slate-700">🔍 Pesquisa</a>
          
          {isAdmin && (
            <a href="/dashboard/settings" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-b-4 border-b-red-600 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 text-center font-semibold text-slate-700">⚙️ Configurações</a>
          )}
        </div>

        {isAdmin ? (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-4 border-b-2 border-blue-600 pb-2">Atendimentos em Aberto ({adminActiveExt.length})</h2>
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                  {adminActiveExt.length === 0 ? <p className="text-slate-400 italic">Nenhum atendimento pendente.</p> : adminActiveExt.map(srv => renderCard(srv, 'EXT'))}
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-4 border-b-2 border-slate-700 pb-2">Setor em Aberto ({adminActiveInt.length})</h2>
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                  {adminActiveInt.length === 0 ? <p className="text-slate-400 italic">Nenhum equipamento pendente.</p> : adminActiveInt.map(maint => renderCard(maint, 'INT'))}
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-4 border-t border-slate-200 pt-8">Histórico de Chamados por Técnico</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 font-bold text-slate-600">Técnicos</th>
                    <th className="p-4 font-bold text-slate-600 text-center">Externos em Aberto</th>
                    <th className="p-4 font-bold text-slate-600 text-center">Setor em Aberto</th>
                    <th className="p-4 font-bold text-slate-600 text-center">Total Finalizados</th>
                    <th className="p-4 font-bold text-slate-600 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorio.map((tech) => (
                    <tr key={tech.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors text-slate-700">
                      <td className="p-4 font-bold">{tech.name}</td>
                      <td className="p-4 text-center text-red-600 font-bold">{tech.activeExt}</td>
                      <td className="p-4 text-center text-red-600 font-bold">{tech.activeInt}</td>
                      <td className="p-4 text-center font-bold text-emerald-600 text-xl">{tech.totalResolved}</td>
                      <td className="p-4 text-center">
                        <a href={`/dashboard/tech/${tech.id}`} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors">Ver Histórico →</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Meus Chamados Pendentes (Prioridade)</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
              <div>
                <h3 className="text-xl font-bold text-blue-700 mb-4 border-b-2 border-blue-600 pb-2">Atendimentos em Aberto ({myActiveExt.length})</h3>
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                  {myActiveExt.length === 0 ? <p className="text-slate-400 italic">Você não tem atendimentos ativos.</p> : myActiveExt.map(srv => renderCard(srv, 'EXT'))}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-700 mb-4 border-b-2 border-slate-700 pb-2">Setor em Aberto ({myActiveInt.length})</h3>
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                  {myActiveInt.length === 0 ? <p className="text-slate-400 italic">Você não tem equipamentos na bancada.</p> : myActiveInt.map(maint => renderCard(maint, 'INT'))}
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-6 border-t border-slate-200 pt-8">Fila Global (Outros Chamados em Aberto)</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
              <div className="opacity-80 hover:opacity-100 transition-opacity">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b-2 border-blue-300 pb-2">Atendimentos em Aberto ({globalActiveExt.length})</h3>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {globalActiveExt.length === 0 ? <p className="text-slate-400 italic">Nenhum chamado sobrando na fila.</p> : globalActiveExt.map(srv => renderCard(srv, 'EXT'))}
                </div>
              </div>
              <div className="opacity-80 hover:opacity-100 transition-opacity">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b-2 border-slate-200 pb-2">Setor em Aberto ({globalActiveInt.length})</h3>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {globalActiveInt.length === 0 ? <p className="text-slate-400 italic">Nenhum equipamento sobrando na fila.</p> : globalActiveInt.map(maint => renderCard(maint, 'INT'))}
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-6 border-t border-slate-200 pt-8">Meu Histórico de Concluídos</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold text-emerald-700 mb-4 border-b-2 border-green-500 pb-2">Atendimentos Concluídos ({myResolvedExt.length})</h3>
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                  {myResolvedExt.length === 0 ? <p className="text-slate-400 italic">Nenhum histórico.</p> : myResolvedExt.map(srv => renderCard(srv, 'EXT'))}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-emerald-700 mb-4 border-b-2 border-green-500 pb-2">Bancada Concluída ({myResolvedInt.length})</h3>
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                  {myResolvedInt.length === 0 ? <p className="text-slate-400 italic">Nenhum histórico.</p> : myResolvedInt.map(maint => renderCard(maint, 'INT'))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}