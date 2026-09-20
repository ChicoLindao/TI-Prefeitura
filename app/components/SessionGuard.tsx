"use client";
import { useEffect, useState } from "react";

export default function SessionGuard() {
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const armarBloqueioAbsoluto = async () => {
      if (isExpired) return;
      
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const session = await res.json();
        
        // Se o servidor disse que não tem sessão, cai na hora.
        if (!session || Object.keys(session).length === 0) {
          setIsExpired(true);
          return;
        }

        // Usa APENAS as horas fornecidas pelo servidor (ignora o PC do usuário)
        const serverTimeStr = res.headers.get("date");
        const horaAtualDoServidor = serverTimeStr ? new Date(serverTimeStr).getTime() : Date.now();
        const horaMorteSessao = new Date(session.expires).getTime();
        
        // Calcula exatamente quantos milissegundos faltam, baseado no servidor
        const milissegundosRestantes = horaMorteSessao - horaAtualDoServidor;

        if (milissegundosRestantes <= 0) {
          setIsExpired(true);
        } else {
          // O setTimeout conta tempo corrido, ele não é afetado se o usuário mudar a hora do Windows
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            setIsExpired(true);
          }, milissegundosRestantes);
        }
      } catch (error) {
        console.error("Erro ao blindar a sessão.");
      }
    };

    armarBloqueioAbsoluto();

    // Se o usuário minimizou a aba e voltou horas depois, força uma checagem com o servidor na mesma hora
    const aoMudarFocoDaAba = () => {
      if (document.visibilityState === "visible") {
        armarBloqueioAbsoluto();
      }
    };
    
    document.addEventListener("visibilitychange", aoMudarFocoDaAba);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", aoMudarFocoDaAba);
    };
  }, [isExpired]);

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