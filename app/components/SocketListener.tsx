"use client";
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';

export default function SocketListener() {
  const [notification, setNotification] = useState<{tipo: string, setor: string} | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Conecta no servidor WebSocket
    const socket = io({ path: '/api/socket' });

    socket.on('nova-demanda', (payload) => {
      console.log("🚨 Notificação recebida em tempo real!", payload);
      setNotification(payload);

      // Manda o Next.js recarregar as listas do banco de dados na hora, sem dar F5!
      router.refresh();

      // Toca o aviso sonoro
      try {
        const audio = new Audio('/alerta.mp3');
        audio.play().catch(e => console.log("Áudio bloqueado pelo navegador até o usuário interagir."));
      } catch (e) {}

      // Oculta o pop-up após 6 segundos
      setTimeout(() => setNotification(null), 6000);
    });

    return () => { socket.disconnect(); };
  }, [router]);

  if (!notification) return null;

  // Lógica inteligente para saber se é um chamado novo ou apenas uma atualização
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