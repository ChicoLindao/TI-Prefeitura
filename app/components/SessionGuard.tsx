"use client";
import { useEffect, useState } from "react";

export default function SessionGuard() {
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Faz uma checagem silenciosa na API para pegar a queda em tempo real
    const checkSession = setInterval(async () => {
      try {
        const res = await fetch("/api/auth/session");
        const sessionData = await res.json();
        
        // Se a API retornar um objeto vazio, o cookie morreu
        if (!sessionData || Object.keys(sessionData).length === 0) {
          clearInterval(checkSession); // Para o relógio
          setIsExpired(true); // Aciona o bloqueio de tela
        }
      } catch (error) {
        console.error("Falha ao validar a sessão ativa.");
      }
    }, 10000); // <-- ATUALMENTE EM 10s PARA TESTE (Lembre de voltar para 60000!)

    return () => clearInterval(checkSession);
  }, []);

  // Enquanto a sessão estiver ativa, o vigia fica invisível
  if (!isExpired) return null;

  // Quando expira, ele levanta este modal bloqueando a tela
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-blue-200">
          <span className="text-3xl">⏳</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Sessão Expirada</h2>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
          Sua sessão foi encerrada por inatividade para a sua segurança. Por favor, faça login novamente para continuar.
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