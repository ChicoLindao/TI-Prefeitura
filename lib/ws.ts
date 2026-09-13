export async function triggerUpdate(event: string, payload: any) {
  try {
    // Chama aquela nossa rota secreta no server.js
    await fetch('http://127.0.0.1:3000/api/ws-trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, payload })
    });
  } catch (error) {
    console.error("Erro no gatilho do WebSocket:", error);
  }
}