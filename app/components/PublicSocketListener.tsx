"use client";
import { useEffect } from 'react';
import { io } from 'socket.io-client';

export default function PublicSocketListener() {
  useEffect(() => {
    // Conecta no servidor WebSocket
    const socket = io({ path: '/api/socket' });

    // Escuta o gatilho
    socket.on('nova-demanda', (payload) => {
      console.log("Atualização recebida na tela pública!", payload);
      
      // Manda o navegador dar um F5 automático e ignorar o cache do Next.js
      window.location.reload();
    });

    return () => { socket.disconnect(); };
  }, []);

  return null; 
}