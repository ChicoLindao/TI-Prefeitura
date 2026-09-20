"use client";
import { useEffect, useState } from "react";

export default function SessionGuard() {
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const checkSession = setInterval(async () => {
      try {
        // O segredo está aqui: cache: "no-store" destrói a ilusão do servidor
        const res = await fetch("/api/auth/session", { 
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" }
        });
        
        const sessionData = await res.json();
        
        if (!sessionData || Object.keys(sessionData).length === 0) {
          clearInterval(checkSession);
          setIsExpired(true);
        }
      } catch (error) {
        console.error("Falha ao validar a sessão ativa.");
      }
    }, 60000); // 60000 = Checa a cada 1 minuto

    return () => clearInterval(checkSession);
  }, []);

  if (!isExpired) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-blue-200">
          <span className="text-3xl">⏳</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Sessão Expirada</h2>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
          Sua sessão foi encerrada por segurança. Por favor, faça login novamente para continuar.
        </p>
        <button 
          onClick={() => window.location.href = "/login"} 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-xl font-semibold transition-all text-sm shadow-sm hover:shadow-md"
        >
          Fazer Login Novamente
        </button>
      </div>
    </div>
  );
}