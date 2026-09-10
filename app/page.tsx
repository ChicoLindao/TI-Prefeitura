import Link from "next/link";
import prisma from "@/lib/prisma";
import Image from "next/image";

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function timeAgo(date: Date) {
  const diffMs = new Date().getTime() - new Date(date).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  if (diffHours > 0) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffMinutes > 0) return `há ${diffMinutes} min`;
  return "agora mesmo";
}

export default async function PublicDashboard() {
  const externalServices = await prisma.externalService.findMany({
    where: { status: { not: 'ENTREGUE' } },
    include: { 
      sector: true,
      logs: { orderBy: { createdAt: 'desc' }, take: 1 } 
    },
    orderBy: { createdAt: "desc" },
  });

  const internalMaintenances = await prisma.internalMaintenance.findMany({
    where: { status: { not: 'ENTREGUE' } },
    include: { 
      deviceType: true, 
      originSector: true,
      logs: { orderBy: { createdAt: 'desc' }, take: 1 }
    },
    orderBy: { receiveDate: "desc" },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">

      {/* HERO */}
      <div className="w-full max-w-5xl mb-10 flex flex-col items-center text-center">
        <div className="mb-6 relative w-32 h-32 md:w-40 md:h-40 group">
          <a
            href="https://www.charqueadas.rs.gov.br"
            className="cursor-pointer hover:opacity-90 transition-opacity duration-300"
          >
            <Image 
              src="/logo.png" 
              alt="Logo Prefeitura" 
              fill 
              className="object-contain transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 128px, 160px"
              priority
            />
          </a>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight uppercase">
          DEPARTAMENTO DE TI
        </h1>
        <p className="mt-3 text-base sm:text-lg text-slate-500 max-w-xl">
          Acompanhamento dos Atendimentos do Departamento de TI 
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
          <a
            href="mailto:ti@charqueadas.rs.gov.br?subject=Olá,%20preciso%20de%20suporte%20técnico!" 
            className="flex items-center gap-2.5 text-slate-600 hover:text-blue-600 font-medium text-sm transition-colors duration-200 px-4 py-2 rounded-lg hover:bg-blue-50"
          >
            <span className="text-lg">✉️</span> ti@charqueadas.rs.gov.br
          </a>
          <span className="hidden sm:block w-px bg-slate-200" />
          <a
            href="https://wa.me/5551935052374?text=Olá,%20preciso%20de%20suporte%20técnico!" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-2.5 text-slate-600 hover:text-green-600 font-medium text-sm transition-colors duration-200 px-4 py-2 rounded-lg hover:bg-green-50"
          >
            <span className="text-lg">📞</span> (51) 93505-2374
          </a>
        </div>
      </div>

      {/* CTA */}
      <div className="w-full max-w-5xl flex justify-end mb-8">
        <Link 
          href="/request-service" 
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 text-sm"
        >
          <span className="text-lg leading-none">+</span> Solicitar Atendimento
        </Link>
      </div>

      {/* GRID */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">

        {/* EXTERNO */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-8 bg-blue-500 rounded-full" />
            <h2 className="text-xl font-bold text-slate-800">
              Atendimentos
            </h2>
            <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              {externalServices.length} ativo{externalServices.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-4">
            {externalServices.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                <p className="text-slate-400 text-sm">Nenhum chamado aberto no momento.</p>
              </div>
            ) : (
              externalServices.map((service) => (
                <div 
                  key={service.id} 
                  className={`bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between h-full transition-all duration-200 hover:shadow-md hover:border-slate-300 relative overflow-hidden ${
                    service.status === 'PENDENTE' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-amber-400'
                  }`}
                >
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{service.sector.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">Solicitante: <strong className="text-slate-700 font-semibold">{service.personAttended}</strong></p>
                    <div className="bg-slate-50 p-3 rounded-lg mt-3 text-sm text-slate-600 leading-relaxed">
                      {service.description}
                    </div>

                    {service.logs && service.logs.length > 0 && (
                      <p className="text-xs text-blue-500 font-medium italic mt-3 px-1 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-blue-400" />
                        {service.logs[0].description || service.logs[0].action} ({timeAgo(service.logs[0].createdAt)})
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex justify-between items-end">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      service.status === 'PENDENTE' 
                        ? 'bg-red-50 text-red-600 border border-red-200' 
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {service.status === 'PENDENTE' ? 'Na Fila' : 'Em Andamento'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{formatDate(service.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* BANCADA */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-8 bg-slate-700 rounded-full" />
            <h2 className="text-xl font-bold text-slate-800">
              Equipamentos no Setor
            </h2>
            <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              {internalMaintenances.length} ativo{internalMaintenances.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-4">
            {internalMaintenances.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                <p className="text-slate-400 text-sm">Nenhum equipamento na bancada.</p>
              </div>
            ) : (
              internalMaintenances.map((maint) => (
                <div 
                  key={maint.id} 
                  className={`bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between h-full transition-all duration-200 hover:shadow-md hover:border-slate-300 relative overflow-hidden ${
                    maint.status === 'PENDENTE' ? 'border-l-4 border-l-red-500' :
                    maint.status === 'EM_ANDAMENTO' ? 'border-l-4 border-l-amber-400' :
                    'border-l-4 border-l-green-500'
                  }`}
                >
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{maint.originSector.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Equipamento: <strong className="text-slate-700 font-semibold">{maint.deviceType.name}</strong> <span className="text-slate-400">({maint.equipmentUser})</span>
                    </p>

                    {maint.logs && maint.logs.length > 0 && (
                      <p className="text-xs text-blue-500 font-medium italic mt-3 px-1 border-t border-slate-100 pt-2 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-blue-400" />
                        {maint.logs[0].action} ({timeAgo(maint.logs[0].createdAt)})
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex justify-between items-end">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      maint.status === 'PENDENTE' 
                        ? 'bg-red-50 text-red-600 border border-red-200' :
                        maint.status === 'EM_ANDAMENTO' 
                          ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-green-50 text-green-600 border border-green-200'
                    }`}>
                      {maint.status === 'PENDENTE' ? 'Na Fila' : maint.status === 'EM_ANDAMENTO' ? 'Em Conserto' : 'Pronto p/ Retirada'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{formatDate(maint.receiveDate)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* FOOTER */}
      <div className="mt-16 mb-8 w-full max-w-5xl text-center border-t border-slate-200 pt-8">
        <Link 
          href="/login" 
          className="text-slate-400 hover:text-slate-600 font-medium text-sm hover:underline transition-colors duration-200"
        >
          Acesso para Técnicos
        </Link>
      </div>
    </div>
  );
}