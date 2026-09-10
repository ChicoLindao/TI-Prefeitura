"use client";
import { useState, useEffect } from "react";

export default function GlobalSettings() {
  const [activeTab, setActiveTab] = useState("EQUIPE");
  
  const [users, setUsers] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("FUNCIONARIO");

  const [sectors, setSectors] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");

  // --- NOVOS ESTADOS: NOTIFICAÇÕES E MODAL GENÉRICO ---
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [modal, setModal] = useState({ show: false, title: "", message: "", onConfirm: () => {} });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const fetchData = async () => {
    const resUsers = await fetch("/api/users");
    setUsers(await resUsers.json());
    
    const resSettings = await fetch("/api/settings");
    const dataSettings = await resSettings.json();
    setSectors(dataSettings.sectors);
    setDevices(dataSettings.devices);
  };

  useEffect(() => { fetchData(); }, []);

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors p-8 relative">
      
      {/* TOAST FLUTUANTE */}
      {toast.show && (
        <div className={`fixed top-5 right-5 px-6 py-3 rounded-lg shadow-lg font-bold text-white transition-opacity z-50 animate-bounce ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.type === 'success' ? '✅ ' : '❌ '}{toast.message}
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO GENÉRICO */}
      {modal.show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl max-w-sm w-full text-center">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{modal.title}</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">{modal.message}</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setModal({ ...modal, show: false })} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded font-bold text-gray-800 dark:text-white transition">Cancelar</button>
              <button onClick={() => { modal.onConfirm(); setModal({ ...modal, show: false }); }} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configurações Gerais</h1>
          <a href="/dashboard" className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-lg">← Voltar ao Painel</a>
        </div>

        <div className="flex gap-4 mb-8 border-b-2 border-gray-200 dark:border-gray-700 pb-2">
          <button onClick={() => {setActiveTab("EQUIPE"); resetUserForm();}} className={`font-bold pb-2 px-2 text-lg transition-colors ${activeTab === 'EQUIPE' ? 'border-b-4 border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>👤 Gerenciar Equipe</button>
          <button onClick={() => {setActiveTab("SECTORS"); setEditingItemId(null); setNewItemName("");}} className={`font-bold pb-2 px-2 text-lg transition-colors ${activeTab === 'SECTORS' ? 'border-b-4 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>🏢 Setores</button>
          <button onClick={() => {setActiveTab("DEVICES"); setEditingItemId(null); setNewItemName("");}} className={`font-bold pb-2 px-2 text-lg transition-colors ${activeTab === 'DEVICES' ? 'border-b-4 border-purple-600 dark:border-purple-500 text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>💻 Tipos de Equipamentos</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow h-fit border-t-4 border-gray-900 dark:border-gray-500">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {activeTab === 'EQUIPE' ? (editingId ? 'Editar Técnico' : 'Novo Técnico') : (editingItemId ? 'Editar Cadastro' : (activeTab === 'SECTORS' ? 'Novo Setor' : 'Novo Equipamento'))}
            </h2>
            
            {activeTab === 'EQUIPE' ? (
              <form onSubmit={handleAddOrEditUser} className="space-y-4">
                <input required type="text" placeholder="Nome" value={name} onChange={e => setName(e.target.value)} className="w-full border dark:border-gray-600 p-3 rounded text-gray-900 dark:text-white font-medium bg-gray-50 dark:bg-gray-700 placeholder-gray-400" />
                <input required type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} className="w-full border dark:border-gray-600 p-3 rounded text-gray-900 dark:text-white font-medium bg-gray-50 dark:bg-gray-700 placeholder-gray-400" />
                <select value={role} onChange={e => setRole(e.target.value)} className="w-full border dark:border-gray-600 p-3 rounded text-gray-900 dark:text-white font-medium bg-gray-50 dark:bg-gray-700">
                  <option value="FUNCIONARIO">Técnico Padrão</option>
                  <option value="ADMINISTRADOR">Administrador</option>
                </select>
                
                <div className="flex gap-2 flex-col pt-2">
                  <button type="submit" className="w-full bg-gray-800 dark:bg-gray-600 text-white px-4 py-3 rounded font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition">
                    {editingId ? 'Salvar Alterações' : 'Cadastrar Técnico'}
                  </button>
                  
                  {editingId && (
                    <>
                      <button type="button" onClick={handleResetPassword} className="w-full bg-yellow-500 dark:bg-yellow-600 text-yellow-900 dark:text-yellow-100 px-4 py-2 rounded font-bold hover:bg-yellow-600 dark:hover:bg-yellow-500 transition">
                        Resetar Senha
                      </button>
                      <button type="button" onClick={resetUserForm} className="w-full text-gray-600 dark:text-gray-400 font-bold hover:underline mt-2">
                        Cancelar Edição
                      </button>
                    </>
                  )}
                </div>
              </form>
            ) : (
              <form onSubmit={(e) => handleAddOrEditItem(e, activeTab === 'SECTORS' ? 'SECTOR' : 'DEVICE')} className="space-y-4">
                <input required type="text" placeholder="Digite o nome..." value={newItemName} onChange={e => setNewItemName(e.target.value)} className="w-full border dark:border-gray-600 p-3 rounded text-gray-900 dark:text-white font-medium bg-gray-50 dark:bg-gray-700 placeholder-gray-400" />
                <div className="flex flex-col gap-2">
                  <button type="submit" className="w-full bg-blue-600 text-white px-4 py-3 rounded font-bold hover:bg-blue-700 transition">
                    {editingItemId ? 'Salvar Alterações' : 'Salvar Cadastro'}
                  </button>
                  {editingItemId && (
                    <button type="button" onClick={() => {setEditingItemId(null); setNewItemName("");}} className="w-full text-gray-600 dark:text-gray-400 font-bold hover:underline mt-2">
                      Cancelar Edição
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Cadastros Ativos</h2>
            
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600 text-gray-800 dark:text-gray-200">
                  <th className="p-3 font-bold">Nome</th>
                  {activeTab === 'EQUIPE' && <th className="p-3 font-bold">Acesso</th>}
                  <th className="p-3 font-bold text-center w-32">Ações</th>
                </tr>
              </thead>
              <tbody>
                {activeTab === 'EQUIPE' && users.map(u => (
                  <tr key={u.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="p-3 text-gray-900 dark:text-white"><strong>{u.name}</strong><br/><span className="text-sm text-gray-600 dark:text-gray-400">{u.email}</span></td>
                    <td className="p-3"><span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">{u.role === 'ADMINISTRADOR' ? 'Admin' : 'Padrão'}</span></td>
                    <td className="p-3 text-center space-x-3">
                      <button onClick={() => handleEditUser(u)} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Editar</button>
                      <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 dark:text-red-400 font-bold hover:underline">Excluir</button>
                    </td>
                  </tr>
                ))}
                
                {activeTab === 'SECTORS' && sectors.map(s => (
                  <tr key={s.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="p-3 text-gray-900 dark:text-white font-medium">{s.name}</td>
                    <td className="p-3 text-center space-x-3">
                      <button onClick={() => handleEditItem(s)} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Editar</button>
                      <button onClick={() => handleDeleteItem(s.id, 'SECTOR')} className="text-red-600 dark:text-red-400 font-bold hover:underline">Excluir</button>
                    </td>
                  </tr>
                ))}

                {activeTab === 'DEVICES' && devices.map(d => (
                  <tr key={d.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="p-3 text-gray-900 dark:text-white font-medium">{d.name}</td>
                    <td className="p-3 text-center space-x-3">
                      <button onClick={() => handleEditItem(d)} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Editar</button>
                      <button onClick={() => handleDeleteItem(d.id, 'DEVICE')} className="text-red-600 dark:text-red-400 font-bold hover:underline">Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}