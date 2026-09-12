"use client";
import { useState, useEffect } from "react";

export default function MyProfile() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setName(data.name);
        setEmail(data.email);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (res.ok) {
      setMessage({ text: "Perfil atualizado com sucesso! (Se alterou o e-mail, pode ser necessário fazer login novamente na próxima vez).", type: "success" });
      setPassword(""); 
    } else {
      setMessage({ text: "Erro ao atualizar perfil. O e-mail pode já estar em uso.", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 transition-colors px-4 py-6 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-600 font-bold mb-1">Conta</p>
            <h1 className="text-3xl font-bold text-slate-800">Meu Perfil</h1>
          </div>
          <a href="/dashboard" className="text-slate-500 hover:text-slate-700 hover:underline font-medium text-sm transition-colors">
            ← Voltar ao Painel
          </a>
        </div>

        {/* Toast */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-semibold flex items-start gap-3 transition-all duration-300 ${
            message.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            <span className="text-base leading-relaxed">{message.type === 'error' ? '⚠️' : '✅'}</span>
            <span>{message.text}</span>
          </div>
        )}

        {/* Card principal */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-blue-600">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome (fixo) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Meu Nome (Fixo)</label>
              <input
                type="text"
                value={name}
                disabled
                className="w-full border border-slate-200 p-3 rounded-xl text-slate-400 font-medium bg-slate-50 cursor-not-allowed"
              />
              <p className="text-xs text-slate-400 mt-1.5">O nome só pode ser alterado pelo Administrador do sistema.</p>
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">E-mail de Acesso</label>
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
              />
            </div>

            {/* Senha */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nova Senha</label>
              <p className="text-xs text-slate-400 mb-3">Preencha este campo <strong className="text-slate-500">apenas</strong> se desejar trocar sua senha atual.</p>
              <input
                type="password"
                placeholder="Deixe em branco para não alterar"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
              />
            </div>

            {/* Botão */}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white px-4 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md text-base"
            >
              Salvar Alterações
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}