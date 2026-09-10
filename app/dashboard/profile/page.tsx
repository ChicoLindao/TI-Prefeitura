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

  if (loading) return <div className="p-8 font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 min-h-screen">Carregando dados...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Meu Perfil</h1>
          <a href="/dashboard" className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-lg">← Voltar ao Painel</a>
        </div>

        {message.text && (
          <div className={`p-4 mb-6 rounded font-bold ${message.type === 'error' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow border-t-4 border-teal-600">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">Meu Nome (Fixo)</label>
              <input 
                type="text" 
                value={name} 
                disabled 
                className="w-full border-2 border-gray-200 dark:border-gray-700 p-3 rounded text-gray-500 dark:text-gray-400 font-medium mt-1 bg-gray-100 dark:bg-gray-900 cursor-not-allowed" 
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">O nome só pode ser alterado pelo Administrador do sistema.</p>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">E-mail de Acesso</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border-2 border-gray-200 dark:border-gray-600 p-3 rounded text-gray-900 dark:text-white bg-white dark:bg-gray-700 font-medium mt-1 focus:border-teal-500 focus:outline-none" />
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded border border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">Nova Senha</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Preencha este campo <strong>apenas</strong> se desejar trocar sua senha atual.</p>
              <input type="password" placeholder="Deixe em branco para não alterar" value={password} onChange={e => setPassword(e.target.value)} className="w-full border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 p-3 rounded text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none placeholder-gray-400" />
            </div>

            <button type="submit" className="w-full bg-teal-600 text-white px-4 py-4 rounded-lg font-bold text-lg hover:bg-teal-700 transition shadow-md">
              Salvar Alterações
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}