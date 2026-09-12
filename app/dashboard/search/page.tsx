"use client";
import { useState, useEffect } from "react";

function timeAgo(date: Date) {
  const diffMs = new Date().getTime() - new Date(date).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffDays > 0) return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  if (diffHours > 0) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  return "Hoje";
}

export default function GlobalSearchPage() {
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [resultsExt, setResultsExt] = useState<any[]>([]);
  const [resultsInt, setResultsInt] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      let url = `/api/search?`;
      if (query) url += `q=${encodeURIComponent(query)}&`;
      if (selectedDate) url += `date=${selectedDate}`;
      const res = await fetch(url);
      const data = await res.json();
      setResultsExt(data.external || []);
      setResultsInt(data.internal || []);
    } catch (error) {
      console.error("Erro na busca", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const delay = setTimeout(() => { handleSearch(); }, 500);
    return () => clearTimeout(delay);
  }, [query, selectedDate]);

  const changeMonth = (offset: number) => {
    let newMonth = calMonth + offset;
    let newYear = calYear;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    else if (newMonth < 0) { newMonth = 11; newYear--; }
    setCalMonth(newMonth);
    setCalYear(newYear);
  };

  const renderCalendarDays = () => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const days = [];

    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isSelected = selectedDate === dateStr;
      const isToday = new Date().toISOString().split('T')[0] === dateStr;

      days.push(
        <button
          key={i}
          onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
          className={`h-10 w-10 mx-auto rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200
            ${isSelected ? 'bg-blue-600 text-white shadow-md scale-110' :
              isToday ? 'bg-blue-50 text-blue-700 border border-blue-200' :
              'hover:bg-slate-100 text-slate-600'}`}
        >
          {i}
        </button>
      );
    }
    return days;
  };

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const renderCard = (item: any, type: 'EXT' | 'INT') => {
    const isExt = type === 'EXT';
    const isResolved = item.status === 'ENTREGUE' || item.status === 'PRONTO_PARA_RETIRADA';
    const borderColor = isResolved ? 'border-l-emerald-500' : (item.status === 'PENDENTE' ? 'border-l-red-500' : 'border-l-amber-500');
    const badgeColor = isResolved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : (item.status === 'PENDENTE' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200');

    return (
      <div key={item.id} className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${borderColor}`}>
        <div>
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-slate-800 text-lg">{isExt ? item.sector.name : `${item.deviceType.name} (${item.originSector.name})`}</h3>
            <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${badgeColor}`}>{item.status.replace(/_/g, ' ')}</span>
          </div>
          <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-xl">
            <strong>{isExt ? 'Relato' : 'Defeito'}:</strong> {isExt ? item.description : item.reportedProblem}
          </p>
          {item.logs && item.logs.length > 0 && (
            <p className="text-xs text-blue-600 font-medium italic mt-3 pl-3 border-l-2 border-blue-300">
              Último Log: {item.logs[0].description || item.logs[0].action} ({timeAgo(item.logs[0].createdAt)})
            </p>
          )}
        </div>
        <div className="flex justify-between items-end mt-4 border-t border-slate-100 pt-3">
          <span className="text-[10px] text-slate-400">Técnicos: {item.techs?.length > 0 ? item.techs.map((t:any)=>t.name).join(', ') : 'Nenhum'}</span>
          <a href={`/dashboard/${isExt ? 'external' : 'internal'}/${item.id}`} className="text-slate-700 text-sm font-semibold hover:text-blue-600 transition-colors">Acessar →</a>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 transition-colors px-4 py-6 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-600 font-bold mb-1">Consultas</p>
            <h1 className="text-3xl font-bold text-slate-800">Pesquisa Global &amp; Histórico</h1>
          </div>
          <a href="/dashboard" className="text-slate-500 hover:text-slate-700 hover:underline font-medium text-sm transition-colors">← Voltar</a>
        </div>

        {/* Search + Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Text search */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-blue-600 flex flex-col justify-center">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Buscar por Palavra-Chave</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Digite um patrimônio, setor, defeito, marca ou nome..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 pl-11 text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-base">🔍</span>
            </div>
            <p className="text-sm text-slate-400 mt-3 italic">Resultados aparecerão automaticamente conforme você digita.</p>
          </div>

          {/* Calendar */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-violet-600">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800">Buscar por Data</h2>
              {selectedDate && (
                <button onClick={() => setSelectedDate(null)} className="text-xs bg-red-50 text-red-600 font-semibold px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors border border-red-200">Limpar</button>
              )}
            </div>
            <div className="flex justify-between items-center mb-4 bg-slate-50 rounded-xl p-2 border border-slate-100">
              <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 font-bold px-3 transition-colors">{"<"}</button>
              <span className="font-bold text-slate-700 uppercase text-sm tracking-wider">{monthNames[calMonth]} {calYear}</span>
              <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 font-bold px-3 transition-colors">{">"}</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2 text-xs font-bold text-slate-400">
              <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {renderCalendarDays()}
            </div>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-20 text-slate-400 font-semibold text-lg animate-pulse">Buscando na base de dados...</div>
        ) : (
          <div className="space-y-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-blue-500 pb-2">Atendimentos Encontrados</h2>
                <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-sm font-bold">{resultsExt.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resultsExt.length === 0 ? (
                  <p className="text-slate-400 italic col-span-full">Nenhum atendimento externo bate com a sua pesquisa.</p>
                ) : (
                  resultsExt.map(srv => renderCard(srv, 'EXT'))
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-slate-400 pb-2">Equipamentos que Estão/Estiveram no Setor</h2>
                <span className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-full text-sm font-bold">{resultsInt.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resultsInt.length === 0 ? (
                  <p className="text-slate-400 italic col-span-full">Nenhum equipamento bate com a sua pesquisa.</p>
                ) : (
                  resultsInt.map(maint => renderCard(maint, 'INT'))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}