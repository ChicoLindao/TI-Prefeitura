"use client";
import { useEffect, useState } from "react";

export default function SessionGuard() {
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const armarBombaRelogio = async () => {
      try {
        // Faz APENAS UMA requisição ao abrir/recarregar a tela
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const session = await res.json();
        
        // Se já não tem sessão, derruba na hora
        if (!session || Object.keys(session).length === 0) {
          setIsExpired(true);
          return;
        }

        // O NextAuth sempre envia a data exata de expiração (session.expires)
        if (session.expires) {
          const expirationTime = new Date(session.expires).getTime();
          const currentTime = Date.now();
          const tempoRestante = expirationTime - currentTime;

          if (tempoRestante <= 0) {
            setIsExpired(true);
          } else {
            // Arma o alarme para disparar silenciosamente no exato milissegundo que o cookie morre
            timeoutId = setTimeout(() => {
              setIsExpired(true);
            }, tempoRestante);
          }
        }
      } catch (error) {
        console.error("Falha ao inicializar o vigia de sessão.");
      }
    };

    armarBombaRelogio();

    // Limpa o cronômetro se o usuário mudar de tela antes do tempo acabar
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
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