"use client";
import { useState, useEffect } from "react";

export default function MyProfile() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(true);
  
  // Novo estado para controlar a visibilidade da senha
  const [showPassword, setShowPassword] = useState(false);

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
      setShowPassword(false); // Esconde a senha de novo após salvar
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
              
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Deixe em branco para não alterar"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 pr-12 text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
                />
                
                {/* Botão do Olhinho */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                  title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
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