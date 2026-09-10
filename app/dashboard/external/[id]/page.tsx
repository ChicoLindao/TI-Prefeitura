"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

export default function ExternalServiceDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userRole, setUserRole] = useState("");
  const [selectedTech, setSelectedTech] = useState("");
  const [newLog, setNewLog] = useState("");
  const [status, setStatus] = useState("");

  const [isAddingTech, setIsAddingTech] = useState(false);
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    const res = await fetch(`/api/external/${id}`);
    if (!res.ok) return router.push("/dashboard");
    const json = await res.json();
    setData(json.service);
    setUsers(json.users);
    setStatus(json.service.status);
    setUserRole(json.currentUserRole);
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleTechChange = async (techIdToAdd: string, isRemove = false) => {
    setIsAddingTech(true);
    let currentTechIds = data.techs.map((t: any) => t.id);
    if (isRemove) { currentTechIds = currentTechIds.filter((tId: string) => tId !== techIdToAdd); } 
    else { if (currentTechIds.includes(techIdToAdd) || !techIdToAdd) { setIsAddingTech(false); return; } currentTechIds.push(techIdToAdd); }
    await fetch(`/api/external/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actionType: "UPDATE_TECHS", techIds: currentTechIds, addedTechId: !isRemove ? techIdToAdd : null }) });
    setSelectedTech(""); await fetchData(); setIsAddingTech(false);
  };

  const handleAddLog = async () => {
    if (!newLog) return;
    setIsSavingLog(true);
    await fetch(`/api/external/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actionType: "ADD_LOG", logText: newLog }) });
    setNewLog(""); await fetchData(); setIsSavingLog(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    await fetch(`/api/external/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actionType: "UPDATE_STATUS", status: newStatus }) });
    fetchData();
  };

  const handleDelete = async () => {
    if (!window.confirm("ATENÇÃO: Deseja apagar este atendimento e todo o seu histórico permanentemente?")) return;
    setIsDeleting(true);
    const res = await fetch(`/api/external/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/dashboard/external");
    else { alert("Erro ao excluir. Apenas administradores podem fazer isso."); setIsDeleting(false); }
  };

  if (!data) return <div className="p-8 text-gray-900 dark:text-white">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors p-8">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gerenciar Atendimento</h1>
          <div className="flex flex-wrap items-center gap-3">
            {userRole === "ADMINISTRADOR" && (
              <button onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition">
                {isDeleting ? "Apagando..." : "🗑️ Excluir Atendimento"}
              </button>
            )}
            <a href="/dashboard/external" className="text-gray-800 dark:text-gray-400 hover:underline font-medium text-lg ml-2">← Voltar</a>
          </div>
        </div>

        {/* ... Restante do código da tela externa que você já tem, idêntico, só adicionei o header com o botão acima */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Setor: {data.sector.name}</h2>
            <select value={status} onChange={(e) => handleStatusChange(e.target.value)} className="text-sm font-bold px-3 py-1.5 rounded-lg border-2 shadow-sm cursor-pointer focus:outline-none bg-gray-50 dark:bg-gray-800">
              <option value="PENDENTE">🔴 PENDENTE</option><option value="EM_ANDAMENTO">🟡 EM ANDAMENTO</option><option value="ENTREGUE">🟢 ENTREGUE / RESOLVIDO</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm bg-gray-50 dark:bg-gray-900/60 p-5 rounded-lg border border-gray-200 dark:border-gray-700 mb-6 shadow-inner">
            <div><span className="block text-[11px] text-gray-500 uppercase font-bold mb-1">Falar Com</span><span className="text-gray-900 dark:text-gray-100 font-medium">{data.personAttended}</span></div>
            <div><span className="block text-[11px] text-gray-500 uppercase font-bold mb-1">E-mail</span><span className="text-gray-900 dark:text-gray-100 font-medium truncate block">{data.userEmail || 'Não informado'}</span></div>
            <div><span className="block text-[11px] text-gray-500 uppercase font-bold mb-1">Solicitado em</span><span className="text-gray-900 dark:text-gray-100 font-medium">{new Date(data.createdAt).toLocaleString("pt-BR")}</span></div>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
            <h3 className="text-[11px] text-gray-500 uppercase font-bold tracking-wider mb-2">Problema Relatado:</h3>
            <p className="bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500 p-4 rounded-r-lg text-gray-800 dark:text-gray-200">{data.description}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 border-b dark:border-gray-700 pb-2">Técnicos Atribuídos</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {data.techs.map((t: any) => (
              <span key={t.id} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                {t.name} <button onClick={() => handleTechChange(t.id, true)} className="text-red-500 hover:text-red-700 font-bold ml-1">x</button>
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <select value={selectedTech} onChange={(e) => setSelectedTech(e.target.value)} className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white focus:outline-none">
              <option value="">Adicionar técnico...</option>{users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <button onClick={() => handleTechChange(selectedTech)} disabled={isAddingTech || !selectedTech} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg sm:w-[160px]">{isAddingTech ? "Adicionando..." : "Adicionar"}</button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 border-b dark:border-gray-700 pb-2">Registrar Atividade</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="text" value={newLog} onChange={(e) => setNewLog(e.target.value)} placeholder="Ex: Atendimento realizado, problema X encontrado..." className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white focus:outline-none" />
            <button onClick={handleAddLog} disabled={isSavingLog || !newLog} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg sm:w-[160px]">{isSavingLog ? "Salvando..." : "Salvar"}</button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 border-b dark:border-gray-700 pb-2">Histórico</h3>
          <div className="space-y-4">
            {data.logs.map((log: any) => (
              <div key={log.id} className="border-l-4 border-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded">
                <p className="text-sm text-gray-800 dark:text-gray-200">{log.description}</p>
                <p className="text-xs text-gray-500 mt-2">{new Date(log.createdAt).toLocaleString("pt-BR")} {log.tech && ` • Por: ${log.tech.name}`}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}