const express = require("express");
const app = express();
const PORT = process.env.PORT || 10000;

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;
const API_TOKEN = process.env.API_TOKEN;

app.use(express.json()); // <== ESSENCIAL para ler JSON corretamente

app.post("/log", async (req, res) => {
  const auth = req.headers["authorization"];

  if (auth !== API_TOKEN) {
    return res.status(403).json({ error: "Token inválido" });
  }

  const { user, hour, placeId } = req.body;

  if (!user || !hour) {
    return res.status(400).json({ error: "Dados ausentes" });
  }

  const content = {
  embeds: [
    {
      title: "📥 Novo usuário executou o Hub!",
      color: 0xff69b4,
      fields: [
        { name: "📅 Data", value: hour, inline: false },
        { name: "🎮 Jogo", value: "Brookhaven 🏡RP", inline: true },
        { name: "👤 Jogador", value: user, inline: true },
        { name: "🆔 UserId", value: String(userId), inline: true },
        { name: "💻 Executor", value: executor || "Desconhecido", inline: true },
        { name: "🌍 País", value: `${countryFlag} ${countryName}`, inline: true },
        { name: "🌐 Server JobId", value: jobId, inline: false },
        {
          name: "📜 Teleport",
          value: `\`\`\`lua\ngame:GetService("TeleportService"):TeleportToPlaceInstance(${placeId}, "${jobId}")\`\`\``,
          inline: false
        },
        { name: "🛡️ Créditos", value: "LolytaDev <@1318233264460267523>", inline: false }
      ],
      timestamp: new Date().toISOString()
    }
  ]
};


  try {
    const fetch = await import("node-fetch");
    const response = await fetch.default(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content)
    });

    return res.status(200).json({ status: "Enviado com sucesso" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao enviar webhook" });
  }
});

app.get("/", (_, res) => {
  res.send("✅ API de Log está ativa.");
});

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
