"use client";
import { useState, useEffect } from "react";

export default function GlobalSearchPage() {
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Agora guardamos apenas as estatísticas em vez de listas de chamados
  const [stats, setStats] = useState({ external: 0, internal: 0 });
  const [isLoading, setIsLoading] = useState(false);

  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      let url = `/api/search?month=${calMonth + 1}&year=${calYear}&`;
      if (query) url += `q=${encodeURIComponent(query)}&`;
      if (selectedDate) url += `date=${selectedDate}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      setStats({
        external: data.externalCount || 0,
        internal: data.internalCount || 0
      });
    } catch (error) {
      console.error("Erro na busca", error);
    }
    setIsLoading(false);
  };

  // O useEffect agora observa o mês e ano também, para atualizar ao clicar nas setinhas < >
  useEffect(() => {
    const delay = setTimeout(() => { handleSearch(); }, 500);
    return () => clearTimeout(delay);
  }, [query, selectedDate, calMonth, calYear]);

  const changeMonth = (offset: number) => {
    let newMonth = calMonth + offset;
    let newYear = calYear;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    else if (newMonth < 0) { newMonth = 11; newYear--; }
    setCalMonth(newMonth);
    setCalYear(newYear);
    // Ao mudar o mês, limpamos o dia selecionado para ver o mês inteiro
    setSelectedDate(null); 
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 transition-colors px-4 py-6 sm:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header (MANTIDO) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-600 font-bold mb-1">Consultas</p>
            <h1 className="text-3xl font-bold text-slate-800">Pesquisa &amp; Relatório</h1>
          </div>
          <a href="/dashboard" className="text-slate-500 hover:text-slate-700 hover:underline font-medium text-sm transition-colors">← Voltar</a>
        </div>

        {/* Search + Calendar (MANTIDO) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Text search */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-blue-600 flex flex-col justify-center">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Buscar por Palavra-Chave</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Ex: Secretaria de Saúde, Monitor, Impressora..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 pl-11 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-base">🔍</span>
            </div>
            <p className="text-sm text-slate-400 mt-3 italic">Os chamados aparecerão abaixo e atualizarão em tempo real conforme você digita.</p>
          </div>

          {/* Calendar */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-violet-600">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800">Filtro de Data</h2>
              {selectedDate && (
                <button onClick={() => setSelectedDate(null)} className="text-xs bg-red-50 text-red-600 font-semibold px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors border border-red-200">Limpar Dia</button>
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

        {/* RESULTADOS - Substituído pelo Relatório */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-slate-400 font-semibold text-lg animate-pulse">Calculando estatísticas...</div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card Interno */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-slate-700 flex flex-col items-center text-center transition-all hover:shadow-md hover:-translate-y-1">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mb-4">
                  🖥️
                </div>
                <h3 className="text-slate-500 font-semibold mb-2 uppercase tracking-wider text-sm">Equipamentos que passaram pelo Setor</h3>
                <span className="text-6xl font-bold text-slate-800">{stats.internal}</span>
                <p className="text-sm text-slate-400 mt-4">
                  {selectedDate ? `Registrados no dia ${selectedDate.split('-').reverse().join('/')}` : `Registrados em ${monthNames[calMonth]} de ${calYear}`}
                </p>
              </div>

              {/* Card Externo */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-blue-500 flex flex-col items-center text-center transition-all hover:shadow-md hover:-translate-y-1">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-3xl mb-4">
                  🏃‍♂️
                </div>
                <h3 className="text-slate-500 font-semibold mb-2 uppercase tracking-wider text-sm">Atendimentos Realizados</h3>
                <span className="text-6xl font-bold text-blue-600">{stats.external}</span>
                <p className="text-sm text-slate-400 mt-4">
                  {selectedDate ? `Realizados no dia ${selectedDate.split('-').reverse().join('/')}` : `Realizados em ${monthNames[calMonth]} de ${calYear}`}
                </p>
              </div>

            </div>
            
            {/* Total Geral */}
            <div className="text-center bg-slate-800 p-8 rounded-2xl shadow-sm text-white relative overflow-hidden transition-all hover:shadow-md">
              <div className="relative z-10">
                <p className="text-sm text-slate-300 uppercase tracking-[0.2em] font-bold mb-2">Total do Período</p>
                <p className="text-5xl font-bold text-white">{stats.internal + stats.external}</p>
                {query && (
                  <p className="text-sm text-slate-400 mt-4 bg-slate-700/50 inline-block px-4 py-2 rounded-lg">
                    Com a palavra-chave: <strong className="text-white">"{query}"</strong>
                  </p>
                )}
              </div>
              {/* Fundos decorativos */}
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-slate-700 rounded-full opacity-50 blur-2xl"></div>
              <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-blue-900 rounded-full opacity-50 blur-2xl"></div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}