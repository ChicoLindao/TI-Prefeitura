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

  // Estados para edição do log
  const [editingLogId, setEditingLogId] = useState("");
  const [editingLogText, setEditingLogText] = useState("");

  // Estado para o Modal padronizado
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "alert" | "confirm";
    targetId?: string;
    action?: "DELETE_SERVICE" | "DELETE_LOG";
  }>({ isOpen: false, title: "", message: "", type: "alert" });

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

  const handleEditLog = async (logId: string) => {
    if (!editingLogText) return;
    const res = await fetch(`/api/internal/logs/${logId}`, { 
      method: "PATCH", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ text: editingLogText }) 
    });
    if (res.ok) { 
      setEditingLogId(""); 
      fetchData(); 
    } else { 
      setTimeout(() => setModalState({ isOpen: true, title: "Erro", message: "Erro ao editar atividade.", type: "alert" }), 300);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    await fetch(`/api/external/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actionType: "UPDATE_STATUS", status: newStatus }) });
    fetchData();
  };

  // Processa a ação quando o usuário clica em "Excluir" no modal
  const handleConfirmModal = async () => {
    setModalState(prev => ({ ...prev, isOpen: false })); 

    if (modalState.action === "DELETE_LOG" && modalState.targetId) {
      // Como a nossa API de logs apaga tanto interno quanto externo no mesmo lugar, chamamos a mesma rota
      const res = await fetch(`/api/internal/logs/${modalState.targetId}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      } else {
        setTimeout(() => setModalState({ isOpen: true, title: "Erro", message: "Erro ao remover atividade.", type: "alert" }), 300);
      }
    } 
    
    else if (modalState.action === "DELETE_SERVICE") {
      setIsDeleting(true);
      const res = await fetch(`/api/external/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard/external");
      } else {
        setIsDeleting(false);
        setTimeout(() => setModalState({ isOpen: true, title: "Acesso Negado", message: "Erro ao excluir. Apenas administradores podem fazer isso.", type: "alert" }), 300);
      }
    }
  };

  const statusConfig: Record<string, { label: string; badge: string; dot: string }> = {
    PENDENTE: { label: "Pendente", badge: "bg-red-50 text-red-700 border border-red-200", dot: "bg-red-500" },
    EM_ANDAMENTO: { label: "Em andamento", badge: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" },
    ENTREGUE: { label: "Entregue / Resolvido", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500" },
  };
  const currentStatus = statusConfig[status] || statusConfig.PENDENTE;

  if (!data) return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-8 text-slate-500">Carregando...</div>;
  
  // Exibir todos os logs, sem esconder as alterações automáticas de status
  const filteredLogs = data.logs;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 transition-colors px-4 py-6 sm:p-8 relative">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-600 font-bold mb-1">Atendimento externo</p>
            <h1 className="text-3xl font-bold text-slate-800">Gerenciar Atendimento</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {userRole === "ADMINISTRADOR" && (
              <button 
                onClick={() => setModalState({
                  isOpen: true,
                  title: "Excluir Atendimento",
                  message: "Tem certeza que deseja apagar este atendimento permanentemente? Esta ação não pode ser desfeita.",
                  type: "confirm",
                  action: "DELETE_SERVICE"
                })} 
                disabled={isDeleting} 
                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-2.5 rounded-xl font-semibold shadow-sm transition-all duration-200 text-sm"
              >
                {isDeleting ? "Apagando..." : "Excluir Atendimento"}
              </button>
            )}
            <a href="/dashboard/external" className="text-slate-500 hover:text-slate-700 hover:underline font-medium text-sm transition-colors ml-1">← Voltar</a>
          </div>
        </div>

        {/* Main info card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex items-center gap-3">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${currentStatus.dot}`} />
              <h2 className="text-2xl font-bold text-slate-800">Setor: {data.sector.name}</h2>
            </div>
            <select 
              value={status} 
              onChange={(e) => handleStatusChange(e.target.value)} 
              className="text-sm font-semibold px-4 py-2 rounded-xl border border-slate-200 shadow-sm cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none bg-white text-slate-700 transition-all"
            >
              <option value="PENDENTE">🔴 Pendente</option>
              <option value="EM_ANDAMENTO">🟡 Em andamento</option>
              <option value="ENTREGUE">🟢 Entregue / Resolvido</option>
            </select>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm bg-slate-50 p-5 rounded-xl border border-slate-100 mb-6">
            <div>
              <span className="block text-[11px] text-slate-400 uppercase font-bold mb-1 tracking-wider">Falar Com</span>
              <span className="font-medium text-slate-700">{data.personAttended}</span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-400 uppercase font-bold mb-1 tracking-wider">E-mail</span>
              <span className="font-medium text-slate-700 truncate block">{data.userEmail || 'Não informado'}</span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-400 uppercase font-bold mb-1 tracking-wider">Solicitado em</span>
              <span className="font-medium text-slate-700">{new Date(data.createdAt).toLocaleString("pt-BR")}</span>
            </div>
          </div>

          {/* Reported problem */}
          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-2">Problema Relatado:</h3>
            <p className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl text-slate-700 text-sm">{data.description}</p>
          </div>
        </div>

        {/* Techs card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">Técnicos Atribuídos</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {data.techs.length === 0 && <span className="text-sm text-slate-400 italic">Nenhum técnico atribuído.</span>}
            {data.techs.map((t: any) => (
              <span key={t.id} className="bg-blue-50 text-blue-700 border border-blue-100 px-3.5 py-1.5 rounded-full text-sm flex items-center gap-2 font-medium">
                {t.name} 
                <button onClick={() => handleTechChange(t.id, true)} className="text-red-400 hover:text-red-600 font-bold ml-0.5 text-xs">✕</button>
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <select value={selectedTech} onChange={(e) => setSelectedTech(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all">
              <option value="">Adicionar técnico...</option>
              {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <button onClick={() => handleTechChange(selectedTech)} disabled={isAddingTech || !selectedTech} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl sm:w-[160px] transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
              {isAddingTech ? "Adicionando..." : "Adicionar"}
            </button>
          </div>
        </div>

        {/* Log input card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">Registrar Atividade</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="text" value={newLog} onChange={(e) => setNewLog(e.target.value)} placeholder="Ex: Atendimento realizado..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all" />
            <button onClick={handleAddLog} disabled={isSavingLog || !newLog} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-xl sm:w-[160px] transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
              {isSavingLog ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

        {/* Timeline / History */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">Histórico de Atividades</h3>
          {filteredLogs.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-4">Nenhuma atividade registrada ainda.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
              <div className="space-y-5">
                {filteredLogs.map((log: any) => (
                  <div key={log.id} className="relative pl-8">
                    <div className="absolute left-[3px] top-1.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-50" />
                    
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      
                      {editingLogId === log.id ? (
                        <div className="flex flex-col sm:flex-row gap-3 w-full items-center">
                          <input 
                            type="text" 
                            value={editingLogText} 
                            onChange={(e) => setEditingLogText(e.target.value)} 
                            className="flex-1 p-2.5 border border-blue-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" 
                            autoFocus
                          />
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => setEditingLogId("")} className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors">Cancelar</button>
                            <button onClick={() => handleEditLog(log.id)} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm">Salvar</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <p className="text-sm text-slate-700 font-medium">{log.description}</p>
                            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                              <span>{new Date(log.createdAt).toLocaleString("pt-BR")}</span>
                              {log.tech && <><span>•</span><span>Por: {log.tech.name}</span></>}
                            </p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button 
                              onClick={() => { setEditingLogId(log.id); setEditingLogText(log.description); }} 
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg font-semibold shadow-sm transition-colors duration-200 text-xs"
                            >
                              Editar
                            </button>
                            <button 
                              onClick={() => setModalState({
                                isOpen: true,
                                title: "Apagar Atividade",
                                message: "Tem certeza que deseja apagar esta atividade do histórico? Esta ação não pode ser desfeita.",
                                type: "confirm",
                                targetId: log.id,
                                action: "DELETE_LOG"
                              })}
                              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-2 rounded-lg font-semibold shadow-sm transition-colors duration-200 text-xs"
                            >
                              Excluir
                            </button>
                          </div>
                        </>
                      )}

                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL PADRÃO DO TAILWIND */}
      {modalState.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">{modalState.title}</h2>
            <p className="text-slate-500 mb-8 text-sm">{modalState.message}</p>
            <div className="flex justify-center gap-3">
              {modalState.type === "confirm" && (
                <button 
                  onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))} 
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-all text-sm"
                >
                  Cancelar
                </button>
              )}
              <button 
                onClick={handleConfirmModal} 
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all text-sm shadow-sm hover:shadow-md"
              >
                {modalState.type === "confirm" ? "Excluir" : "Entendi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}