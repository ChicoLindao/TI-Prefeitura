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

  // ESTADO DA NOTIFICAÇÃO FLUTUANTE
  const [toast, setToast] = useState<{ show: boolean, msg: string, type: 'success' | 'error' | 'warning' }>({ show: false, msg: '', type: 'success' });

  const showToast = (msg: string, type: 'success' | 'error' | 'warning') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 4000); // Some após 4 segundos
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors p-8 relative">
      
      {/* COMPONENTE DA NOTIFICAÇÃO FLUTUANTE */}
      {toast.show && (
        <div className={`fixed top-8 right-8 z-50 px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 font-bold transition-all duration-300 transform translate-y-0 opacity-100 ${
          toast.type === 'success' ? 'bg-green-600 text-white border-l-4 border-green-300' : 
          toast.type === 'error' ? 'bg-red-600 text-white border-l-4 border-red-300' : 
          'bg-yellow-400 text-gray-900 border-l-4 border-yellow-600'
        }`}>
          <span className="text-xl">
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : '⚠️'}
          </span>
          {toast.msg}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Setor</h1>
          <a href="/dashboard" className="text-gray-800 dark:text-gray-400 hover:underline font-medium text-lg">← Voltar ao Painel</a>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-10 border-t-4 border-gray-800 dark:border-gray-500">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Adicionar Equipamento no Setor</h2>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <select required value={deviceTypeId} onChange={e => setDeviceTypeId(e.target.value)} className="border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-3 rounded border-l-4 border-l-red-500 focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="">Qual o equipamento? *</option>
              {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            
            <select required value={originSectorId} onChange={e => setOriginSectorId(e.target.value)} className="border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-3 rounded border-l-4 border-l-red-500 focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="">De qual setor veio? *</option>
              {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <input type="text" placeholder="Marca/Modelo (Opcional)" value={brand} onChange={e => setBrand(e.target.value)} className="border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-3 rounded placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            <input type="text" placeholder="Nº Patrimônio (Opcional)" value={patrimony} onChange={e => setPatrimony(e.target.value)} className="border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-3 rounded placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            
            <input type="text" placeholder="Nome do Usuário do Equipamento (Opcional)" value={equipmentUser} onChange={e => setEquipmentUser(e.target.value)} className="border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-3 rounded placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            <input type="email" placeholder="E-mail para atualizações (Opcional)" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-3 rounded placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            
            <input required type="text" placeholder="Qual o problema relatado? *" value={reportedProblem} onChange={e => setReportedProblem(e.target.value)} className="border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-3 rounded md:col-span-2 placeholder-gray-400 border-l-4 border-l-red-500 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            
            <button type="submit" className="md:col-span-2 bg-gray-800 dark:bg-gray-600 text-white p-4 rounded font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition text-lg mt-2 shadow-md">
              Gerar Ordem de Serviço
            </button>
          </form>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Equipamentos Pendentes ({maintenances.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {maintenances.map(maint => (
            <div key={maint.id} className={`bg-white dark:bg-gray-800 p-5 rounded-lg shadow border-l-4 flex flex-col justify-between ${maint.status === 'PENDENTE' ? 'border-red-500' : maint.status === 'EM_ANDAMENTO' ? 'border-yellow-500' : 'border-green-500'}`}>
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">{maint.deviceType.name}</h3>
                  <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${maint.status === 'PENDENTE' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100' : maint.status === 'EM_ANDAMENTO' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100' : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'}`}>
                    {maint.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">De: <strong>{maint.originSector.name}</strong></p>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-2 rounded mt-2">Defeito: {maint.reportedProblem}</p>
                
                <div className="mt-3 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 font-medium">
                  <span>⏳ {timeAgo(maint.receiveDate)}</span>
                  <span>Técnicos: {maint.techs?.length || 0}</span>
                </div>
              </div>
              <a href={`/dashboard/internal/${maint.id}`} className="mt-4 text-center bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition shadow-sm">
                Gerenciar OS →
              </a>
            </div>
          ))}
          {maintenances.length === 0 && <p className="text-gray-500 dark:text-gray-400 italic">Nenhum equipamento pendente na bancada.</p>}
        </div>
      </div>
    </div>
  );
}