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

  const fetchData = async () => {
    const res = await fetch("/api/external");
    const data = await res.json();
    const lista = data.services || data || [];

    // MÁGICA: Filtra para mostrar apenas os que NÃO estão entregues/concluídos
    setServices(lista.filter((s: any) => s.status !== 'ENTREGUE'));

    const resSettings = await fetch("/api/settings");
    const dataSettings = await resSettings.json();
    setSectors(dataSettings.sectors || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/external", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectorId, personAttended, userEmail, description })
    });
    setSectorId(""); setPersonAttended(""); setUserEmail(""); setDescription("");
    fetchData();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Atendimentos Externos</h1>
          <a href="/dashboard" className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-lg">← Voltar ao Painel</a>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-10 border-t-4 border-blue-600 dark:border-blue-500">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Registrar Novo Chamado</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select required value={sectorId} onChange={e => setSectorId(e.target.value)} className="border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-3 rounded">
              <option value="">Selecione o Setor Destino</option>
              {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input required type="text" placeholder="Pessoa a ser atendida" value={personAttended} onChange={e => setPersonAttended(e.target.value)} className="border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-3 rounded placeholder-gray-400" />
            <input required type="email" placeholder="E-mail da pessoa (Para atualizações)" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-3 rounded md:col-span-2 placeholder-gray-400" />
            <input required type="text" placeholder="Qual o problema?" value={description} onChange={e => setDescription(e.target.value)} className="border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-3 rounded md:col-span-2 placeholder-gray-400" />
            <button type="submit" className="md:col-span-2 bg-blue-600 text-white p-4 rounded font-bold hover:bg-blue-700 transition text-lg mt-2">
              Abrir Chamado Externo
            </button>
          </form>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Chamados Pendentes / Em Andamento ({services.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map(srv => (
            <div key={srv.id} className={`bg-white dark:bg-gray-800 p-5 rounded-lg shadow border-l-4 flex flex-col justify-between ${srv.status === 'PENDENTE' ? 'border-red-500' : srv.status === 'EM_ANDAMENTO' ? 'border-yellow-500' : 'border-green-500'}`}>
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">{srv.sector.name}</h3>
                  <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${srv.status === 'PENDENTE' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100' : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100'}`}>
                    {srv.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Falar com: <strong>{srv.personAttended}</strong></p>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-2 rounded mt-2">Problema: {srv.description}</p>
                
                <div className="mt-3 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 font-medium">
                  <span>⏳ {timeAgo(srv.createdAt)}</span>
                  <span>Técnicos: {srv.techs?.length || 0}</span>
                </div>
              </div>
              <a href={`/dashboard/external/${srv.id}`} className="mt-4 text-center bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-800/60 transition">
                Gerenciar Chamados →
              </a>
            </div>
          ))}
          {services.length === 0 && <p className="text-gray-500 dark:text-gray-400 italic">Nenhum chamado pendente.</p>}
        </div>
      </div>
    </div>
  );
}