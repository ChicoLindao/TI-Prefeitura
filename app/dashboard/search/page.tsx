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

  // Estados para o controle do Calendário
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

  // Dispara a busca toda vez que digitar ou clicar num dia
  useEffect(() => {
    const delay = setTimeout(() => { handleSearch(); }, 500);
    return () => clearTimeout(delay);
  }, [query, selectedDate]);

  // Função para mudar mês do calendário
  const changeMonth = (offset: number) => {
    let newMonth = calMonth + offset;
    let newYear = calYear;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    else if (newMonth < 0) { newMonth = 11; newYear--; }
    setCalMonth(newMonth);
    setCalYear(newYear);
  };

  // Renderiza os dias do calendário
  const renderCalendarDays = () => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const days = [];

    // Espaços vazios antes do dia 1
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isSelected = selectedDate === dateStr;
      const isToday = new Date().toISOString().split('T')[0] === dateStr;

      days.push(
        <button 
          key={i} 
          onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
          className={`h-10 w-10 mx-auto rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-sm
            ${isSelected ? 'bg-blue-600 text-white shadow-blue-500/50 scale-110' : 
              isToday ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' : 
              'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
        >
          {i}
        </button>
      );
    }
    return days;
  };

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // Componente reutilizável para renderizar um card de chamado na pesquisa
  const renderCard = (item: any, type: 'EXT' | 'INT') => {
    const isExt = type === 'EXT';
    const isResolved = item.status === 'ENTREGUE' || item.status === 'PRONTO_PARA_RETIRADA';
    const borderColor = isResolved ? 'border-green-500' : (item.status === 'PENDENTE' ? 'border-red-500' : 'border-yellow-500');
    const badgeColor = isResolved ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : (item.status === 'PENDENTE' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100' : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100');
    
    return (
      <div key={item.id} className={`bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border-l-4 flex flex-col justify-between hover:shadow-md transition-shadow ${borderColor}`}>
        <div>
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">{isExt ? item.sector.name : `${item.deviceType.name} (${item.originSector.name})`}</h3>
            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${badgeColor}`}>{item.status.replace(/_/g, ' ')}</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded">
            <strong>{isExt ? 'Relato' : 'Defeito'}:</strong> {isExt ? item.description : item.reportedProblem}
          </p>
          
          {item.logs && item.logs.length > 0 && (
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium italic mt-3 px-1 border-l-2 border-blue-400 pl-2">
              Último Log: {item.logs[0].description || item.logs[0].action} ({timeAgo(item.logs[0].createdAt)})
            </p>
          )}
        </div>
        <div className="flex justify-between items-end mt-4 border-t dark:border-gray-700 pt-3">
          <span className="text-[10px] text-gray-400 dark:text-gray-500">Técnicos: {item.techs?.length > 0 ? item.techs.map((t:any)=>t.name).join(', ') : 'Nenhum'}</span>
          <a href={`/dashboard/${isExt ? 'external' : 'internal'}/${item.id}`} className="text-gray-800 dark:text-gray-200 text-sm font-bold hover:underline">Acessar →</a>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pesquisa Global & Histórico</h1>
          <a href="/dashboard" className="text-gray-800 dark:text-gray-400 hover:underline font-medium text-lg">← Voltar</a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          
          {/* BARRA DE TEXTO (Esquerda) */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow border-t-4 border-blue-600 flex flex-col justify-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Buscar por Palavra-Chave</h2>
            <input 
              type="text" 
              placeholder="Digite um patrimônio, setor, defeito, marca ou nome..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-lg shadow-inner"
            />
            <p className="text-sm text-gray-500 mt-3 italic">
              Resultados aparecerão automaticamente conforme você digita.
            </p>
          </div>

          {/* CALENDÁRIO INTERATIVO (Direita) */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border-t-4 border-purple-600">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Buscar por Data</h2>
              {selectedDate && (
                <button onClick={() => setSelectedDate(null)} className="text-xs bg-red-100 text-red-600 font-bold px-2 py-1 rounded hover:bg-red-200 transition">Limpar Data</button>
              )}
            </div>

            {/* Cabeçalho do Calendário */}
            <div className="flex justify-between items-center mb-4 bg-gray-100 dark:bg-gray-900 rounded-lg p-2">
              <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-300 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300 font-bold px-3">{"<"}</button>
              <span className="font-bold text-gray-900 dark:text-white uppercase text-sm tracking-widest">{monthNames[calMonth]} {calYear}</span>
              <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-300 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300 font-bold px-3">{">"}</button>
            </div>

            {/* Dias da Semana */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2 text-xs font-bold text-gray-500 dark:text-gray-400">
              <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
            </div>

            {/* Grid de Dias */}
            <div className="grid grid-cols-7 gap-1">
              {renderCalendarDays()}
            </div>
          </div>
        </div>

        {/* ÁREA DE RESULTADOS */}
        {isLoading ? (
          <div className="text-center py-20 text-gray-500 font-bold text-xl animate-pulse">Buscando na base de dados...</div>
        ) : (
          <div className="space-y-12">
            
            {/* Resultados Visitas Externas */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 border-b-2 border-blue-600 pb-2">
                Atendimentos Encontrados ({resultsExt.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resultsExt.length === 0 ? (
                  <p className="text-gray-500 italic col-span-full">Nenhum atendimento externo bate com a sua pesquisa.</p>
                ) : (
                  resultsExt.map(srv => renderCard(srv, 'EXT'))
                )}
              </div>
            </div>

            {/* Resultados Bancada Interna */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 border-b-2 border-gray-500 pb-2">
                Equipamentos que Estão/Estiveram no Setor Encontrados ({resultsInt.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resultsInt.length === 0 ? (
                  <p className="text-gray-500 italic col-span-full">Nenhum equipamento bate com a sua pesquisa.</p>
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