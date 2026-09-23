"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) setError("Credenciais inválidas");
    else router.push("/dashboard");
  };

  return (
    <div suppressHydrationWarning className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl w-full max-w-md flex flex-col relative border border-slate-200">
        <div className="mb-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
            <span className="text-2xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Acesso Restrito</h1>
          <p className="text-sm text-slate-400 mt-1">Departamento de TI</p>
        </div>
        
        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-600 text-sm font-semibold px-4 py-3 rounded-xl text-center">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">E-mail</label>
            <input 
              type="email" 
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-300 bg-slate-50/50 transition-all duration-200" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Senha</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-300 bg-slate-50/50 transition-all duration-200" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white font-semibold py-3.5 px-4 rounded-xl hover:bg-blue-700 transition-all duration-200 mt-2 shadow-sm hover:shadow-md text-sm"
          >
            Entrar no Sistema
          </button>
        </form>

        <div className="mt-8 pt-5 border-t border-slate-100 text-center">
          <Link 
            href="/" 
            className="text-slate-400 hover:text-slate-600 font-medium transition-colors duration-200 text-sm hover:underline flex items-center justify-center gap-1"
          >
            <span>←</span> Voltar para a Tela Pública
          </Link>
        </div>
      </div>
    </div>
  );
}