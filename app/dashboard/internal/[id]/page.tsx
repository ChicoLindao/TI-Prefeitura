"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

export default function InternalMaintenanceDetails({ params }: { params: Promise<{ id: string }> }) {
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
    action?: "DELETE_OS" | "DELETE_LOG";
  }>({ isOpen: false, title: "", message: "", type: "alert" });

  const fetchData = async () => {
    const res = await fetch(`/api/internal/${id}`);
    if (!res.ok) return router.push("/dashboard");
    const json = await res.json();
    setData(json.maintenance);
    setUsers(json.users);
    setStatus(json.maintenance.status);
    setUserRole(json.currentUserRole);
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleTechChange = async (techIdToAdd: string, isRemove = false) => {
    setIsAddingTech(true);
    let currentTechIds = data.techs.map((t: any) => t.id);
    if (isRemove) { currentTechIds = currentTechIds.filter((tId: string) => tId !== techIdToAdd); } 
    else { if (currentTechIds.includes(techIdToAdd) || !techIdToAdd) { setIsAddingTech(false); return; } currentTechIds.push(techIdToAdd); }
    await fetch(`/api/internal/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actionType: "UPDATE_TECHS", techIds: currentTechIds, addedTechId: !isRemove ? techIdToAdd : null }) });
    setSelectedTech(""); await fetchData(); setIsAddingTech(false);
  };

  const handleAddLog = async () => {
    if (!newLog) return;
    setIsSavingLog(true);
    await fetch(`/api/internal/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actionType: "ADD_ACTION", actionText: newLog }) });
    setNewLog(""); await fetchData(); setIsSavingLog(false);
  };

  // Envia a edição do Log para a API
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
    await fetch(`/api/internal/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actionType: "UPDATE_STATUS", status: newStatus }) });
    fetchData();
  };

  const handleConfirmModal = async () => {
    setModalState(prev => ({ ...prev, isOpen: false })); 

    if (modalState.action === "DELETE_LOG" && modalState.targetId) {
      const res = await fetch(`/api/internal/logs/${modalState.targetId}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      } else {
        setTimeout(() => setModalState({ isOpen: true, title: "Erro", message: "Erro ao remover atividade.", type: "alert" }), 300);
      }
    } 
    
    else if (modalState.action === "DELETE_OS") {
      setIsDeleting(true);
      const res = await fetch(`/api/internal/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard/internal");
      } else {
        setIsDeleting(false);
        setTimeout(() => setModalState({ isOpen: true, title: "Acesso Negado", message: "Erro ao excluir. Apenas administradores podem fazer isso.", type: "alert" }), 300);
      }
    }
  };

  const statusConfig: Record<string, { label: string; badge: string; dot: string }> = {
    PENDENTE: { label: "Pendente", badge: "bg-red-50 text-red-700 border border-red-200", dot: "bg-red-500" },
    EM_ANDAMENTO: { label: "Em andamento", badge: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" },
    PRONTO_PARA_RETIRADA: { label: "Pronto para retirada", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500" },
    ENTREGUE: { label: "Entregue", badge: "bg-slate-100 text-slate-600 border border-slate-200", dot: "bg-slate-400" },
  };
  const currentStatus = statusConfig[status] || statusConfig.PENDENTE;

  if (!data) return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-8 text-slate-500">Carregando...</div>;
  
  const filteredLogs = data.logs;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 transition-colors px-4 py-6 sm:p-8 print:p-0 print:bg-white print:text-black relative">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 print:hidden gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-600 font-bold mb-1">Ordem de serviço</p>
            <h1 className="text-3xl font-bold text-slate-800">Gerenciar Manutenção</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {userRole === "ADMINISTRADOR" && (
              <button 
                onClick={() => setModalState({
                  isOpen: true,
                  title: "Excluir Ordem de Serviço",
                  message: "Tem certeza que deseja apagar esta OS permanentemente? Esta ação não pode ser desfeita.",
                  type: "confirm",
                  action: "DELETE_OS"
                })} 
                disabled={isDeleting} 
                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-2.5 rounded-xl font-semibold shadow-sm transition-all duration-200 text-sm"
              >
                {isDeleting ? "Apagando..." : "Excluir OS"}
              </button>
            )}
            <button onClick={() => window.print()} className="bg-slate-800 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm">
              Imprimir OS
            </button>
            <a href="/dashboard/internal" className="text-slate-500 hover:text-slate-700 hover:underline font-medium text-sm transition-colors ml-1">← Voltar</a>
          </div>
        </div>

        {/* Print header */}
        <div className="hidden print:block text-center mb-4 border-b-2 border-black pb-2">
          <h1 className="text-xl font-bold uppercase tracking-widest text-black">Ordem de Serviço</h1>
          <p className="text-gray-800 text-xs mt-1">ID: {data.id.substring(0, 8).toUpperCase()}</p>
        </div>

        {/* Main info card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 mb-8 print:shadow-none print:border print:border-gray-300 print:mb-3 print:p-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 print:mb-2 gap-4">
            <div className="flex items-center gap-3">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${currentStatus.dot} print:hidden`} />
              <h2 className="text-2xl font-bold text-slate-800 print:text-lg print:text-black">{data.deviceType.name} {data.brand !== 'Não informada' && `(${data.brand})`}</h2>
            </div>
            <div className="print:hidden">
              <select 
                value={status} 
                onChange={(e) => handleStatusChange(e.target.value)} 
                className="text-sm font-semibold px-4 py-2 rounded-xl border border-slate-200 shadow-sm cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none bg-white text-slate-700 transition-all"
              >
                <option value="PENDENTE">🔴 Pendente</option>
                <option value="EM_ANDAMENTO">🟡 Em andamento</option>
                <option value="PRONTO_PARA_RETIRADA">🟢 Pronto para retirada</option>
                <option value="ENTREGUE">⚪ Entregue</option>
              </select>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-slate-50 p-5 rounded-xl border border-slate-100 mb-6 print:bg-white print:border-none print:p-0 print:gap-2 print:mb-2 print:text-xs">
            <div className="print:border-b print:border-gray-300 print:pb-1">
              <span className="block text-[11px] text-slate-400 uppercase font-bold mb-1 tracking-wider print:text-gray-700">Setor Origem</span>
              <span className="font-medium text-slate-700 print:text-black">{data.originSector.name}</span>
            </div>
            <div className="print:border-b print:border-gray-300 print:pb-1">
              <span className="block text-[11px] text-slate-400 uppercase font-bold mb-1 tracking-wider print:text-gray-700">Usuário</span>
              <span className="font-medium text-slate-700 print:text-black">{data.equipmentUser}</span>
            </div>
            <div className="print:border-b print:border-gray-300 print:pb-1">
              <span className="block text-[11px] text-slate-400 uppercase font-bold mb-1 tracking-wider print:text-gray-700">Nº Patrimônio</span>
              <span className="font-medium text-slate-700 print:text-black">{data.patrimony || 'Não informado'}</span>
            </div>
            <div className="print:border-b print:border-gray-300 print:pb-1">
              <span className="block text-[11px] text-slate-400 uppercase font-bold mb-1 tracking-wider print:text-gray-700">Entrada</span>
              <span className="font-medium text-slate-700 print:text-black">{new Date(data.receiveDate).toLocaleString("pt-BR")}</span>
            </div>
          </div>

          {/* Reported problem */}
          <div className="border-t border-slate-100 pt-6 print:border-none print:pt-2">
            <h3 className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-2 print:text-gray-800">Problema Relatado:</h3>
            <p className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl text-slate-700 print:bg-white print:border print:border-gray-400 print:text-black print:rounded-none print:p-2 print:text-sm">{data.reportedProblem}</p>
          </div>
        </div>

        {/* Techs card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 mb-8 print:shadow-none print:border print:border-gray-300 print:mb-3 print:p-3">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3 print:text-sm print:text-black print:border-gray-400 print:mb-2">Técnicos Atribuídos</h3>
          <div className="flex flex-wrap gap-2 print:mb-0">
            {data.techs.length === 0 && <span className="text-sm text-slate-400 italic print:hidden">Nenhum técnico atribuído.</span>}
            {data.techs.map((t: any) => (
              <span key={t.id} className="bg-blue-50 text-blue-700 border border-blue-100 px-3.5 py-1.5 rounded-full text-sm flex items-center gap-2 font-medium print:border-none print:bg-transparent print:text-black print:p-0">
                {t.name} 
                <button onClick={() => handleTechChange(t.id, true)} className="text-red-400 hover:text-red-600 font-bold ml-0.5 text-xs print:hidden">✕</button>
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4 print:hidden">
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
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 mb-8 print:hidden">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">Registrar Atividade</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="text" value={newLog} onChange={(e) => setNewLog(e.target.value)} placeholder="Ex: Formatação concluída..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all" />
            <button onClick={handleAddLog} disabled={isSavingLog || !newLog} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-xl sm:w-[160px] transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
              {isSavingLog ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

        {/* Timeline / History (CORRIGIDO PARA IMPRESSÃO) */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 print:shadow-none print:border print:border-gray-300 print:p-3">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3 print:text-sm print:text-black print:border-gray-400 print:mb-0">Histórico de Atividades</h3>
          {filteredLogs.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-4">Nenhuma atividade registrada ainda.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200 print:hidden" />
              <div className="space-y-5 print:space-y-0">
                {filteredLogs.map((log: any, index: number) => (
                  // 🔥 A MÁGICA ACONTECE AQUI: print:py-3 e a lógica da borda!
                  <div key={log.id} className={`relative pl-8 print:pl-0 print:py-3 ${index !== filteredLogs.length - 1 ? 'print:border-b print:border-gray-300' : ''}`}>
                    <div className="absolute left-[3px] top-1.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-50 print:hidden" />
                    
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl print:bg-transparent print:border-none print:p-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      
                      {editingLogId === log.id ? (
                        <div className="flex flex-col sm:flex-row gap-3 w-full items-center print:hidden">
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
                            <p className="text-sm text-slate-700 font-medium print:text-xs print:text-black">{log.action}</p>
                            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5 print:text-gray-700 print:font-bold print:mt-1">
                              <span>{new Date(log.createdAt).toLocaleString("pt-BR")}</span>
                              {log.tech && <><span>•</span><span>Por: {log.tech.name}</span></>}
                            </p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0 print:hidden">
                            <button 
                              onClick={() => { setEditingLogId(log.id); setEditingLogText(log.action); }} 
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

        {/* Print signatures */}
        <div className="hidden print:flex justify-between items-end mt-12 pt-4">
          <div className="text-center w-64"><div className="border-t border-black mb-1"></div><p className="text-black font-bold text-[10px]">Assinatura do Técnico</p></div>
          <div className="text-center w-64"><div className="border-t border-black mb-1"></div><p className="text-black font-bold text-[10px]">Assinatura do Usuário</p></div>
        </div>
      </div>

      {/* MODAL PADRÃO */}
      {modalState.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:hidden">
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