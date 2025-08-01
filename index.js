const express = require("express");
const app = express();
const PORT = process.env.PORT || 10000;

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;
const API_TOKEN = process.env.API_TOKEN;

app.use(express.json()); // Para ler JSON no body das requisições

app.post("/log", async (req, res) => {
  const auth = req.headers["authorization"];

  if (!auth || auth !== API_TOKEN) {
    return res.status(403).json({ error: "Token inválido" });
  }

  // Extrai os dados do body, já com fallback para strings ou valores padrão
  const {
    user,
    hour,
    placeId,
    userId,
    executor,
    countryFlag,
    countryName,
    jobId
  } = req.body;

  // Valida dados obrigatórios
  if (!user || !hour) {
    return res.status(400).json({ error: "Dados ausentes: 'user' e 'hour' são obrigatórios" });
  }

  // Garantir que os valores não fiquem vazios ou zeros indevidos
  const userSafe = user.trim() || "Desconhecido";
  const hourSafe = hour.trim() || "Desconhecido";
  const placeIdSafe = Number(placeId) > 0 ? Number(placeId) : "Desconhecido";
  const userIdSafe = Number(userId) > 0 ? String(userId) : "Desconhecido";
  const executorSafe = executor && executor.trim() ? executor.trim() : "Desconhecido";
  const countryFlagSafe = countryFlag && countryFlag.trim() ? countryFlag.trim() : "🏳️";
  const countryNameSafe = countryName && countryName.trim() ? countryName.trim() : "Desconhecido";
  const jobIdSafe = jobId && jobId.trim() ? jobId.trim() : "Desconhecido";

  // Monta o payload do webhook
  const content = {
    embeds: [
      {
        title: "📥 Novo usuário executou o Hub!",
        color: 0xff69b4,
        fields: [
          { name: "📅 Data", value: hourSafe, inline: false },
          { name: "🎮 Jogo", value: "Brookhaven 🏡RP", inline: true },
          { name: "👤 Jogador", value: userSafe, inline: true },
          { name: "🆔 UserId", value: userIdSafe, inline: true },
          { name: "💻 Executor", value: executorSafe, inline: true },
          { name: "🌍 País", value: `${countryFlagSafe} ${countryNameSafe}`, inline: true },
          { name: "🌐 Server JobId", value: jobIdSafe, inline: false },
          {
            name: "📜 Teleport",
            value:
              placeIdSafe !== "Desconhecido" && jobIdSafe !== "Desconhecido"
                ? `\`\`\`lua\ngame:GetService("TeleportService"):TeleportToPlaceInstance(${placeIdSafe}, "${jobIdSafe}")\`\`\``
                : "Desconhecido",
            inline: false
          },
          { name: "🛡️ Créditos", value: "<@1318233264460267523>", inline: false }
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

    if (!response.ok) {
      console.error("Erro no webhook:", response.statusText);
      return res.status(500).json({ error: "Erro ao enviar webhook" });
    }

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
