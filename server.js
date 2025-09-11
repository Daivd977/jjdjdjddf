import express from "express";
import { WebSocketServer } from "ws";

const app = express();
const port = process.env.PORT || 3000;

let clients = new Set();

const wss = new WebSocketServer({ noServer: true });

// WebSocket
wss.on("connection", (ws) => {
  clients.add(ws);
  broadcast({ type: "count", total: clients.size });

  ws.on("close", () => {
    clients.delete(ws);
    broadcast({ type: "count", total: clients.size });
  });
});

// Enviar para todos
function broadcast(data) {
  const msg = JSON.stringify(data);
  for (let client of clients) {
    if (client.readyState === 1) {
      client.send(msg);
    }
  }
}

// Endpoint HTTP para consultar contador
app.get("/count", (req, res) => {
  res.json({ total: clients.size });
});

// Integrar HTTP + WS
const server = app.listen(port, () => {
  console.log("Servidor rodando na porta " + port);
});
server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});
