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

export default function InternalMaintenance() {
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);

  const [patrimony, setPatrimony] = useState("");
  const [brand, setBrand] = useState("");
  const [equipmentUser, setEquipmentUser] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [originSectorId, setOriginSectorId] = useState("");
  const [deviceTypeId, setDeviceTypeId] = useState("");
  const [reportedProblem, setReportedProblem] = useState("");

  const [toast, setToast] = useState<{ show: boolean, msg: string, type: 'success' | 'error' | 'warning' }>({ show: false, msg: '', type: 'success' });

  const showToast = (msg: string, type: 'success' | 'error' | 'warning') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 4000);
  };

  const fetchData = async () => {
    const res = await fetch("/api/internal");
    const data = await res.json();
    const lista = data.maintenances || data || [];
    setMaintenances(lista.filter((m: any) => m.status !== 'ENTREGUE'));

    const resSettings = await fetch("/api/settings");
    const dataSettings = await resSettings.json();
    setSectors(dataSettings.sectors || []);
    setDevices(dataSettings.devices || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceTypeId || !originSectorId || !reportedProblem) {
      showToast("Atenção: 'Equipamento', 'Setor de Origem' e 'Problema' são obrigatórios!", "warning");
      return;
    }
    const res = await fetch("/api/internal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patrimony, brand, equipmentUser, userEmail, originSectorId, deviceTypeId, reportedProblem })
    });
    if (res.ok) {
      showToast("Ordem de serviço gerada com sucesso!", "success");
      setPatrimony(""); setBrand(""); setEquipmentUser(""); setUserEmail(""); setOriginSectorId(""); setDeviceTypeId(""); setReportedProblem("");
      fetchData();
    } else {
      showToast("Erro ao tentar cadastrar o equipamento. Tente novamente.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 transition-colors px-4 py-6 sm:p-8 relative">

      {toast.show && (
        <div className={`fixed top-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-semibold transition-all duration-300 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' :
          toast.type === 'error' ? 'bg-red-600 text-white' :
          'bg-amber-400 text-slate-900'
        }`}>
          <span className="text-xl">{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : '⚠️'}</span>
          {toast.msg}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-600 font-bold mb-1">Manutenção interna</p>
            <h1 className="text-3xl font-bold text-slate-800">Setor</h1>
          </div>
          <a href="/dashboard" className="text-slate-500 hover:text-slate-700 hover:underline font-medium text-sm transition-colors">← Voltar ao Painel</a>
        </div>

        {/* Form card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 mb-10 border-t-4 border-t-slate-800">
          <h2 className="text-xl font-bold text-slate-800 mb-1">Adicionar Equipamento na Bancada</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <select required value={deviceTypeId} onChange={e => setDeviceTypeId(e.target.value)} className="border border-slate-200 bg-white text-slate-800 p-3 rounded-xl border-l-4 border-l-red-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all">
              <option value="">Qual o equipamento? *</option>
              {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select required value={originSectorId} onChange={e => setOriginSectorId(e.target.value)} className="border border-slate-200 bg-white text-slate-800 p-3 rounded-xl border-l-4 border-l-red-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all">
              <option value="">De qual setor veio? *</option>
              {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="text" placeholder="Marca/Modelo (Opcional)" value={brand} onChange={e => setBrand(e.target.value)} className="border border-slate-200 bg-white text-slate-800 p-3 rounded-xl placeholder-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all" />
            <input type="text" placeholder="Nº Patrimônio (Opcional)" value={patrimony} onChange={e => setPatrimony(e.target.value)} className="border border-slate-200 bg-white text-slate-800 p-3 rounded-xl placeholder-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all" />
            <input type="text" placeholder="Nome do Usuário do Equipamento (Opcional)" value={equipmentUser} onChange={e => setEquipmentUser(e.target.value)} className="border border-slate-200 bg-white text-slate-800 p-3 rounded-xl placeholder-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all" />
            <input type="email" placeholder="E-mail para atualizações (Opcional)" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="border border-slate-200 bg-white text-slate-800 p-3 rounded-xl placeholder-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all" />
            <input required type="text" placeholder="Qual o problema relatado? *" value={reportedProblem} onChange={e => setReportedProblem(e.target.value)} className="border border-slate-200 bg-white text-slate-800 p-3 rounded-xl placeholder-slate-300 border-l-4 border-l-red-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all md:col-span-2" />
            <button type="submit" className="md:col-span-2 bg-slate-800 text-white p-4 rounded-xl font-semibold hover:bg-slate-700 transition-all duration-200 text-base mt-2 shadow-sm hover:shadow-md">
              Gerar Ordem de Serviço
            </button>
          </form>
        </div>

        {/* Pending list */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-bold mb-1">Bancada</p>
            <h2 className="text-2xl font-bold text-slate-800">Equipamentos Pendentes</h2>
          </div>
          <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-full text-sm font-bold">{maintenances.length} ativos</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {maintenances.map(maint => (
            <div key={maint.id} className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${maint.status === 'PENDENTE' ? 'border-l-red-500' : maint.status === 'EM_ANDAMENTO' ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-800 text-lg">{maint.deviceType.name}</h3>
                  <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${maint.status === 'PENDENTE' ? 'bg-red-50 text-red-700 border border-red-200' : maint.status === 'EM_ANDAMENTO' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {maint.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm text-slate-500">De: <strong className="text-slate-700">{maint.originSector.name}</strong></p>
                <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-xl mt-3">Defeito: {maint.reportedProblem}</p>
                <div className="mt-4 flex justify-between items-center text-xs text-slate-400 font-medium border-t border-slate-100 pt-3">
                  <span>⏳ {timeAgo(maint.receiveDate)}</span>
                  <span>Técnicos: {maint.techs?.length || 0}</span>
                </div>
              </div>
              <a href={`/dashboard/internal/${maint.id}`} className="mt-4 text-center bg-slate-100 border border-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl hover:bg-slate-200 transition-all duration-200 shadow-sm text-sm">
                Gerenciar OS →
              </a>
            </div>
          ))}
          {maintenances.length === 0 && <p className="text-slate-400 italic">Nenhum equipamento pendente na bancada.</p>}
        </div>
      </div>
    </div>
  );
}