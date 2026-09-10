"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AutoRefresh({ interval = 30000 }: { interval?: number }) {
  const router = useRouter();

  useEffect(() => {
    // Cria um temporizador que roda a cada X milissegundos
    const timer = setInterval(() => {
      router.refresh(); // Puxa os dados novos do banco sem piscar a tela
    }, interval);

    // Limpa o temporizador se a pessoa sair da página
    return () => clearInterval(timer);
  }, [router, interval]);

  return null; // Ele não aparece na tela, só trabalha nos bastidores
}