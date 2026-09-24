"use client";

import { useEffect, useState } from "react";

interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
  lastLogin: string | null;
  forceLogoutAt?: string | null;
  lastIp?: string;
  expiresAt?: Date;
}

export default function SessionManager() {
  const [activeSessions, setActiveSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [modal, setModal] = useState({ show: false, title: "", message: "", onConfirm: () => {} });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const fetchUsers = () => {
    // 🔴 FORÇA O NAVEGADOR A BUSCAR DADOS NOVOS IGNORANDO O CACHE
    fetch(`/api/users?t=${new Date().getTime()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const now = new Date().getTime();
          const SEIS_HORAS_MS = 6 * 60 * 60 * 1000;
          
          const onlineUsers = data
            .filter(user => {
              if (!user.lastLogin) return false;
              
              const loginTime = new Date(user.lastLogin).getTime();
              
              if (user.forceLogoutAt) {
                const logoutTime = new Date(user.forceLogoutAt).getTime();
                if (logoutTime >= loginTime) return false;
              }
              
              return (loginTime + SEIS_HORAS_MS) > now;
            })
            .map(user => {
              const loginTime = new Date(user.lastLogin as string).getTime();
              return {
                ...user,
                expiresAt: new Date(loginTime + SEIS_HORAS_MS)
              };
            });
            
          setActiveSessions(onlineUsers);
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();

    const handleWsUpdate = () => fetchUsers();
    window.addEventListener("atualiza-dados", handleWsUpdate);
    return () => window.removeEventListener("atualiza-dados", handleWsUpdate);
  }, []);

  const confirmLogout = (userId: string, userName: string) => {
    setModal({
      show: true,
      title: "Desconectar Técnico",
      message: `Tem certeza que deseja forçar a desconexão de ${userName}? A sessão será encerrada na mesma hora.`,
      onConfirm: () => executeForceLogout(userId)
    });
  };

  const executeForceLogout = async (userId: string) => {
    try {
      const res = await fetch("/api/users/force-logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Comando de expulsão enviado com sucesso!");
        // 🔴 ATUALIZA A TABELA IMEDIATAMENTE APÓS O SUCESSO
        fetchUsers(); 
      } else {
        showToast(data.error || "Erro ao tentar expulsar o usuário.", "error");
      }
    } catch (error) {
      showToast("Erro de comunicação com o servidor.", "error");
    }
  };

  if (loading) return <p className="text-gray-500 text-sm">Carregando sessões ativas...</p>;

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200 mt-6">
      
      {toast.show && (
        <div className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 font-semibold transition-all duration-300 text-base ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <span className="text-xl">{toast.type === 'success' ? '✅' : '❌'}</span>
          {toast.message}
        </div>
      )}

      {modal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl">⚠️</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">{modal.title}</h2>
            <p className="text-slate-500 mb-6 text-sm">{modal.message}</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setModal({ ...modal, show: false })} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-all text-sm">
                Cancelar
              </button>
              <button onClick={() => { modal.onConfirm(); setModal({ ...modal, show: false }); }} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all text-sm">
                Desconectar
              </button>
            </div>
          </div>
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-800 mb-2">🛡️ Técnicos Online (Sessões Ativas)</h3>
      <p className="text-sm text-gray-500 mb-4">
        Lista de técnicos que estão autenticados no sistema no momento.
      </p>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-3">Técnico</th>
              <th className="p-3">E-mail</th>
              <th className="p-3">Último IP</th>
              <th className="p-3">Desconexão Automática (Fim da Sessão)</th>
              <th className="p-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {activeSessions.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">
                  Nenhum outro técnico online no momento.
                </td>
              </tr>
            ) : (
              activeSessions.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-700">{user.name}</td>
                  <td className="p-3 text-gray-600">{user.email}</td>
                  <td className="p-3 text-gray-500 font-mono text-xs">{user.lastIp}</td>
                  <td className="p-3 text-gray-500">
                    Hoje, às {user.expiresAt?.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => confirmLogout(user.id, user.name)}
                      className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white rounded text-xs font-bold transition-colors"
                    >
                      Derrubar Sessão
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}