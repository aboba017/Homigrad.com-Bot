// index.js
const { Client, GatewayIntentBits } = require("discord.js");
const { Rcon } = require("rcon-client");
const config = require("./config.cjs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// --- RCON connection ---
let rconConnection = null;
async function getRcon() {
  if (
    rconConnection &&
    rconConnection.socket &&
    !rconConnection.socket.destroyed
  ) {
    return rconConnection;
  }

  try {
    rconConnection = await Rcon.connect({
      host: config.rcon.host,
      port: Number(config.rcon.port),
      password: config.rcon.password,
      timeout: 5000,
    });
    rconConnection.on("error", (e) => {
      console.error("RCON error:", e);
    });
    rconConnection.on("end", () => {
      console.warn("⚠️ RCON соединение разорвано.");
      rconConnection = null;
    });
    console.log("✅ Подключен к RCON");
    return rconConnection;
  } catch (err) {
    console.error("❌ Не удалось подключиться к RCON:", err.message || err);
    rconConnection = null;
    throw err;
  }
}

// --- функция для base64 ---
function toBase64(str) {
  return Buffer.from(str, "utf8").toString("base64");
}

// --- Discord message handler ---
client.on("messageCreate", async (message) => {
  try {
    if (message.channel.id !== config.discordChannelId) return;
    if (message.author.bot && !config.relayBots) return;

    const content = (message.content || "").trim();
    if (!content) return;

    const username = message.member
      ? message.member.displayName
      : message.author.username;
    const rcon = await getRcon();
    if (!rcon) return;

    // --- если ULX-команда ---
    if (content.startsWith("!")) {
      const ulxCommand = content.slice(1).trim();

      if (!ulxCommand) {
        await message.reply(
          "❌ Вы не указали команду после `!`. Пример: `!ban ник время причина`"
        );
        return;
      }

      try {
        await rcon.send(
          `say_relay "${toBase64(username)}" "${toBase64(
            `выполнил: !${ulxCommand}`
          )}"`
        );

        const response = await rcon.send(`ulx ${ulxCommand}`);

        if (response && response.length > 0) {
          await message.reply(`✅ Выполнено: \`${ulxCommand}\``);
        } else {
          await message.reply(
            `❌ Не удалось выполнить команду. Проверьте аргументы.`
          );
        }
      } catch (err) {
        await message.reply(`❌ Ошибка при выполнении: ${err.message}`);
      }
      return;
    }

    // --- обычное сообщение ---
    let safeContent = content.replace(/\n/g, " ");
    if (safeContent.length > 200)
      safeContent = safeContent.slice(0, 197) + "...";

    await rcon.send(
      `say_relay "${toBase64(username)}" "${toBase64(safeContent)}"`
    );
    console.log("→ relay:", username + ": " + safeContent);
  } catch (err) {
    console.error("Error relaying message:", err);
  }
});

// проверка подключения
client.on("ready", () => {
  console.log(`🤖 Бот подключен как ${client.user.tag}`);
});

// старт
(async () => {
  try {
    await client.login(config.discordToken);
  } catch (err) {
    console.error("❌ Не удалось подключиться к боту:", err);
    process.exit(1);
  }
})();

let statusMessageId = null;

// --- функция обновления статуса сервера ---
async function postServerStatus() {
  try {
    const rcon = await getRcon();
    if (!rcon) {
      console.log(
        "[status] Нет RCON соединения — пропускаем обновление статуса."
      );
      return;
    }

    // 1) hostname
    let hostname = "Unknown";
    try {
      const hostnameRaw = await rcon.send("hostname");
      //console.log("[status DEBUG] hostnameRaw:", JSON.stringify(hostnameRaw));
      if (hostnameRaw && typeof hostnameRaw === "string") {
        // Вариант 1: "hostname: My Server Name"
        let hostMatch = hostnameRaw.match(/hostname\s*:\s*(.+)/i);
        if (hostMatch && hostMatch[1]) {
          hostname = hostMatch[1].trim();
        } else {
          // Вариант 2: cvar-стиль → "hostname" = "nasvai" ( def. "" )
          hostMatch = hostnameRaw.match(/"hostname"\s*=\s*"([^"]+)"/i);
          if (hostMatch && hostMatch[1]) {
            hostname = hostMatch[1].trim();
          } else {
            hostname = hostnameRaw.trim();
          }
        }
      }
    } catch (e) {
      //console.log("[status] Ошибка при получении hostname:", e?.message || e);
    }

    // 2) status
    let statusRaw = "";
    try {
      statusRaw = await rcon.send("status");
      //console.log("[status DEBUG] statusRaw preview:", statusRaw.slice(0, 200));
    } catch (e) {
      console.log("[status] Ошибка при получении status:", e?.message || e);
      statusRaw = "";
    }

    let map = "Unknown";
    let playersNow = 0;
    let playersMax = 0;

    if (statusRaw) {
      const lines = statusRaw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      for (const line of lines) {
        const low = line.toLowerCase();

        // карта
        if (low.startsWith("map") || low.includes("map :")) {
          const m = line.match(/map\s*:\s*([^\s,]+)/i);
          if (m && m[1]) map = m[1].trim();
        }

        // игроки
        if (low.startsWith("players") || low.includes("players :")) {
          // "players : 2 (30 max)"
          let mm = line.match(/players\s*:\s*(\d+)\s*\((\d+)\s*max\)/i);
          if (mm) {
            playersNow = parseInt(mm[1]);
            playersMax = parseInt(mm[2]);
            continue;
          }
          // фикс
          mm = line.match(/players\s*:\s*(\d+).*?\((\d+)\s*max\)/i);
          if (mm) {
            playersNow = parseInt(mm[1]);
            playersMax = parseInt(mm[2]);
            continue;
          }
        }
      }

      // MAX приложение
      if (!playersMax) {
        try {
          const maxRaw = await rcon.send("sv_maxplayers");
          const mm = maxRaw.match(/(\d+)/);
          if (mm) playersMax = parseInt(mm[1]);
        } catch {}
      }
    }

    //console.log(
    //`[status] hostname="${hostname}" map="${map}" players=${playersNow}/${playersMax}`
    //);

    // 3) Сообщение
    const statusMessage =
      "```\n" +
      `Server name : ${hostname}\n` +
      `IP          : ${config.rcon.host}:${config.rcon.port}\n` +
      `Map         : ${map}\n` +
      `Players     : ${playersNow} / ${playersMax}\n` +
      "```";

    // 4) Discord
    const statusChannel = await client.channels
      .fetch(config.discordStatusChannelId)
      .catch((e) => {
        console.error("[status] fetch channel failed:", e?.message || e);
        return null;
      });
    if (!statusChannel) return;

    if (statusMessageId) {
      try {
        const msg = await statusChannel.messages
          .fetch(statusMessageId)
          .catch(() => null);
        if (msg) {
          await msg.edit(statusMessage);
          //console.log("[status] ✅ Статус обновлён");
          return;
        } else {
          statusMessageId = null;
        }
      } catch {
        statusMessageId = null;
      }
    }

    const newMsg = await statusChannel.send(statusMessage);
    statusMessageId = newMsg.id;
    console.log("[status] ✅ Статус создан");
  } catch (err) {
    console.error("[status] Unhandled error:", err);
  }
}

// запуск цикла на статус (только через цикл смог сделать нормальный статус)
client.on("ready", () => {
  //console.log("🚀 Бот запущен, статус включен");
  postServerStatus();
  setInterval(postServerStatus, 30 * 1000);
});
