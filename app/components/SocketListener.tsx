"use client";
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export default function SocketListener() {
  const [notification, setNotification] = useState<{tipo: string, setor: string} | null>(null);

  useEffect(() => {
    // Conecta no carteiro que criamos no server.js
    const socket = io({ path: '/api/socket' });

    socket.on('nova-demanda', (payload) => {
      console.log("🚨 Nova demanda recebida em tempo real!", payload);
      setNotification(payload);

      // Toca o aviso sonoro (Coloque um arquivo chamado alerta.mp3 na sua pasta public)
      try {
        const audio = new Audio('/alerta.mp3');
        audio.play().catch(e => console.log("Áudio bloqueado pelo navegador até o usuário interagir."));
      } catch (e) {}

      // Manda um aviso para a tela do Dashboard recarregar as filas automaticamente
      window.dispatchEvent(new Event('atualizar-filas-dashboard'));

      // Oculta o pop-up após 6 segundos
      setTimeout(() => setNotification(null), 6000);
    });

    return () => { socket.disconnect(); };
  }, []);

  if (!notification) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-blue-600 text-white p-5 rounded-2xl shadow-2xl border border-blue-400 flex flex-col gap-1 min-w-[300px]">
        <div className="flex justify-between items-center mb-1">
          <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            NOVA DEMANDA!
          </span>
          <button onClick={() => setNotification(null)} className="text-blue-200 hover:text-white transition-colors text-lg leading-none">
            &times;
          </button>
        </div>
        <p className="text-lg font-bold">
          {notification.tipo === 'CHAMADO' ? 'Chamado' : 'Equipamento'}
        </p>
        <p className="text-blue-100 text-sm">
          Setor: {notification.setor}
        </p>
      </div>
    </div>
  );
}