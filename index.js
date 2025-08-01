const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;
const TOKEN = process.env.API_TOKEN;

app.post("/log", async (req, res) => {
  const auth = req.headers.authorization;
  if (auth !== TOKEN) return res.status(403).json({ error: "Acesso negado" });

  const info = req.body;

  // Busca IP do requester
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  // Pega país
  let country = "Desconhecido";
  try {
    const geo = await fetch(`http://ip-api.com/json/${ip}`).then(res => res.json());
    country = geo.country || "Desconhecido";
  } catch {}

  // Hora local
  const agora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const payload = {
    embeds: [{
      title: "📥 Nova Execução Roblox",
      color: 0xffaaff,
      fields: [
        { name: "👤 Jogador", value: info.Player, inline: true },
        { name: "🆔 UserId", value: String(info.UserId), inline: true },
        { name: "🖥️ Executor", value: info.Executor, inline: true },
        { name: "🎮 Jogo", value: `${info.PlaceName} (${info.PlaceId})`, inline: false },
        { name: "🌍 País", value: country, inline: true },
        { name: "🕒 Hora", value: agora, inline: true },
        { name: "📡 JobId", value: info.JobId.slice(0, 10) + "...", inline: false },
      ]
    }]
  };

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao enviar para webhook" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));
