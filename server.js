const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// 🛡️ BLINDAGEM CONTRA QUEDAS (ECONNRESET)
// Impede que o servidor caia quando o navegador cortar a conexão bruscamente
process.on('uncaughtException', (err) => {
  if (err.code === 'ECONNRESET') {
    // Ignora silenciosamente
    return;
  }
  console.error('Erro crítico:', err);
});

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    
    // Rota interna secreta
    if (parsedUrl.pathname === '/api/ws-trigger' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          io.emit(data.event, data.payload);
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.statusCode = 400;
          res.end('Bad Request');
        }
      });
      return;
    }

    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    path: "/api/socket",
    addTrailingSlash: false,
  });

  io.on("connection", (socket) => {
    console.log("🟢 Um painel foi conectado! ID do Socket:", socket.id);

    socket.on("disconnect", () => {
      console.log("🔴 Painel desconectado:", socket.id);
    });
  });

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log("🚀 Sistema TI rodando em http://localhost:3000 com WebSockets VIVOS!");
  });
});