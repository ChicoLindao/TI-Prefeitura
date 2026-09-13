"use client";
import { useState, useEffect } from "react";

export default function GlobalSettings() {
  const [activeTab, setActiveTab] = useState("EQUIPE");
  
  // --- ESTADOS: EQUIPE, SETORES E EQUIPAMENTOS ---
  const [users, setUsers] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("FUNCIONARIO");

  const [sectors, setSectors] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");

  // --- ESTADOS: SEGURANÇA ---
  const [ipLimits, setIpLimits] = useState<any[]>([]);
  const [blockedEmails, setBlockedEmails] = useState<any[]>([]);
  const [alertEmails, setAlertEmails] = useState<any[]>([]);
  const [newBlockedEmail, setNewBlockedEmail] = useState("");
  const [newAlertEmail, setNewAlertEmail] = useState("");

  // --- ESTADOS: GLOBAIS (UX) ---
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [modal, setModal] = useState({ show: false, title: "", message: "", onConfirm: () => {} });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const fetchData = async () => {
    try {
      const resUsers = await fetch("/api/users");
      setUsers(await resUsers.json());
      
      const resSettings = await fetch("/api/settings");
      const dataSettings = await resSettings.json();
      setSectors(dataSettings.sectors);
      setDevices(dataSettings.devices);

      const resSecurity = await fetch("/api/security");
      if (resSecurity.ok) {
        const dataSecurity = await resSecurity.json();
        setIpLimits(dataSecurity.ipLimits || []);
        setBlockedEmails(dataSecurity.blockedEmails || []);
        setAlertEmails(dataSecurity.alertEmails || []);
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ==========================================
  // FUNÇÕES: EQUIPE, SETORES E EQUIPAMENTOS
  // ==========================================
  const handleAddOrEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEditing = !!editingId;
    const res = await fetch("/api/users", {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, name, email, role })
    });

    if (res.ok) { 
      resetUserForm(); 
      fetchData(); 
      showToast(isEditing ? "Usuário atualizado com sucesso!" : "Usuário salvo! (Senha inicial: suporteTI@2025)", "success"); 
    } else {
      showToast("Erro ao salvar usuário.", "error");
    }
  };

  const handleEditUser = (user: any) => {
    setEditingId(user.id);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setActiveTab("EQUIPE");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetPassword = () => {
    setModal({
      show: true,
      title: "Resetar Senha",
      message: "Tem certeza que deseja resetar a senha deste usuário para suporteTI@2025?",
      onConfirm: async () => {
        const res = await fetch("/api/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, name, email, role, resetPassword: true })
        });
        if(res.ok) showToast("Senha resetada com sucesso!", "success");
        else showToast("Erro ao resetar a senha.", "error");
      }
    });
  }

  const handleDeleteUser = (id: string) => {
    setModal({
      show: true,
      title: "Excluir Usuário",
      message: "Tem certeza que deseja remover este usuário permanentemente?",
      onConfirm: async () => {
        const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
        if(res.ok) {
          fetchData();
          showToast("Usuário removido com sucesso!", "success");
        } else {
          showToast("Erro ao excluir usuário.", "error");
        }
      }
    });
  };

  const resetUserForm = () => {
    setEditingId(null); setName(""); setEmail(""); setRole("FUNCIONARIO");
  };

  const handleAddOrEditItem = async (e: React.FormEvent, type: 'SECTOR' | 'DEVICE') => {
    e.preventDefault();
    const isEditing = !!editingItemId;
    
    const res = await fetch("/api/settings", {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEditing ? { id: editingItemId, type, name: newItemName } : { type, name: newItemName })
    });
    
    if (res.ok) { 
      setNewItemName(""); 
      setEditingItemId(null);
      fetchData();
      showToast("Cadastro salvo com sucesso!", "success"); 
    } else {
      showToast("Erro ao salvar cadastro.", "error");
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItemId(item.id);
    setNewItemName(item.name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteItem = (id: string, type: 'SECTOR' | 'DEVICE') => {
    setModal({
      show: true,
      title: "Atenção!",
      message: "Deseja mesmo excluir? (Não será possível se o item já estiver vinculado a algum chamado).",
      onConfirm: async () => {
        const res = await fetch(`/api/settings?type=${type}&id=${id}`, { method: "DELETE" });
        if (res.ok) {
          fetchData();
          showToast("Excluído com sucesso!", "success");
        } else {
          showToast("Erro: O item já está vinculado a um chamado ou equipamento.", "error");
        }
      }
    });
  };

  // ==========================================
  // FUNÇÕES: SEGURANÇA
  // ==========================================
  const handleAddSecurityEmail = async (e: React.FormEvent, action: 'addBlockedEmail' | 'addAlertEmail') => {
    e.preventDefault();
    const targetEmail = action === 'addBlockedEmail' ? newBlockedEmail : newAlertEmail;
    
    const res = await fetch("/api/security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, email: targetEmail }),
    });
    
    if (res.ok) {
      if (action === 'addBlockedEmail') setNewBlockedEmail("");
      else setNewAlertEmail("");
      fetchData();
      showToast("E-mail salvo com sucesso na segurança!", "success");
    } else {
      showToast("Erro ao adicionar e-mail.", "error");
    }
  };

  const handleSecurityAction = (id: string, action: 'removeBlockedEmail' | 'removeAlertEmail' | 'resetIp') => {
    const titles = {
      removeBlockedEmail: "Remover da Blacklist",
      removeAlertEmail: "Remover Alerta",
      resetIp: "Resetar IP"
    };
    const messages = {
      removeBlockedEmail: "Deseja remover este e-mail da lista de bloqueados?",
      removeAlertEmail: "Deseja remover este e-mail da lista de alertas?",
      resetIp: `Deseja zerar o contador do IP ${id}?`
    };

    setModal({
      show: true,
      title: titles[action],
      message: messages[action],
      onConfirm: async () => {
        const res = await fetch(`/api/security?action=${action}&id=${id}`, { method: "DELETE" });
        if (res.ok) {
          fetchData();
          showToast("Ação concluída com sucesso!", "success");
        } else {
          showToast("Erro ao executar ação de segurança.", "error");
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 transition-colors px-4 py-6 sm:p-8 relative">
      
      {/* TOAST */}
      {toast.show && (
        <div className={`fixed top-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 font-semibold transition-all duration-300 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <span className="text-xl">{toast.type === 'success' ? '✅' : '❌'}</span>
          {toast.message}
        </div>
      )}

      {/* MODAL */}
      {modal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">{modal.title}</h2>
            <p className="text-slate-500 mb-8 text-sm">{modal.message}</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setModal({ ...modal, show: false })} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-all text-sm">
                Cancelar
              </button>
              <button onClick={() => { modal.onConfirm(); setModal({ ...modal, show: false }); }} className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all text-sm shadow-sm hover:shadow-md">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-600 font-bold mb-1">Administração</p>
            <h1 className="text-3xl font-bold text-slate-800">Configurações Gerais</h1>
          </div>
          <a href="/dashboard" className="text-slate-500 hover:text-slate-700 hover:underline font-medium text-sm transition-colors">
            ← Voltar ao Painel
          </a>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-slate-200 mb-6">
          <button
            onClick={() => {setActiveTab("EQUIPE"); resetUserForm();}}
            className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all duration-200 ${
              activeTab === 'EQUIPE'
                ? 'border-slate-800 text-slate-800 bg-slate-50/50'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            👤 Gerenciar Equipe
          </button>
          <button
            onClick={() => {setActiveTab("SECTORS"); setEditingItemId(null); setNewItemName("");}}
            className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all duration-200 ${
              activeTab === 'SECTORS'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            🏢 Setores
          </button>
          <button
            onClick={() => {setActiveTab("DEVICES"); setEditingItemId(null); setNewItemName("");}}
            className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all duration-200 ${
              activeTab === 'DEVICES'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            💻 Tipos de Equipamentos
          </button>
          <button
            onClick={() => {setActiveTab("SECURITY");}}
            className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all duration-200 ${
              activeTab === 'SECURITY'
                ? 'border-red-600 text-red-600 bg-red-50/50'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            🛡️ Segurança e Alertas
          </button>
        </div>

        {/* =========================================
            CONTEÚDO DA ABA: SEGURANÇA
            ========================================= */}
        {activeTab === 'SECURITY' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Card: IPs com tentativas */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <span className="text-lg">🛡️</span>
                </div>
                <h2 className="text-lg font-bold text-slate-800">IPs Monitorados</h2>
              </div>
              {ipLimits.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Nenhum IP com tentativas registradas.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                  {ipLimits.map((ip: any) => (
                    <div key={ip.ip} className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">{ip.ip}</p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          ip.count > 3 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {ip.count} tentativas
                        </span>
                      </div>
                      <button onClick={() => handleSecurityAction(ip.ip, 'resetIp')} className="text-blue-600 font-semibold text-sm hover:text-blue-800 transition-colors hover:underline">
                        Resetar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card: E-mails Bloqueados */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <span className="text-lg">🚫</span>
                </div>
                <h2 className="text-lg font-bold text-slate-800">Blacklist (E-mails)</h2>
              </div>
              <form onSubmit={(e) => handleAddSecurityEmail(e, 'addBlockedEmail')} className="flex gap-2 mb-4">
                <input
                  required
                  type="email"
                  placeholder="Bloquear e-mail..."
                  value={newBlockedEmail}
                  onChange={e => setNewBlockedEmail(e.target.value)}
                  className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all text-sm"
                />
                <button type="submit" className="bg-red-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-red-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm whitespace-nowrap">
                  Bloquear
                </button>
              </form>
              {blockedEmails.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Nenhum e-mail bloqueado.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {blockedEmails.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="flex flex-col truncate mr-2">
                        <span className="text-slate-700 text-sm font-medium truncate">{b.email}</span>
                        {b.isTemporary ? (
                          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md w-fit mt-1 font-medium">
                            ⏳ Temporário {b.expiresAt ? `(Expira: ${new Date(b.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})` : ''}
                          </span>
                        ) : (
                          <span className="text-[11px] text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md w-fit mt-1 font-medium">
                            🚫 Permanente
                          </span>
                        )}
                      </div>
                      <button onClick={() => handleSecurityAction(b.id, 'removeBlockedEmail')} className="text-red-500 font-semibold text-sm hover:text-red-700 transition-colors hover:underline ml-2 whitespace-nowrap">
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card: E-mails de Alerta */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <span className="text-lg">🔔</span>
                </div>
                <h2 className="text-lg font-bold text-slate-800">Alertas de Spam</h2>
              </div>
              <form onSubmit={(e) => handleAddSecurityEmail(e, 'addAlertEmail')} className="flex gap-2 mb-4">
                <input
                  required
                  type="email"
                  placeholder="Adicionar TI..."
                  value={newAlertEmail}
                  onChange={e => setNewAlertEmail(e.target.value)}
                  className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all text-sm"
                />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm whitespace-nowrap">
                  Adicionar
                </button>
              </form>
              {alertEmails.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Nenhum e-mail de alerta cadastrado.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {alertEmails.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <span className="text-slate-700 text-sm font-medium truncate">{a.email}</span>
                      <button onClick={() => handleSecurityAction(a.id, 'removeAlertEmail')} className="text-red-500 font-semibold text-sm hover:text-red-700 transition-colors hover:underline ml-2">
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          
        /* =========================================
            CONTEÚDO DAS OUTRAS ABAS (EQUIPE/SETORES)
            ========================================= */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            {/* Formulário */}
            <div className="lg:col-span-1 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-slate-800 h-fit">
              <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">
                {activeTab === 'EQUIPE' ? (editingId ? 'Editar Técnico' : 'Novo Técnico') : (editingItemId ? 'Editar Cadastro' : (activeTab === 'SECTORS' ? 'Novo Setor' : 'Novo Equipamento'))}
              </h2>
              
              {activeTab === 'EQUIPE' ? (
                <form onSubmit={handleAddOrEditUser} className="space-y-4">
                  <input
                    required
                    type="text"
                    placeholder="Nome"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
                  />
                  <input
                    required
                    type="email"
                    placeholder="E-mail"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
                  />
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
                  >
                    <option value="FUNCIONARIO">Técnico Padrão</option>
                    <option value="ADMINISTRADOR">Administrador</option>
                  </select>
                  
                  <div className="flex gap-2 flex-col pt-2">
                    <button type="submit" className="w-full bg-slate-800 text-white px-4 py-3 rounded-xl font-semibold hover:bg-slate-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm">
                      {editingId ? 'Salvar Alterações' : 'Cadastrar Técnico'}
                    </button>
                    {editingId && (
                      <>
                        <button type="button" onClick={handleResetPassword} className="w-full bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2.5 rounded-xl font-semibold hover:bg-amber-100 transition-all text-sm">
                          Resetar Senha
                        </button>
                        <button type="button" onClick={resetUserForm} className="w-full text-slate-500 font-semibold hover:text-slate-700 hover:underline transition-colors text-sm mt-1">
                          Cancelar Edição
                        </button>
                      </>
                    )}
                  </div>
                </form>
              ) : (
                <form onSubmit={(e) => handleAddOrEditItem(e, activeTab === 'SECTORS' ? 'SECTOR' : 'DEVICE')} className="space-y-4">
                  <input
                    required
                    type="text"
                    placeholder="Digite o nome..."
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
                  />
                  <div className="flex flex-col gap-2">
                    <button type="submit" className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm">
                      {editingItemId ? 'Salvar Alterações' : 'Salvar Cadastro'}
                    </button>
                    {editingItemId && (
                      <button type="button" onClick={() => {setEditingItemId(null); setNewItemName("");}} className="w-full text-slate-500 font-semibold hover:text-slate-700 hover:underline transition-colors text-sm mt-1">
                        Cancelar Edição
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Tabela */}
            <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">Cadastros Ativos</h2>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="p-4 font-bold text-sm">Nome</th>
                    {activeTab === 'EQUIPE' && <th className="p-4 font-bold text-sm">Acesso</th>}
                    <th className="p-4 font-bold text-center text-sm w-32">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTab === 'EQUIPE' && users.map((u: any) => (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-800">
                        <strong className="font-semibold">{u.name}</strong><br />
                        <span className="text-sm text-slate-400">{u.email}</span>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          u.role === 'ADMINISTRADOR' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {u.role === 'ADMINISTRADOR' ? 'Admin' : 'Padrão'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-3">
                          <button onClick={() => handleEditUser(u)} className="text-blue-600 font-semibold text-sm hover:text-blue-800 transition-colors hover:underline">Editar</button>
                          <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 font-semibold text-sm hover:text-red-700 transition-colors hover:underline">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  
                  {activeTab === 'SECTORS' && sectors.map((s: any) => (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-800 font-medium">{s.name}</td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-3">
                          <button onClick={() => handleEditItem(s)} className="text-blue-600 font-semibold text-sm hover:text-blue-800 transition-colors hover:underline">Editar</button>
                          <button onClick={() => handleDeleteItem(s.id, 'SECTOR')} className="text-red-500 font-semibold text-sm hover:text-red-700 transition-colors hover:underline">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {activeTab === 'DEVICES' && devices.map((d: any) => (
                    <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-800 font-medium">{d.name}</td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-3">
                          <button onClick={() => handleEditItem(d)} className="text-blue-600 font-semibold text-sm hover:text-blue-800 transition-colors hover:underline">Editar</button>
                          <button onClick={() => handleDeleteItem(d.id, 'DEVICE')} className="text-red-500 font-semibold text-sm hover:text-red-700 transition-colors hover:underline">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}