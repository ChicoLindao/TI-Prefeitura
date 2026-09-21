"use client";
import { useEffect, useState } from "react";

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let intervalId: NodeJS.Timeout;
    
    // Variável protegida pelo encapsulamento do React (inacessível via F12)
    let tempoFinalCalculado = 0; 

    const armarBloqueioAbsoluto = async () => {
      if (isExpired) return;
      
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const session = await res.json();
        
        if (!session || Object.keys(session).length === 0) {
          setIsExpired(true);
          return;
        }

        const serverTimeStr = res.headers.get("date");
        const horaAtualDoServidor = serverTimeStr ? new Date(serverTimeStr).getTime() : Date.now();
        const horaMorteSessao = new Date(session.expires).getTime();
        
        // Descobre a diferença real de fuso/atraso e grava a hora limite cravada
        tempoFinalCalculado = Date.now() + (horaMorteSessao - horaAtualDoServidor);
        const milissegundosRestantes = tempoFinalCalculado - Date.now();

        if (milissegundosRestantes <= 0) {
          setIsExpired(true);
        } else {
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = setTimeout(() => setIsExpired(true), milissegundosRestantes);
        }
      } catch (error) {
        console.error("Erro ao blindar a sessão.");
      }
    };

    armarBloqueioAbsoluto();

    // A ARMADILHA ANTI-F12: Verifica o relógio independente de temporizadores
    const verificarSeJaMorreu = () => {
      if (tempoFinalCalculado > 0 && Date.now() >= tempoFinalCalculado) {
        setIsExpired(true);
      }
    };

    // 1. Armadilha Passiva: Um setInterval extra. Se ele matar o setTimeout, este aqui pode pegar.
    intervalId = setInterval(verificarSeJaMorreu, 10000); // Checa a cada 10 segundos

    // 2. Armadilha Ativa: Dispara a checagem no instante em que ele tocar no PC.
    // É impossível remover estes eventos via console pois a função verificarSeJaMorreu é privada do React.
    const eventos = ['mousedown', 'keydown', 'visibilitychange', 'touchstart'];
    eventos.forEach(evento => document.addEventListener(evento, verificarSeJaMorreu));

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
      eventos.forEach(evento => document.removeEventListener(evento, verificarSeJaMorreu));
    };
  }, [isExpired]);

  if (isExpired) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-blue-200">
            <span className="text-3xl">⏳</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Sessão Expirada</h2>
          <p className="text-slate-500 mb-8 text-sm leading-relaxed">
            Sua sessão foi encerrada por segurança. Por favor, faça login novamente.
          </p>
          <button 
            onClick={() => window.location.href = "/login"} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md"
          >
            Fazer Login Novamente
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}