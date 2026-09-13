"use client";
import { useEffect, useState } from "react";

export default function Notifier({ tickets, currentUserId }: { tickets: any[], currentUserId?: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!tickets || tickets.length === 0) return;

    const storedGeneral = localStorage.getItem("notifiedGeneral");
    const storedAssigned = localStorage.getItem("notifiedAssigned");

    const notifiedGeneralIds = storedGeneral ? JSON.parse(storedGeneral) : [];
    const notifiedAssignedIds = storedAssigned ? JSON.parse(storedAssigned) : [];

    const newNotifications: any[] = [];

    tickets.forEach((ticket: any) => {
      const isAssignedToMe = currentUserId && ticket.techs && ticket.techs.some((tech: any) => tech.id === currentUserId);

      if (isAssignedToMe && !notifiedAssignedIds.includes(ticket.id)) {
        newNotifications.push({ ...ticket, alertType: 'assigned' });
        notifiedAssignedIds.push(ticket.id);
        if (!notifiedGeneralIds.includes(ticket.id)) notifiedGeneralIds.push(ticket.id);
      } else if (!isAssignedToMe && !notifiedGeneralIds.includes(ticket.id)) {
        newNotifications.push({ ...ticket, alertType: 'general' });
        notifiedGeneralIds.push(ticket.id);
      }
    });

    if (newNotifications.length > 0) {
      setNotifications(prev => [...prev, ...newNotifications]);

      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";

        const isAnyAssigned = newNotifications.some(n => n.alertType === 'assigned');
        osc.frequency.setValueAtTime(isAnyAssigned ? 1200 : 880, ctx.currentTime);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } catch (e) {
        console.log("Áudio bloqueado pelo navegador.");
      }
    }

    localStorage.setItem("notifiedGeneral", JSON.stringify(notifiedGeneralIds));
    localStorage.setItem("notifiedAssigned", JSON.stringify(notifiedAssignedIds));
  }, [tickets, currentUserId]);

  const dismiss = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {notifications.map(n => {
        const isAssigned = n.alertType === 'assigned';
        const isVisita = !!n.personAttended;

        const titulo = isVisita
          ? `Atendimento: ${n.personAttended}`
          : (isAssigned
            ? `Equipamento: ${n.deviceType?.name || 'Equipamento'}`
            : `Entrada no Setor: ${n.deviceType?.name || 'Equipamento'}`);

        const descricao = isVisita
          ? (n.description || 'Novo registro efetuado no sistema.')
          : `Usuário: ${n.equipmentUser} | Problema: ${n.reportedProblem}`;

        return (
          <div
            key={`${n.id}-${n.alertType}`}
            className={`p-5 rounded-2xl shadow-xl flex justify-between items-start gap-4 w-96 border-l-4 transition-all duration-300 text-white ${
              isAssigned
                ? 'bg-slate-800 border-l-emerald-400'
                : 'bg-blue-600 border-l-blue-300'
            }`}
          >
            <div className="flex-grow">
              <h4 className="font-bold text-sm uppercase tracking-wide flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${isAssigned ? 'bg-emerald-400 animate-pulse' : 'bg-blue-300'}`}></span>
                {isAssigned ? 'Você foi designado!' : 'Nova Demanda!'}
              </h4>
              <p className="text-sm font-semibold mt-1">{titulo}</p>
              <p className={`text-xs mt-1 line-clamp-3 ${isAssigned ? 'text-slate-300' : 'text-blue-100'}`}>{descricao}</p>
            </div>
            <button
              onClick={() => dismiss(n.id)}
              className="text-white/60 hover:text-white font-bold text-2xl leading-none transition-colors"
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
}