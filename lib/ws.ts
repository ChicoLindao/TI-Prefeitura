export async function triggerUpdate(event: string, payload: any) {
  try {
    console.log(`🔥 [WS] Avisando o servidor... Disparando o evento: ${event}`);
    
    await fetch('http://localhost:3000/api/ws-trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, payload }),
      cache: 'no-store'
    });
    
  } catch (error) {
    console.error("❌ Erro no gatilho do WebSocket:", error);
  }
}