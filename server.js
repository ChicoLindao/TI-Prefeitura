const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    
    // Rota interna secreta: As APIs do Next.js vão chamar essa rota para mandar o WebSocket apitar!
    if (parsedUrl.pathname === '/api/ws-trigger' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          // Dispara o evento para todos os técnicos com o painel aberto
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

    // Se não for o gatilho, deixa o Next.js carregar a página normalmente
    handle(req, res, parsedUrl);
  });

  // Configura o carteiro do WebSocket
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