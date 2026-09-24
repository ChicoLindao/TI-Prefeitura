"use client";
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

export default function SocketListener() {
  const [notification, setNotification] = useState<{tipo: string, setor: string} | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const socket = io({ path: '/api/socket' });

    socket.on('nova-demanda', (payload) => {
      console.log("🚨 Evento recebido via WebSocket:", payload);

      // 🔴 1. INTERCEPTA A EXPULSÃO
      if (payload.tipo === 'FORCE_LOGOUT') {
        if (session?.user && (session.user as any).id === payload.alvoId) {
          signOut({ callbackUrl: '/login' });
        } else {
          window.dispatchEvent(new Event("atualiza-dados"));
          router.refresh();
        }
        return; 
      }

      // 🟢 2. INTERCEPTA O LOGIN
      if (payload.tipo === 'LOGIN') {
        window.dispatchEvent(new Event("atualiza-dados"));
        router.refresh();
        return; 
      }

      // 🟡 3. INTERCEPTA ALERTAS DE SEGURANÇA (Bloqueios Anti-Spam)
      if (payload.tipo === 'SECURITY_ALERT') {
        window.dispatchEvent(new Event("atualiza-dados")); // Avisa a tela GlobalSettings para recarregar
        router.refresh();
        return; // Impede que abra pop-up azul na tela!
      }

      // 🔵 4. SE FOR CHAMADO OU EQUIPAMENTO, CRIA O POP-UP NORMALMENTE
      setNotification(payload);
      router.refresh();
      window.dispatchEvent(new Event("atualiza-dados"));

      try {
        const audio = new Audio('/alerta.mp3');
        audio.play().catch(e => console.log("Áudio bloqueado pelo navegador."));
      } catch (e) {}

      const isUpdate = ["Status Atualizado", "Novo Histórico", "Técnico Atribuído", "Chamado Excluído", "OS Excluída", "Atualização"].includes(payload.setor);
      const tituloNotificacao = isUpdate ? "Atualização no Sistema TI" : "NOVA DEMANDA TI!";
      const corpoNotificacao = isUpdate 
        ? `${payload.tipo === 'CHAMADO' ? 'Chamado' : 'Equipamento'} - ${payload.setor}`
        : `Novo(a) ${payload.tipo === 'CHAMADO' ? 'chamado' : 'equipamento'} do setor: ${payload.setor}`;

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(tituloNotificacao, {
          body: corpoNotificacao,
          icon: "/favicon.ico",
        });
      }

      setTimeout(() => setNotification(null), 6000);
    });

    return () => { socket.disconnect(); };
  }, [router, session]);

  if (!notification) return null;

  const isUpdate = ["Status Atualizado", "Novo Histórico", "Técnico Atribuído", "Chamado Excluído", "OS Excluída", "Atualização"].includes(notification.setor);
  const tituloPopUp = isUpdate ? "ATUALIZAÇÃO!" : "NOVA DEMANDA!";
  const pulseColor = isUpdate ? "bg-amber-400" : "bg-red-500";

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-blue-600 text-white p-5 rounded-2xl shadow-2xl border border-blue-400 flex flex-col gap-1 min-w-[300px]">
        <div className="flex justify-between items-center mb-1">
          <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
            <div className={`w-2 h-2 ${pulseColor} rounded-full animate-pulse`}></div>
            {tituloPopUp}
          </span>
          <button onClick={() => setNotification(null)} className="text-blue-200 hover:text-white transition-colors text-lg leading-none">
            &times;
          </button>
        </div>
        <p className="text-lg font-bold">
          {notification.tipo === 'CHAMADO' ? 'Chamado' : 'Equipamento'}
        </p>
        <p className="text-blue-100 text-sm">
          {isUpdate ? notification.setor : `Setor: ${notification.setor}`}
        </p>
      </div>
    </div>
  );
}