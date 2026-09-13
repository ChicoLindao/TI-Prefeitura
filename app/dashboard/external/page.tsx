"use client";
import { useState, useEffect } from "react";

function timeAgo(date: Date) {
  const diffMs = new Date().getTime() - new Date(date).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffDays > 0) return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  if (diffHours > 0) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  return "Agora";
}

export default function ExternalServices() {
  const [services, setServices] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  
  const [sectorId, setSectorId] = useState("");
  const [personAttended, setPersonAttended] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [description, setDescription] = useState("");

  const [toast, setToast] = useState<{ show: boolean, msg: string, type: 'success' | 'error' }>({ show: false, msg: '', type: 'success' });

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 4000);
  };

  const fetchData = async () => {
    const res = await fetch("/api/external");
    const data = await res.json();
    const lista = data.services || data || [];
    setServices(lista.filter((s: any) => s.status !== 'ENTREGUE'));

    const resSettings = await fetch("/api/settings");
    const dataSettings = await resSettings.json();
    setSectors(dataSettings.sectors || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/external", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectorId, personAttended, userEmail, description })
    });
    if (res.ok) {
      showToast("Chamado externo aberto com sucesso!", "success");
      setSectorId(""); setPersonAttended(""); setUserEmail(""); setDescription("");
      fetchData();
    } else {
      showToast("Erro ao abrir chamado. Tente novamente.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 transition-colors px-4 py-6 sm:p-8 relative">
      
      {toast.show && (
        <div className={`fixed top-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-semibold transition-all duration-300 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white border-l-4 border-emerald-300' : 'bg-red-600 text-white border-l-4 border-red-300'
        }`}>
          <span className="text-xl">{toast.type === 'success' ? '✅' : '❌'}</span>
          {toast.msg}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-600 font-bold mb-1">Atendimentos</p>
            <h1 className="text-3xl font-bold text-slate-800">Chamados</h1>
          </div>
          <a href="/dashboard" className="text-slate-500 hover:text-slate-700 hover:underline font-medium text-sm transition-colors">← Voltar ao Painel</a>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 mb-10 border-t-4 border-t-blue-600">
          <h2 className="text-xl font-bold text-slate-800 mb-1">Registrar Novo Chamado</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <select required value={sectorId} onChange={e => setSectorId(e.target.value)} className="border border-slate-200 bg-white text-slate-800 p-3 rounded-xl border-l-4 border-l-red-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all">
              <option value="">Selecione o Setor Destino *</option>
              {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input required type="text" placeholder="Pessoa a ser atendida *" value={personAttended} onChange={e => setPersonAttended(e.target.value)} className="border border-slate-200 bg-white text-slate-800 p-3 rounded-xl placeholder-slate-300 border-l-4 border-l-red-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all" />
            <input required type="email" placeholder="E-mail da pessoa (Para atualizações) *" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="border border-slate-200 bg-white text-slate-800 p-3 rounded-xl placeholder-slate-300 border-l-4 border-l-red-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all md:col-span-2" />
            <input required type="text" placeholder="Qual o problema? *" value={description} onChange={e => setDescription(e.target.value)} className="border border-slate-200 bg-white text-slate-800 p-3 rounded-xl placeholder-slate-300 border-l-4 border-l-red-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all md:col-span-2" />
            <button type="submit" className="md:col-span-2 bg-blue-600 text-white p-4 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 text-base mt-2 shadow-sm hover:shadow-md">
              Abrir Chamado
            </button>
          </form>
        </div>

        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-bold mb-1">Acompanhamento</p>
            <h2 className="text-2xl font-bold text-slate-800">Chamados Pendentes</h2>
          </div>
          <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-full text-sm font-bold">{services.length} ativos</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map(srv => (
            <div key={srv.id} className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${srv.status === 'PENDENTE' ? 'border-l-red-500' : 'border-l-amber-500'}`}>
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-800 text-lg">{srv.sector.name}</h3>
                  <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${srv.status === 'PENDENTE' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                    {srv.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm text-slate-500">Falar com: <strong className="text-slate-700">{srv.personAttended}</strong></p>
                <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-xl mt-3">Problema: {srv.description}</p>
                
                <div className="mt-4 flex justify-between items-center text-xs text-slate-400 font-medium border-t border-slate-100 pt-3">
                  <span>⏳ {timeAgo(srv.createdAt)}</span>
                  <span>Técnicos: {srv.techs?.length || 0}</span>
                </div>
              </div>
              <a href={`/dashboard/external/${srv.id}`} className="mt-4 text-center bg-blue-50 border border-blue-100 text-blue-700 font-semibold py-2.5 rounded-xl hover:bg-blue-100 transition-all duration-200 shadow-sm text-sm">
                Gerenciar Chamado →
              </a>
            </div>
          ))}
          {services.length === 0 && <p className="text-slate-400 italic">Nenhum chamado pendente.</p>}
        </div>
      </div>
    </div>
  );
}