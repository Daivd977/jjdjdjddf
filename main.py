# main.py
import os
import asyncio
import time
from datetime import datetime, timedelta

import httpx
import discord
from discord.ext import commands, tasks
from fastapi import FastAPI, Request
from uvicorn import Config, Server
from dotenv import load_dotenv

# Carrega .env se existir (apenas para dev local)
load_dotenv()

# Lê variáveis do ambiente (defina isso no Render / local .env)
TOKEN = os.getenv("DISCORD_BOT_TOKEN")
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")
CHANNEL_ID = int(os.getenv("CHANNEL_ID", "0"))
EXPIRATION_MINUTES = int(os.getenv("EXPIRATION_MINUTES", "7"))
PORT = int(os.getenv("PORT", "10000"))  # Render fornece PORT automaticamente

# Validação mínima
if not TOKEN:
    raise RuntimeError("DISCORD_BOT_TOKEN não definido nas variáveis de ambiente.")
if not DISCORD_WEBHOOK_URL:
    raise RuntimeError("DISCORD_WEBHOOK_URL não definido nas variáveis de ambiente.")
if CHANNEL_ID == 0:
    raise RuntimeError("CHANNEL_ID inválido (defina a ID do canal de voz).")

# Setup bot e API
intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)
app = FastAPI()

# Estado
user_accesses = {}  # {uid: datetime}
users_online = 0


def register_user_access():
    """Registra um novo acesso (expira em EXPIRATION_MINUTES)."""
    uid = f"user_{int(time.time()*1000)}"
    user_accesses[uid] = datetime.now()
    update_online_count()
    return uid


def update_online_count():
    """Remove entradas expiradas e atualiza counter global."""
    global users_online
    now = datetime.now()
    limit = now - timedelta(minutes=EXPIRATION_MINUTES)
    active = {uid: ts for uid, ts in user_accesses.items() if ts > limit}
    user_accesses.clear()
    user_accesses.update(active)
    users_online = len(active)


@tasks.loop(minutes=1)
async def cleanup_and_update_channel():
    """Tarefa que roda a cada minuto para limpar expirados e atualizar canal de voz."""
    update_online_count()
    channel = bot.get_channel(CHANNEL_ID)
    if channel:
        emoji = "🟢" if users_online > 0 else "🔴"
        new_name = f"{emoji} Users: {users_online}"
        if channel.name != new_name:
            try:
                await channel.edit(name=new_name)
                print(f"✅ Canal atualizado: {new_name}")
            except Exception as e:
                print(f"⚠️ Falha ao atualizar canal: {e}")


@bot.event
async def on_ready():
    print(f"{bot.user} está online! (ID do canal: {CHANNEL_ID})")
    cleanup_and_update_channel.start()


@bot.command(name="status")
async def status_command(ctx):
    update_online_count()
    embed = discord.Embed(
        title="🌐 Status Coquette Hub",
        description=f"👥 Usuários ativos: {users_online}\n⏳ Expiram em {EXPIRATION_MINUTES} min",
        color=discord.Color.green() if users_online > 0 else discord.Color.red(),
    )
    await ctx.send(embed=embed)


@app.post("/acesso")
async def acesso(request: Request):
    """
    Endpoint que o Roblox deve chamar.
    O bot registra +1 e repassa o mesmo JSON pro webhook oficial do Discord.
    """
    try:
        data = await request.json()
    except Exception:
        # aceitar requests sem corpo JSON também
        data = {"content": "Acesso recebido (sem JSON)"}

    uid = register_user_access()
    print(f"✅ Acesso registrado: {uid}  — total: {users_online}")

    # Repassa para webhook oficial do Discord (não bloqueia o request)
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # tenta repassar JSON (sevier possivel)
            await client.post(DISCORD_WEBHOOK_URL, json=data)
        except Exception as e:
            # log e segue
            print(f"⚠️ Erro ao repassar para webhook oficial: {e}")

    return {"status": "ok", "users_online": users_online}


async def run_uvicorn():
    config = Config(app=app, host="0.0.0.0", port=PORT, log_level="info")
    server = Server(config)
    await server.serve()


async def main():
    # roda bot.start e server juntos
    await asyncio.gather(bot.start(TOKEN), run_uvicorn())


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Encerrando...")
