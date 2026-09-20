const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  EmbedBuilder,
  Events
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const http = require("http");

// ============================================================
// 🍥 NARUTO UZUMAKI
// PREFIX: m.
// ============================================================

const PREFIX = "m.";
const DATA_FILE = path.join(__dirname, "data.json");

// ============================================================
// 🌐 SERVIDOR HTTP PARA RENDER
// ============================================================

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end("🍥 Naruto Uzumaki está conectado correctamente.");
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Servidor HTTP iniciado en el puerto ${PORT}`);
});

// ============================================================
// 🤖 CLIENTE
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],

  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember
  ]
});

// ============================================================
// 💾 BASE DE DATOS
// ============================================================

let db = {
  users: {},
  guilds: {}
};

function saveDB() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(db, null, 2),
      "utf8"
    );
  } catch (error) {
    console.error("❌ Error guardando datos:", error);
  }
}

function loadDB() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      saveDB();
      return;
    }

    const raw = fs.readFileSync(DATA_FILE, "utf8");

    if (!raw.trim()) {
      saveDB();
      return;
    }

    const parsed = JSON.parse(raw);

    db = {
      users: parsed.users || {},
      guilds: parsed.guilds || {}
    };
  } catch (error) {
    console.error("❌ Error cargando data.json:", error);

    db = {
      users: {},
      guilds: {}
    };

    saveDB();
  }
}

loadDB();

// ============================================================
// 👤 USUARIOS
// ============================================================

function getUser(userId) {
  if (!db.users[userId]) {
    db.users[userId] = {
      money: 100,
      bank: 0,
      xp: 0,
      level: 1,
      bio: "Sin biografía.",
      reps: 0,
      warnings: 0,
      daily: 0
    };

    saveDB();
  }

  const user = db.users[userId];

  if (typeof user.money !== "number") user.money = 100;
  if (typeof user.bank !== "number") user.bank = 0;
  if (typeof user.xp !== "number") user.xp = 0;
  if (typeof user.level !== "number") user.level = 1;
  if (typeof user.bio !== "string") user.bio = "Sin biografía.";
  if (typeof user.reps !== "number") user.reps = 0;
  if (typeof user.warnings !== "number") user.warnings = 0;
  if (typeof user.daily !== "number") user.daily = 0;

  return user;
}

// ============================================================
// 🏠 SERVIDORES
// ============================================================

function createGuildSettings() {
  return {
    logsChannel: null,

    antiraid: {
      enabled: false,
      limit: 5,
      seconds: 10,
      action: "kick"
    },

    antilink: {
      enabled: false,
      whitelist: [
        "discord.com",
        "discord.gg"
      ]
    },

    antispam: {
      enabled: false,
      maxMessages: 5,
      interval: 5000,
      timeout: 60000
    },

    channelProtection: {
      enabled: false,
      whitelistUsers: [],
      whitelistRoles: []
    },

    welcome: {
      enabled: false,
      channel: null
    },

    autorole: {
      enabled: false,
      role: null
    },

    // ========================================================
    // 🛒 TIENDA
    // ========================================================

    shop: {
      roles: {}
    }
  };
}

function getGuild(guildId) {
  if (!db.guilds[guildId]) {
    db.guilds[guildId] = createGuildSettings();
    saveDB();
  }

  const guild = db.guilds[guildId];

  if (!guild.antiraid) {
    guild.antiraid = {
      enabled: false,
      limit: 5,
      seconds: 10,
      action: "kick"
    };
  }

  if (!guild.antilink) {
    guild.antilink = {
      enabled: false,
      whitelist: [
        "discord.com",
        "discord.gg"
      ]
    };
  }

  if (!Array.isArray(guild.antilink.whitelist)) {
    guild.antilink.whitelist = [
      "discord.com",
      "discord.gg"
    ];
  }

  if (!guild.antispam) {
    guild.antispam = {
      enabled: false,
      maxMessages: 5,
      interval: 5000,
      timeout: 60000
    };
  }

  if (!guild.channelProtection) {
    guild.channelProtection = {
      enabled: false,
      whitelistUsers: [],
      whitelistRoles: []
    };
  }

  if (!Array.isArray(guild.channelProtection.whitelistUsers)) {
    guild.channelProtection.whitelistUsers = [];
  }

  if (!Array.isArray(guild.channelProtection.whitelistRoles)) {
    guild.channelProtection.whitelistRoles = [];
  }

  if (!guild.welcome) {
    guild.welcome = {
      enabled: false,
      channel: null
    };
  }

  if (!guild.autorole) {
    guild.autorole = {
      enabled: false,
      role: null
    };
  }

  if (!("logsChannel" in guild)) {
    guild.logsChannel = null;
  }

  // Compatibilidad con servidores antiguos
  if (!guild.shop) {
    guild.shop = {
      roles: {}
    };
  }

  if (!guild.shop.roles) {
    guild.shop.roles = {};
  }

  return guild;
}

// ============================================================
// 📝 LOGS
// ============================================================

async function sendLog(guild, embed) {
  try {
    const settings = getGuild(guild.id);

    if (!settings.logsChannel) return;

    const channel = guild.channels.cache.get(
      settings.logsChannel
    );

    if (!channel) return;

    await channel.send({
      embeds: [embed]
    });
  } catch (error) {
    console.error("❌ Error enviando log:", error);
  }
}

// ============================================================
// 🔐 PERMISOS
// ============================================================

function isAdmin(member) {
  if (!member) return false;

  return member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
}

function isOwner(member) {
  if (!member) return false;

  return member.guild.ownerId === member.id;
}

// ============================================================
// 🛡️ MODERACIÓN
// ============================================================

const moderationCommands = [
  "ban",
  "mute",
  "kick",
  "unban",
  "unmute",
  "timeout",
  "untimeout",
  "clear",
  "warn",
  "warnings",
  "lock",
  "unlock"
];

// ============================================================
// 📚 LISTAS PARA HELP
// ============================================================

const publicHelp = {
  economia: [
    "balance",
    "daily",
    "work",
    "pay",
    "deposit",
    "withdraw",
    "bank",
    "richest",
    "money",
    "economy"
  ],

  rank: [
    "rank",
    "level",
    "xp",
    "leaderboard",
    "top",
    "rankcard",
    "rewards",
    "levels"
  ],

  social: [
    "profile",
    "avatar",
    "banner",
    "bio",
    "setbio",
    "rep",
    "reps",
    "friends",
    "status",
    "social"
  ],

  servidor: [
    "serverinfo",
    "userinfo",
    "botinfo",
    "servericon",
    "roleinfo",
    "channelinfo",
    "rolelist",
    "membercount",
    "invite",
    "members"
  ],

  diversion: [
    "8ball",
    "dice",
    "rps",
    "joke",
    "choose",
    "reverse",
    "say",
    "random",
    "hug",
    "ship"
  ],

  tienda: [
    "tienda",
    "comprar"
  ]
};

const adminHelp = {
  moderacion: [
    "ban",
    "mute",
    "kick",
    "unban",
    "unmute",
    "timeout",
    "untimeout",
    "clear",
    "warn",
    "warnings",
    "lock",
    "unlock"
  ],

  servidor: [
    "logs",
    "welcome",
    "autorole",
    "settings",
    "antilink",
    "antispam",
    "antiraid",
    "channelprotect"
  ],

  roles: [
    "roles",
    "roleinfo",
    "rolelist"
  ],

  tienda: [
    "tienda",
    "tienda agregar",
    "tienda quitar",
    "tienda precio",
    "tienda editar",
    "tienda lista"
  ],

  economia: [
    "addxp",
    "removexp"
  ]
};

// ============================================================
// 🚀 READY
// ============================================================

client.once(Events.ClientReady, readyClient => {
  console.log("");
  console.log("======================================");
  console.log("🍥 NARUTO UZUMAKI");
  console.log("======================================");
  console.log(`🤖 Usuario: ${readyClient.user.tag}`);
  console.log(`🆔 ID: ${readyClient.user.id}`);
  console.log(`🏠 Servidores: ${readyClient.guilds.cache.size}`);
  console.log(`🔑 Prefix: ${PREFIX}`);
  console.log(`📡 Ping: ${readyClient.ws.ping}ms`);
  console.log("🟢 NARUTO UZUMAKI ESTÁ CONECTADO.");
  console.log("======================================");
  console.log("");

  readyClient.user.setActivity(
    `${PREFIX}help | Naruto Uzumaki`
  );
});

// ============================================================
// ❌ ERRORES
// ============================================================

client.on(Events.Error, error => {
  console.error("❌ Discord Client Error:", error);
});

client.on(Events.Warn, warning => {
  console.warn("⚠️ Discord Warning:", warning);
});

process.on("unhandledRejection", error => {
  console.error("❌ Unhandled Rejection:", error);
});

process.on("uncaughtException", error => {
  console.error("❌ Uncaught Exception:", error);
});

// ============================================================
// 👋 BIENVENIDA + AUTOROLE + ANTIRAID
// ============================================================

const joinTracker = new Map();

client.on(Events.GuildMemberAdd, async member => {
  try {
    const settings = getGuild(member.guild.id);

    if (
      settings.autorole.enabled &&
      settings.autorole.role
    ) {
      const role = member.guild.roles.cache.get(
        settings.autorole.role
      );

      if (
        role &&
        role.editable &&
        !member.roles.cache.has(role.id)
      ) {
        await member.roles.add(role).catch(() => {});
      }
    }

    if (
      settings.welcome.enabled &&
      settings.welcome.channel
    ) {
      const channel = member.guild.channels.cache.get(
        settings.welcome.channel
      );

      if (channel && channel.isTextBased()) {
        await channel.send(
          `🍥 ¡Bienvenido/a ${member} a **${member.guild.name}**!`
        ).catch(() => {});
      }
    }

    if (!settings.antiraid.enabled) return;

    const now = Date.now();

    if (!joinTracker.has(member.guild.id)) {
      joinTracker.set(member.guild.id, []);
    }

    const joins = joinTracker.get(member.guild.id);

    joins.push({
      id: member.id,
      time: now
    });

    const validJoins = joins.filter(
      join =>
        now - join.time <=
        settings.antiraid.seconds * 1000
    );

    joinTracker.set(
      member.guild.id,
      validJoins
    );

    if (
      validJoins.length <
      settings.antiraid.limit
    ) {
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("🚨 ANTI-RAID ACTIVADO")
      .setDescription(
        `Se detectaron **${validJoins.length} entradas** en **${settings.antiraid.seconds} segundos**.`
      )
      .addFields(
        {
          name: "Servidor",
          value: member.guild.name,
          inline: true
        },
        {
          name: "Límite",
          value: String(settings.antiraid.limit),
          inline: true
        },
        {
          name: "Acción",
          value: settings.antiraid.action,
          inline: true
        }
      )
      .setTimestamp();

    await sendLog(member.guild, embed);

    if (settings.antiraid.action === "kick") {
      for (const join of validJoins) {
        const user =
          member.guild.members.cache.get(join.id);

        if (
          user &&
          !isOwner(user) &&
          user.kickable
        ) {
          await user.kick(
            "Anti-Raid de Naruto Uzumaki"
          ).catch(() => {});
        }
      }
    }

    joinTracker.set(member.guild.id, []);
  } catch (error) {
    console.error("❌ Error GuildMemberAdd:", error);
  }
});

// ============================================================
// 🔒 PROTECCIÓN DE CANALES
// ============================================================

client.on(Events.ChannelCreate, async channel => {
  try {
    if (!channel.guild) return;

    const settings =
      getGuild(channel.guild.id);

    if (!settings.channelProtection.enabled) {
      return;
    }

    const audit =
      await channel.guild.fetchAuditLogs({
        type: 10,
        limit: 1
      });

    const entry = audit.entries.first();

    if (!entry) return;

    if (
      Date.now() - entry.createdTimestamp > 10000
    ) {
      return;
    }

    const executor = entry.executor;

    if (!executor) return;

    if (
      executor.id === client.user.id ||
      executor.id === channel.guild.ownerId
    ) {
      return;
    }

    const member =
      await channel.guild.members
        .fetch(executor.id)
        .catch(() => null);

    if (!member) return;

    const allowedUser =
      settings.channelProtection.whitelistUsers
        .includes(executor.id);

    const allowedRole =
      member.roles.cache.some(role =>
        settings.channelProtection.whitelistRoles
          .includes(role.id)
      );

    if (allowedUser || allowedRole) return;

    if (channel.deletable) {
      await channel.delete(
        "Creación de canal no autorizada"
      ).catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setTitle("🔒 CREACIÓN DE CANAL BLOQUEADA")
      .setDescription(
        "Un miembro no autorizado intentó crear un canal."
      )
      .addFields(
        {
          name: "Usuario",
          value: `<@${executor.id}>`,
          inline: true
        },
        {
          name: "Canal",
          value: `#${channel.name}`,
          inline: true
        }
      )
      .setTimestamp();

    await sendLog(channel.guild, embed);
  } catch (error) {
    console.error("❌ Error Anti-Channel:", error);
  }
});

// ============================================================
// 💬 ANTI-SPAM
// ============================================================

const spamTracker = new Map();

client.on(Events.MessageCreate, async message => {
  try {
    if (!message.guild) return;
    if (message.author.bot) return;

    const settings =
      getGuild(message.guild.id);

    if (!settings.antispam.enabled) return;
    if (isAdmin(message.member)) return;

    const key =
      `${message.guild.id}-${message.author.id}`;

    const now = Date.now();

    if (!spamTracker.has(key)) {
      spamTracker.set(key, []);
    }

    const messages =
      spamTracker.get(key);

    messages.push(now);

    while (
      messages.length &&
      now - messages[0] >
      settings.antispam.interval
    ) {
      messages.shift();
    }

    if (
      messages.length >=
      settings.antispam.maxMessages
    ) {
      messages.length = 0;

      await message.delete().catch(() => {});

      if (message.member.moderatable) {
        await message.member.timeout(
          settings.antispam.timeout,
          "Anti-Spam de Naruto Uzumaki"
        ).catch(() => {});
      }

      await sendLog(
        message.guild,
        new EmbedBuilder()
          .setTitle("💬 ANTI-SPAM")
          .setDescription(
            `${message.author} fue detectado enviando spam.`
          )
          .addFields({
            name: "Acción",
            value: "Timeout automático"
          })
          .setTimestamp()
      );
    }
  } catch (error) {
    console.error("❌ Error Anti-Spam:", error);
  }
});

// ============================================================
// 🔗 ANTI-LINK
// ============================================================

client.on(Events.MessageCreate, async message => {
  try {
    if (!message.guild) return;
    if (message.author.bot) return;

    const settings =
      getGuild(message.guild.id);

    if (!settings.antilink.enabled) return;
    if (isAdmin(message.member)) return;

    const urlRegex =
      /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

    if (!urlRegex.test(message.content)) return;

    const lowerContent =
      message.content.toLowerCase();

    const allowed =
      settings.antilink.whitelist.some(
        domain =>
          lowerContent.includes(
            domain.toLowerCase()
          )
      );

    if (allowed) return;

    await message.delete().catch(() => {});

    const embed = new EmbedBuilder()
      .setTitle("🔗 ANTI-LINK")
      .setDescription(
        `${message.author} envió un enlace no permitido.`
      )
      .addFields({
        name: "Canal",
        value: `<#${message.channel.id}>`
      })
      .setTimestamp();

    await sendLog(
      message.guild,
      embed
    );
  } catch (error) {
    console.error("❌ Error Anti-Link:", error);
  }
});

// ============================================================
// 💬 COMANDOS
// ============================================================

client.on(Events.MessageCreate, async message => {
  try {
    if (!message.guild) return;
    if (message.author.bot) return;

    if (
      !message.content
        .toLowerCase()
        .startsWith(PREFIX)
    ) {
      return;
    }

    const args =
      message.content
        .slice(PREFIX.length)
        .trim()
        .split(/\s+/);

    const command =
      args.shift()?.toLowerCase();

    if (!command) return;

    const user =
      getUser(message.author.id);

    const guild =
      getGuild(message.guild.id);

    // ========================================================
    // ⭐ XP
    // ========================================================

    function addXP() {
      const amount =
        Math.floor(Math.random() * 10) + 5;

      user.xp += amount;

      const needed =
        user.level * 100;

      if (user.xp >= needed) {
        user.xp -= needed;
        user.level++;

        message.channel.send(
          `🎉 ${message.author} subió al **nivel ${user.level}**.`
        ).catch(() => {});
      }

      saveDB();
    }

    // ========================================================
    // 🏓 PING
    // ========================================================

    if (command === "ping") {
      return message.reply(
        `🏓 Pong! **${client.ws.ping}ms**`
      );
    }

    // ========================================================
    // 🆘 HELP PÚBLICO
    // ========================================================

    if (command === "help") {
      const text = `
🍥 **NARUTO UZUMAKI — AYUDA**

━━━━━━━━━━━━━━━━━━━━

💰 **ECONOMÍA**
${publicHelp.economia.map(x => `\`${PREFIX}${x}\``).join("\n")}

🏆 **RANK**
${publicHelp.rank.map(x => `\`${PREFIX}${x}\``).join("\n")}

👤 **SOCIAL**
${publicHelp.social.map(x => `\`${PREFIX}${x}\``).join("\n")}

🏠 **SERVIDOR**
${publicHelp.servidor.map(x => `\`${PREFIX}${x}\``).join("\n")}

🎮 **DIVERSIÓN**
${publicHelp.diversion.map(x => `\`${PREFIX}${x}\``).join("\n")}

🛒 **TIENDA**
${publicHelp.tienda.map(x => `\`${PREFIX}${x}\``).join("\n")}

━━━━━━━━━━━━━━━━━━━━

🔐 Los comandos administrativos están en:
\`${PREFIX}helpadmin\`
`;

      return message.reply(text);
    }

    // ========================================================
    // 🔐 HELP ADMIN
    // ========================================================

    if (command === "helpadmin") {
      if (!isAdmin(message.member)) {
        return message.reply(
          "❌ Solo los administradores pueden usar este comando."
        );
      }

      const text = `
🔐 **NARUTO UZUMAKI — PANEL ADMIN**

━━━━━━━━━━━━━━━━━━━━

🛡️ **MODERACIÓN**
${adminHelp.moderacion.map(x => `\`${PREFIX}${x}\``).join("\n")}

🏠 **SERVIDOR**
${adminHelp.servidor.map(x => `\`${PREFIX}${x}\``).join("\n")}

🎭 **ROLES**
${adminHelp.roles.map(x => `\`${PREFIX}${x}\``).join("\n")}

🛒 **TIENDA**
${adminHelp.tienda.map(x => `\`${PREFIX}${x}\``).join("\n")}

💰 **ECONOMÍA**
${adminHelp.economia.map(x => `\`${PREFIX}${x}\``).join("\n")}

━━━━━━━━━━━━━━━━━━━━
`;

      return message.reply(text);
    }

    // ========================================================
    // 💰 ECONOMÍA
    // ========================================================

    if (
      command === "balance" ||
      command === "money"
    ) {
      addXP();

      return message.reply(
        `💰 **${message.author.username}**\n\n` +
        `💵 Efectivo: **$${user.money}**\n` +
        `🏦 Banco: **$${user.bank}**\n` +
        `💎 Total: **$${user.money + user.bank}**`
      );
    }

    if (command === "daily") {
      const now = Date.now();
      const cooldown = 24 * 60 * 60 * 1000;

      if (now - user.daily < cooldown) {
        const remaining =
          cooldown - (now - user.daily);

        const hours =
          Math.ceil(remaining / 3600000);

        return message.reply(
          `⏰ Ya reclamaste tu recompensa. Vuelve en **${hours}h**.`
        );
      }

      user.money += 500;
      user.daily = now;

      addXP();

      return message.reply(
        "🎁 Recibiste **$500** de recompensa diaria."
      );
    }

    if (command === "work") {
      const jobs = [
        "🍜 Trabajaste en Ichiraku",
        "🥷 Hiciste una misión ninja",
        "🏃 Entrenaste a un genin",
        "📜 Completaste una misión",
        "🍥 Ayudaste en Konoha"
      ];

      const amount =
        Math.floor(Math.random() * 201) + 100;

      user.money += amount;

      addXP();

      return message.reply(
        `${jobs[Math.floor(Math.random() * jobs.length)]}\n` +
        `💰 Ganaste **$${amount}**.`
      );
    }

    if (command === "pay") {
      const target =
        message.mentions.users.first();

      const amount =
        parseInt(args[1]);

      if (
        !target ||
        !amount ||
        amount <= 0
      ) {
        return message.reply(
          `❌ Usa: \`${PREFIX}pay @usuario cantidad\``
        );
      }

      if (target.id === message.author.id) {
        return message.reply(
          "❌ No puedes enviarte dinero a ti mismo."
        );
      }

      if (user.money < amount) {
        return message.reply(
          "❌ No tienes suficiente dinero."
        );
      }

      const targetUser =
        getUser(target.id);

      user.money -= amount;
      targetUser.money += amount;

      addXP();

      return message.reply(
        `💸 Enviaste **$${amount}** a ${target}.`
      );
    }

    if (command === "deposit") {
      const amount =
        args[0]?.toLowerCase() === "all"
          ? user.money
          : parseInt(args[0]);

      if (!amount || amount <= 0) {
        return message.reply(
          `❌ Usa: \`${PREFIX}deposit cantidad\``
        );
      }

      if (amount > user.money) {
        return message.reply(
          "❌ No tienes tanto dinero."
        );
      }

      user.money -= amount;
      user.bank += amount;

      addXP();

      return message.reply(
        `🏦 Depositaste **$${amount}**.`
      );
    }

    if (command === "withdraw") {
      const amount =
        args[0]?.toLowerCase() === "all"
          ? user.bank
          : parseInt(args[0]);

      if (!amount || amount <= 0) {
        return message.reply(
          `❌ Usa: \`${PREFIX}withdraw cantidad\``
        );
      }

      if (amount > user.bank) {
        return message.reply(
          "❌ No tienes tanto dinero en el banco."
        );
      }

      user.bank -= amount;
      user.money += amount;

      addXP();

      return message.reply(
        `🏦 Retiraste **$${amount}**.`
      );
    }

    if (command === "bank") {
      return message.reply(
        `🏦 Banco: **$${user.bank}**`
      );
    }

    if (
      command === "richest" ||
      command === "economy"
    ) {
      const richest =
        Object.entries(db.users)
          .sort(
            (a, b) =>
              (b[1].money + b[1].bank) -
              (a[1].money + a[1].bank)
          )
          .slice(0, 10);

      let text = "💰 **TOP ECONOMÍA**\n\n";

      richest.forEach(
        ([id, data], index) => {
          text +=
            `**${index + 1}.** <@${id}> — **$${data.money + data.bank}**\n`;
        }
      );

      return message.reply(text);
    }

    // ========================================================
    // 🏆 RANK
    // ========================================================

    if (
      command === "rank" ||
      command === "rankcard"
    ) {
      return message.reply(
        `🏆 **RANK DE ${message.author.username}**\n\n` +
        `⭐ Nivel: **${user.level}**\n` +
        `✨ XP: **${user.xp}/${user.level * 100}**`
      );
    }

    if (command === "level") {
      return message.reply(
        `🏆 Tu nivel es **${user.level}**.`
      );
    }

    if (command === "xp") {
      return message.reply(
        `✨ XP: **${user.xp}/${user.level * 100}**`
      );
    }

    if (
      command === "leaderboard" ||
      command === "top"
    ) {
      const top =
        Object.entries(db.users)
          .sort(
            (a, b) =>
              b[1].level - a[1].level ||
              b[1].xp - a[1].xp
          )
          .slice(0, 10);

      let text = "🏆 **TOP RANK**\n\n";

      top.forEach(
        ([id, data], index) => {
          text +=
            `**${index + 1}.** <@${id}> — Nivel **${data.level}**\n`;
        }
      );

      return message.reply(text);
    }

    if (command === "rewards") {
      return message.reply(
        `🎁 **RECOMPENSAS**\n\n` +
        `Nivel 5 → Recompensa especial\n` +
        `Nivel 10 → Recompensa especial\n` +
        `Nivel 25 → Recompensa especial\n` +
        `Nivel 50 → Recompensa especial`
      );
    }

    if (command === "levels") {
      return message.reply(
        `🏆 Cada nivel requiere XP.\n\n` +
        `Nivel actual: **${user.level}**\n` +
        `XP: **${user.xp}/${user.level * 100}**`
      );
    }

    // ========================================================
    // 💰 ADMIN XP
    // ========================================================

    if (
      command === "addxp" ||
      command === "removexp"
    ) {
      if (!isAdmin(message.member)) {
        return message.reply(
          "❌ Solo los administradores pueden usar este comando."
        );
      }

      const target =
        message.mentions.users.first();

      const amount =
        parseInt(args[1]);

      if (
        !target ||
        !amount ||
        amount <= 0
      ) {
        return message.reply(
          `❌ Usa: \`${PREFIX}${command} @usuario cantidad\``
        );
      }

      const targetData =
        getUser(target.id);

      if (command === "addxp") {
        targetData.xp += amount;
      } else {
        targetData.xp =
          Math.max(
            0,
            targetData.xp - amount
          );
      }

      saveDB();

      return message.reply(
        `✨ XP actualizada para ${target}.`
      );
    }

    // ========================================================
    // 👤 SOCIAL
    // ========================================================

    if (command === "profile") {
      return message.reply(
        `👤 **PERFIL DE ${message.author.username}**\n\n` +
        `🏆 Nivel: **${user.level}**\n` +
        `✨ XP: **${user.xp}**\n` +
        `💰 Dinero: **$${user.money + user.bank}**\n` +
        `⭐ Reputación: **${user.reps}**\n` +
        `📝 Bio: ${user.bio}`
      );
    }

    if (command === "avatar") {
      return message.reply(
        message.author.displayAvatarURL({
          size: 1024
        })
      );
    }

    if (command === "banner") {
      const fetched =
        await client.users.fetch(
          message.author.id,
          { force: true }
        );

      if (!fetched.banner) {
        return message.reply(
          "❌ No tienes banner."
        );
      }

      return message.reply(
        fetched.bannerURL({
          size: 1024
        })
      );
    }

    if (command === "bio") {
      return message.reply(
        `📝 Tu bio:\n${user.bio}`
      );
    }

    if (command === "setbio") {
      const bio =
        args.join(" ");

      if (!bio) {
        return message.reply(
          `❌ Usa: \`${PREFIX}setbio texto\``
        );
      }

      if (bio.length > 200) {
        return message.reply(
          "❌ La bio no puede superar 200 caracteres."
        );
      }

      user.bio = bio;

      saveDB();

      return message.reply(
        "✅ Bio actualizada."
      );
    }

    if (command === "rep") {
      const target =
        message.mentions.users.first();

      if (!target) {
        return message.reply(
          `❌ Usa: \`${PREFIX}rep @usuario\``
        );
      }

      if (target.id === message.author.id) {
        return message.reply(
          "❌ No puedes darte reputación a ti mismo."
        );
      }

      const targetData =
        getUser(target.id);

      targetData.reps++;

      saveDB();

      return message.reply(
        `⭐ ${target} recibió reputación de ${message.author}.`
      );
    }

    if (command === "reps") {
      return message.reply(
        `⭐ Tu reputación es **${user.reps}**.`
      );
    }

    if (command === "friends") {
      return message.reply(
        "👥 El sistema de amigos estará disponible próximamente."
      );
    }

    if (command === "status") {
      return message.reply(
        `👤 **${message.author.username}** está usando Naruto Uzumaki.`
      );
    }

    if (command === "social") {
      return message.reply(
        `👤 Perfil: \`${PREFIX}profile\`\n` +
        `⭐ Reputación: \`${PREFIX}reps\`\n` +
        `📝 Bio: \`${PREFIX}bio\``
      );
    }

    // ========================================================
    // 🏠 SERVIDOR
    // ========================================================

    if (
      command === "serverinfo" ||
      command === "info"
    ) {
      return message.reply(
        `🏠 **${message.guild.name}**\n\n` +
        `👑 Owner: <@${message.guild.ownerId}>\n` +
        `👥 Miembros: **${message.guild.memberCount}**\n` +
        `💬 Canales: **${message.guild.channels.cache.size}**\n` +
        `🎭 Roles: **${message.guild.roles.cache.size}**`
      );
    }

    if (command === "members") {
      return message.reply(
        `👥 **MIEMBROS**\n\n` +
        `Total: **${message.guild.memberCount}**\n` +
        `Humanos: **${message.guild.members.cache.filter(m => !m.user.bot).size}**\n` +
        `Bots: **${message.guild.members.cache.filter(m => m.user.bot).size}**`
      );
    }

    if (command === "userinfo") {
      const target =
        message.mentions.members.first() ||
        message.member;

      return message.reply(
        `👤 **${target.user.username}**\n\n` +
        `🆔 ID: **${target.id}**\n` +
        `📅 Cuenta: <t:${Math.floor(target.user.createdTimestamp / 1000)}:R>\n` +
        `🎭 Roles: **${Math.max(0, target.roles.cache.size - 1)}**`
      );
    }

    if (command === "botinfo") {
      return message.reply(
        `🍥 **NARUTO UZUMAKI**\n\n` +
        `🤖 Usuario: **${client.user.tag}**\n` +
        `🏠 Servidores: **${client.guilds.cache.size}**\n` +
        `👥 Usuarios: **${client.users.cache.size}**\n` +
        `📡 Ping: **${client.ws.ping}ms**`
      );
    }

    if (command === "servericon") {
      return message.reply(
        message.guild.iconURL({
          size: 1024
        }) ||
        "❌ El servidor no tiene icono."
      );
    }

    if (command === "roleinfo") {
      const role =
        message.mentions.roles.first();

      if (!role) {
        return message.reply(
          `❌ Usa: \`${PREFIX}roleinfo @rol\``
        );
      }

      return message.reply(
        `🎭 **${role.name}**\n` +
        `🆔 ${role.id}\n` +
        `👥 Miembros: **${role.members.size}**`
      );
    }

    if (command === "rolelist") {
      const roles =
        message.guild.roles.cache
          .map(role => role.name)
          .slice(0, 50);

      return message.reply(
        `🎭 **ROLES**\n\n${roles.join("\n")}`
      );
    }

    if (command === "channelinfo") {
      return message.reply(
        `💬 **${message.channel.name}**\n` +
        `🆔 ${message.channel.id}`
      );
    }

    if (command === "membercount") {
      return message.reply(
        `👥 El servidor tiene **${message.guild.memberCount} miembros**.`
      );
    }

    if (command === "invite") {
      return message.reply(
        "🔗 Usa la invitación oficial de tu servidor."
      );
    }

    // ========================================================
    // 🛒 TIENDA PÚBLICA
    // ========================================================

    if (command === "tienda" && args[0] !== "agregar" &&
        args[0] !== "quitar" &&
        args[0] !== "precio" &&
        args[0] !== "editar" &&
        args[0] !== "lista") {

      const roles = Object.entries(guild.shop.roles);

      if (!roles.length) {
        return message.reply(
          "🛒 **TIENDA**\n\nNo hay roles disponibles actualmente."
        );
      }

      let text =
        "🛒 **TIENDA DE NARUTO**\n\n";

      roles.forEach(([roleId, data], index) => {
        const role =
          message.guild.roles.cache.get(roleId);

        if (!role) return;

        text +=
          `**${index + 1}.** ${role}\n` +
          `💰 Precio: **$${data.price}**\n\n`;
      });

      text +=
        `\n💵 Dinero disponible: **$${user.money}**\n` +
        `\n🛍️ Para comprar: \`${PREFIX}comprar @rol\``;

      return message.reply(text);
    }

    // ========================================================
    // 🛍️ COMPRAR ROL
    // ========================================================

    if (command === "comprar") {
      const role =
        message.mentions.roles.first();

      if (!role) {
        return message.reply(
          `❌ Usa: \`${PREFIX}comprar @rol\``
        );
      }

      const product =
        guild.shop.roles[role.id];

      if (!product) {
        return message.reply(
          "❌ Ese rol no está disponible en la tienda."
        );
      }

      if (message.member.roles.cache.has(role.id)) {
        return message.reply(
          "❌ Ya tienes ese rol."
        );
      }

      if (user.money < product.price) {
        return message.reply(
          `❌ No tienes suficiente dinero.\n` +
          `💰 Tienes: **$${user.money}**\n` +
          `🏷️ Precio: **$${product.price}**`
        );
      }

      if (!role.editable) {
        return message.reply(
          "❌ Naruto no puede asignar ese rol. El rol está por encima del rol del bot."
        );
      }

      user.money -= product.price;

      await message.member.roles.add(
        role,
        `Compra en tienda por ${message.author.tag}`
      );

      saveDB();

      return message.reply(
        `🛍️ ¡Compra realizada!\n\n` +
        `🎭 Rol: ${role}\n` +
        `💰 Pagaste: **$${product.price}**\n` +
        `💵 Dinero restante: **$${user.money}**`
      );
    }

    // ========================================================
    // 🔐 TIENDA ADMIN
    // ========================================================

    if (
      command === "tienda" &&
      [
        "agregar",
        "quitar",
        "precio",
        "editar",
        "lista"
      ].includes(args[0]?.toLowerCase())
    ) {
      if (!isAdmin(message.member)) {
        return message.reply(
          "❌ Solo los administradores pueden modificar la tienda."
        );
      }

      const action =
        args[0].toLowerCase();

      // --------------------------------------------------------
      // LISTA
      // --------------------------------------------------------

      if (action === "lista") {
        const products =
          Object.entries(guild.shop.roles);

        if (!products.length) {
          return message.reply(
            "🛒 La tienda está vacía."
          );
        }

        let text =
          "🛒 **PRODUCTOS DE LA TIENDA**\n\n";

        products.forEach(([roleId, data], index) => {
          const role =
            message.guild.roles.cache.get(roleId);

          text +=
            `**${index + 1}.** ${role || `Rol eliminado (${roleId})`}\n` +
            `💰 Precio: **$${data.price}**\n\n`;
        });

        return message.reply(text);
      }

      // --------------------------------------------------------
      // AGREGAR
      // --------------------------------------------------------

      if (action === "agregar") {
        const role =
          message.mentions.roles.first();

        const price =
          parseInt(
            args.find(x => /^\d+$/.test(x))
          );

        if (!role || !price || price <= 0) {
          return message.reply(
            `❌ Usa: \`${PREFIX}tienda agregar @Rol 5000\``
          );
        }

        if (guild.shop.roles[role.id]) {
          return message.reply(
            "❌ Ese rol ya está en la tienda."
          );
        }

        if (!role.editable) {
          return message.reply(
            "❌ Naruto no puede asignar ese rol."
          );
        }

        guild.shop.roles[role.id] = {
          price,
          createdAt: Date.now()
        };

        saveDB();

        return message.reply(
          `✅ Rol añadido a la tienda.\n\n` +
          `🎭 Rol: ${role}\n` +
          `💰 Precio: **$${price}**`
        );
      }

      // --------------------------------------------------------
      // QUITAR
      // --------------------------------------------------------

      if (action === "quitar") {
        const role =
          message.mentions.roles.first();

        if (!role) {
          return message.reply(
            `❌ Usa: \`${PREFIX}tienda quitar @Rol\``
          );
        }

        if (!guild.shop.roles[role.id]) {
          return message.reply(
            "❌ Ese rol no está en la tienda."
          );
        }

        delete guild.shop.roles[role.id];

        saveDB();

        return message.reply(
          `🗑️ ${role} fue eliminado de la tienda.`
        );
      }

      // --------------------------------------------------------
      // PRECIO
      // --------------------------------------------------------

      if (action === "precio") {
        const role =
          message.mentions.roles.first();

        const price =
          parseInt(
            args.find(x => /^\d+$/.test(x))
          );

        if (!role || !price || price <= 0) {
          return message.reply(
            `❌ Usa: \`${PREFIX}tienda precio @Rol 7500\``
          );
        }

        if (!guild.shop.roles[role.id]) {
          return message.reply(
            "❌ Ese rol no está en la tienda."
          );
        }

        guild.shop.roles[role.id].price =
          price;

        saveDB();

        return message.reply(
          `💰 Precio actualizado.\n` +
          `${role} → **$${price}**`
        );
      }

      // --------------------------------------------------------
      // EDITAR
      // --------------------------------------------------------

      if (action === "editar") {
        const role =
          message.mentions.roles.first();

        const price =
          parseInt(
            args.find(x => /^\d+$/.test(x))
          );

        if (!role || !price || price <= 0) {
          return message.reply(
            `❌ Usa: \`${PREFIX}tienda editar @Rol 10000\``
          );
        }

        if (!guild.shop.roles[role.id]) {
          return message.reply(
            "❌ Ese rol no está en la tienda."
          );
        }

        guild.shop.roles[role.id].price =
          price;

        saveDB();

        return message.reply(
          `✏️ Producto editado.\n\n` +
          `🎭 Rol: ${role}\n` +
          `💰 Nuevo precio: **$${price}**`
        );
      }
    }

    // ========================================================
    // 🛡️ MODERACIÓN
    // ========================================================

    if (
      moderationCommands.includes(command) &&
      !isAdmin(message.member)
    ) {
      return message.reply(
        "❌ Este comando solo está disponible para administradores."
      );
    }

    // BAN
    if (command === "ban") {
      const target =
        message.mentions.members.first();

      if (!target) {
        return message.reply(
          `❌ Usa: \`${PREFIX}ban @usuario\``
        );
      }

      if (target.id === message.author.id) {
        return message.reply(
          "❌ No puedes banearte a ti mismo."
        );
      }

      if (!target.bannable) {
        return message.reply(
          "❌ No puedo banear a ese usuario."
        );
      }

      await target.ban({
        reason:
          `Ban por ${message.author.tag}`
      });

      return message.reply(
        `🔨 ${target.user.tag} fue baneado.`
      );
    }

    // MUTE
    if (command === "mute") {
      const target =
        message.mentions.members.first();

      const minutes =
        parseInt(args[1]) || 10;

      if (!target) {
        return message.reply(
          `❌ Usa: \`${PREFIX}mute @usuario minutos\``
        );
      }

      if (!target.moderatable) {
        return message.reply(
          "❌ No puedo silenciar a ese usuario."
        );
      }

      await target.timeout(
        minutes * 60000,
        `Mute por ${message.author.tag}`
      );

      return message.reply(
        `🔇 ${target.user.tag} fue muteado durante **${minutes} minutos**.`
      );
    }

    // KICK
    if (command === "kick") {
      const target =
        message.mentions.members.first();

      if (!target) {
        return message.reply(
          `❌ Usa: \`${PREFIX}kick @usuario\``
        );
      }

      if (!target.kickable) {
        return message.reply(
          "❌ No puedo expulsar a ese usuario."
        );
      }

      await target.kick(
        `Kick por ${message.author.tag}`
      );

      return message.reply(
        `👢 ${target.user.tag} fue expulsado.`
      );
    }

    // UNBAN
    if (command === "unban") {
      const userId = args[0];

      if (!userId) {
        return message.reply(
          `❌ Usa: \`${PREFIX}unban ID\``
        );
      }

      await message.guild.members.unban(
        userId
      );

      return message.reply(
        "✅ Usuario desbaneado."
      );
    }

    // UNMUTE
    if (command === "unmute") {
      const target =
        message.mentions.members.first();

      if (!target) {
        return message.reply(
          `❌ Usa: \`${PREFIX}unmute @usuario\``
        );
      }

      await target.timeout(null);

      return message.reply(
        `🔊 Mute eliminado de ${target}.`
      );
    }

    // TIMEOUT
    if (command === "timeout") {
      const target =
        message.mentions.members.first();

      const minutes =
        parseInt(args[1]);

      if (
        !target ||
        !minutes ||
        minutes <= 0
      ) {
        return message.reply(
          `❌ Usa: \`${PREFIX}timeout @usuario minutos\``
        );
      }

      if (!target.moderatable) {
        return message.reply(
          "❌ No puedo aplicar timeout."
        );
      }

      await target.timeout(
        minutes * 60000,
        `Timeout por ${message.author.tag}`
      );

      return message.reply(
        `⏳ Timeout aplicado durante **${minutes} minutos**.`
      );
    }

    // UNTIMEOUT
    if (command === "untimeout") {
      const target =
        message.mentions.members.first();

      if (!target) {
        return message.reply(
          `❌ Usa: \`${PREFIX}untimeout @usuario\``
        );
      }

      await target.timeout(null);

      return message.reply(
        `✅ Timeout eliminado de ${target}.`
      );
    }

    // CLEAR
    if (command === "clear") {
      const amount =
        parseInt(args[0]);

      if (
        !amount ||
        amount < 1 ||
        amount > 100
      ) {
        return message.reply(
          `❌ Usa: \`${PREFIX}clear 1-100\``
        );
      }

      const deleted =
        await message.channel.bulkDelete(
          amount,
          true
        );

      return message.channel.send(
        `🧹 Se eliminaron **${deleted.size} mensajes**.`
      );
    }

    // WARN
    if (command === "warn") {
      const target =
        message.mentions.users.first();

      if (!target) {
        return message.reply(
          `❌ Usa: \`${PREFIX}warn @usuario\``
        );
      }

      const targetData =
        getUser(target.id);

      targetData.warnings++;

      saveDB();

      return message.reply(
        `⚠️ ${target} recibió un warning.\n` +
        `Warnings: **${targetData.warnings}**`
      );
    }

    // WARNINGS
    if (command === "warnings") {
      const target =
        message.mentions.users.first() ||
        message.author;

      const targetData =
        getUser(target.id);

      return message.reply(
        `⚠️ ${target} tiene **${targetData.warnings} warnings**.`
      );
    }

    // LOCK
    if (command === "lock") {
      await message.channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        {
          SendMessages: false
        }
      );

      return message.reply(
        "🔒 Canal bloqueado."
      );
    }

    // UNLOCK
    if (command === "unlock") {
      await message.channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        {
          SendMessages: null
        }
      );

      return message.reply(
        "🔓 Canal desbloqueado."
      );
    }

    // ========================================================
    // 🎮 DIVERSIÓN
    // ========================================================

    if (command === "8ball") {
      const answers = [
        "Sí.",
        "No.",
        "Probablemente.",
        "No lo sé.",
        "Definitivamente.",
        "Pregunta otra vez."
      ];

      return message.reply(
        `🎱 ${
          answers[
            Math.floor(
              Math.random() * answers.length
            )
          ]
        }`
      );
    }

    if (command === "dice") {
      const result =
        Math.floor(Math.random() * 6) + 1;

      return message.reply(
        `🎲 Sacaste **${result}**.`
      );
    }

    if (command === "rps") {
      const choices = [
        "piedra",
        "papel",
        "tijera"
      ];

      const player =
        args[0]?.toLowerCase();

      if (!choices.includes(player)) {
        return message.reply(
          `❌ Usa: \`${PREFIX}rps piedra\`, \`${PREFIX}rps papel\` o \`${PREFIX}rps tijera\``
        );
      }

      const bot =
        choices[
          Math.floor(
            Math.random() * choices.length
          )
        ];

      let result = "🤝 Empate.";

      if (
        (player === "piedra" && bot === "tijera") ||
        (player === "papel" && bot === "piedra") ||
        (player === "tijera" && bot === "papel")
      ) {
        result = "🎉 ¡Ganaste!";
      } else if (player !== bot) {
        result = "😢 Ganó Naruto.";
      }

      return message.reply(
        `✊ Tú: **${player}**\n` +
        `🤖 Naruto: **${bot}**\n\n` +
        result
      );
    }

    if (command === "joke") {
      const jokes = [
        "🍥 ¿Qué hace Naruto cuando tiene hambre? Va a Ichiraku.",
        "🥷 ¿Cuál es el ninja más rápido? El que ya terminó su misión.",
        "🍜 Una misión sin ramen es una misión incompleta."
      ];

      return message.reply(
        jokes[
          Math.floor(
            Math.random() * jokes.length
          )
        ]
      );
    }

    if (command === "ship") {
      const target =
        message.mentions.users.first();

      if (!target) {
        return message.reply(
          `❌ Usa: \`${PREFIX}ship @usuario\``
        );
      }

      const percent =
        Math.floor(Math.random() * 101);

      return message.reply(
        `💖 Compatibilidad: **${percent}%**`
      );
    }

    if (command === "choose") {
      if (args.length < 2) {
        return message.reply(
          `❌ Ejemplo: \`${PREFIX}choose pizza hamburguesa\``
        );
      }

      const choice =
        args[
          Math.floor(
            Math.random() * args.length
          )
        ];

      return message.reply(
        `🤔 Elijo: **${choice}**`
      );
    }

    if (command === "reverse") {
      const text =
        args.join(" ");

      if (!text) {
        return message.reply(
          `❌ Usa: \`${PREFIX}reverse texto\``
        );
      }

      return message.reply(
        text.split("").reverse().join("")
      );
    }

    if (command === "say") {
      if (!args.length) {
        return message.reply(
          `❌ Usa: \`${PREFIX}say mensaje\``
        );
      }

      await message.delete().catch(() => {});

      return message.channel.send(
        args.join(" ")
      );
    }

    if (command === "random") {
      const max =
        parseInt(args[0]) || 100;

      if (max < 1) {
        return message.reply(
          "❌ El número máximo debe ser mayor que 0."
        );
      }

      const number =
        Math.floor(
          Math.random() * max
        ) + 1;

      return message.reply(
        `🎲 Número aleatorio: **${number}**`
      );
    }

    if (command === "hug") {
      const target =
        message.mentions.users.first();

      if (!target) {
        return message.reply(
          `❌ Usa: \`${PREFIX}hug @usuario\``
        );
      }

      return message.reply(
        `🫂 ${message.author} le dio un abrazo a ${target}.`
      );
    }

    // ========================================================
    // ⚙️ CONFIGURACIÓN ADMIN
    // ========================================================

    if (
      [
        "logs",
        "welcome",
        "autorole",
        "settings",
        "antilink",
        "antispam",
        "antiraid",
        "channelprotect"
      ].includes(command)
    ) {
      if (!isAdmin(message.member)) {
        return message.reply(
          "❌ Solo administradores."
        );
      }
    }

    // LOGS
    if (command === "logs") {
      const option =
        args[0]?.toLowerCase();

      if (option === "set") {
        const channel =
          message.mentions.channels.first();

        if (!channel) {
          return message.reply(
            `❌ Usa: \`${PREFIX}logs set #canal\``
          );
        }

        guild.logsChannel =
          channel.id;

        saveDB();

        return message.reply(
          `📝 Logs configurados en ${channel}.`
        );
      }

      if (option === "disable") {
        guild.logsChannel = null;

        saveDB();

        return message.reply(
          "📝 Sistema de logs desactivado."
        );
      }

      if (option === "test") {
        if (!guild.logsChannel) {
          return message.reply(
            "❌ Primero configura un canal de logs."
          );
        }

        await sendLog(
          message.guild,
          new EmbedBuilder()
            .setTitle("📝 TEST DE LOGS")
            .setDescription(
              "Los logs funcionan correctamente."
            )
            .setTimestamp()
        );

        return message.reply(
          "✅ Log de prueba enviado."
        );
      }

      return message.reply(
        `📝 Canal actual: ${
          guild.logsChannel
            ? `<#${guild.logsChannel}>`
            : "No configurado"
        }`
      );
    }

    // ANTIRAID
    if (command === "antiraid") {
      const option =
        args[0]?.toLowerCase();

      if (option === "on") {
        guild.antiraid.enabled = true;
        saveDB();

        return message.reply(
          "🚨 Anti-Raid activado."
        );
      }

      if (option === "off") {
        guild.antiraid.enabled = false;
        saveDB();

        return message.reply(
          "🚨 Anti-Raid desactivado."
        );
      }

      if (option === "limit") {
        const amount =
          parseInt(args[1]);

        if (!amount || amount < 2) {
          return message.reply(
            `❌ Usa: \`${PREFIX}antiraid limit 5\``
          );
        }

        guild.antiraid.limit = amount;

        saveDB();

        return message.reply(
          `✅ Límite Anti-Raid: **${amount} entradas**.`
        );
      }

      if (option === "time") {
        const seconds =
          parseInt(args[1]);

        if (!seconds || seconds < 1) {
          return message.reply(
            `❌ Usa: \`${PREFIX}antiraid time 10\``
          );
        }

        guild.antiraid.seconds = seconds;

        saveDB();

        return message.reply(
          `⏱️ Ventana Anti-Raid: **${seconds} segundos**.`
        );
      }

      if (option === "config") {
        return message.reply(
          `🚨 **ANTI-RAID**\n\n` +
          `Estado: **${guild.antiraid.enabled ? "ON" : "OFF"}**\n` +
          `Límite: **${guild.antiraid.limit}**\n` +
          `Tiempo: **${guild.antiraid.seconds}s**`
        );
      }

      return message.reply(
        `🚨 Usa:\n` +
        `\`${PREFIX}antiraid on\`\n` +
        `\`${PREFIX}antiraid off\`\n` +
        `\`${PREFIX}antiraid limit 5\`\n` +
        `\`${PREFIX}antiraid time 10\`\n` +
        `\`${PREFIX}antiraid config\``
      );
    }

    // ANTILINK
    if (command === "antilink") {
      const option =
        args[0]?.toLowerCase();

      if (option === "on") {
        guild.antilink.enabled = true;
        saveDB();

        return message.reply(
          "🔗 Anti-Link activado."
        );
      }

      if (option === "off") {
        guild.antilink.enabled = false;
        saveDB();

        return message.reply(
          "🔗 Anti-Link desactivado."
        );
      }

      if (option === "whitelist") {
        const domain =
          args[1]?.toLowerCase();

        if (!domain) {
          return message.reply(
            `🔗 Dominios permitidos:\n${guild.antilink.whitelist.join("\n")}`
          );
        }

        if (
          !guild.antilink.whitelist.includes(domain)
        ) {
          guild.antilink.whitelist.push(domain);
        }

        saveDB();

        return message.reply(
          `✅ Dominio permitido: **${domain}**`
        );
      }

      if (option === "remove") {
        const domain =
          args[1]?.toLowerCase();

        if (!domain) {
          return message.reply(
            `❌ Usa: \`${PREFIX}antilink remove dominio.com\``
          );
        }

        guild.antilink.whitelist =
          guild.antilink.whitelist.filter(
            x =>
              x.toLowerCase() !== domain
          );

        saveDB();

        return message.reply(
          "✅ Dominio eliminado de la whitelist."
        );
      }

      return message.reply(
        `🔗 Usa:\n` +
        `\`${PREFIX}antilink on\`\n` +
        `\`${PREFIX}antilink off\`\n` +
        `\`${PREFIX}antilink whitelist discord.com\`\n` +
        `\`${PREFIX}antilink remove discord.com\``
      );
    }

    // ANTISPAM
    if (command === "antispam") {
      const option =
        args[0]?.toLowerCase();

      if (option === "on") {
        guild.antispam.enabled = true;
        saveDB();

        return message.reply(
          "💬 Anti-Spam activado."
        );
      }

      if (option === "off") {
        guild.antispam.enabled = false;
        saveDB();

        return message.reply(
          "💬 Anti-Spam desactivado."
        );
      }

      if (option === "limit") {
        const amount =
          parseInt(args[1]);

        if (!amount || amount < 2) {
          return message.reply(
            `❌ Usa: \`${PREFIX}antispam limit 5\``
          );
        }

        guild.antispam.maxMessages =
          amount;

        saveDB();

        return message.reply(
          `✅ Límite Anti-Spam: **${amount} mensajes**.`
        );
      }

      return message.reply(
        `💬 Usa:\n` +
        `\`${PREFIX}antispam on\`\n` +
        `\`${PREFIX}antispam off\`\n` +
        `\`${PREFIX}antispam limit 5\``
      );
    }

    // CHANNEL PROTECT
    if (command === "channelprotect") {
      const option =
        args[0]?.toLowerCase();

      if (option === "on") {
        guild.channelProtection.enabled = true;
        saveDB();

        return message.reply(
          "🔒 Protección de canales activada."
        );
      }

      if (option === "off") {
        guild.channelProtection.enabled = false;
        saveDB();

        return message.reply(
          "🔓 Protección de canales desactivada."
        );
      }

      if (option === "user") {
        const target =
          message.mentions.users.first();

        if (!target) {
          return message.reply(
            `❌ Usa: \`${PREFIX}channelprotect user @usuario\``
          );
        }

        if (
          !guild.channelProtection.whitelistUsers
            .includes(target.id)
        ) {
          guild.channelProtection.whitelistUsers.push(
            target.id
          );
        }

        saveDB();

        return message.reply(
          `✅ ${target} puede crear canales.`
        );
      }

      if (option === "role") {
        const role =
          message.mentions.roles.first();

        if (!role) {
          return message.reply(
            `❌ Usa: \`${PREFIX}channelprotect role @rol\``
          );
        }

        if (
          !guild.channelProtection.whitelistRoles
            .includes(role.id)
        ) {
          guild.channelProtection.whitelistRoles.push(
            role.id
          );
        }

        saveDB();

        return message.reply(
          `✅ El rol ${role} puede crear canales.`
        );
      }

      return message.reply(
        `🔒 Usa:\n` +
        `\`${PREFIX}channelprotect on\`\n` +
        `\`${PREFIX}channelprotect off\`\n` +
        `\`${PREFIX}channelprotect user @usuario\`\n` +
        `\`${PREFIX}channelprotect role @rol\``
      );
    }

    // WELCOME
    if (command === "welcome") {
      if (args[0] === "on") {
        guild.welcome.enabled = true;
        saveDB();

        return message.reply(
          "👋 Bienvenidas activadas."
        );
      }

      if (args[0] === "off") {
        guild.welcome.enabled = false;
        saveDB();

        return message.reply(
          "👋 Bienvenidas desactivadas."
        );
      }

      if (args[0] === "channel") {
        const channel =
          message.mentions.channels.first();

        if (!channel) {
          return message.reply(
            `❌ Usa: \`${PREFIX}welcome channel #canal\``
          );
        }

        guild.welcome.channel =
          channel.id;

        saveDB();

        return message.reply(
          `👋 Canal de bienvenida: ${channel}`
        );
      }

      return message.reply(
        `👋 Usa:\n` +
        `\`${PREFIX}welcome on\`\n` +
        `\`${PREFIX}welcome off\`\n` +
        `\`${PREFIX}welcome channel #canal\``
      );
    }

    // AUTOROLE
    if (command === "autorole") {
      if (args[0] === "on") {
        guild.autorole.enabled = true;
        saveDB();

        return message.reply(
          "🎭 Autorole activado."
        );
      }

      if (args[0] === "off") {
        guild.autorole.enabled = false;
        saveDB();

        return message.reply(
          "🎭 Autorole desactivado."
        );
      }

      if (args[0] === "set") {
        const role =
          message.mentions.roles.first();

        if (!role) {
          return message.reply(
            `❌ Usa: \`${PREFIX}autorole set @rol\``
          );
        }

        guild.autorole.role =
          role.id;

        saveDB();

        return message.reply(
          `🎭 Autorole configurado: ${role}`
        );
      }

      return message.reply(
        `🎭 Usa:\n` +
        `\`${PREFIX}autorole on\`\n` +
        `\`${PREFIX}autorole off\`\n` +
        `\`${PREFIX}autorole set @rol\``
      );
    }

    // SETTINGS
    if (command === "settings") {
      return message.reply(
        `⚙️ **CONFIGURACIÓN DEL SERVIDOR**\n\n` +
        `📝 Logs: ${
          guild.logsChannel
            ? `<#${guild.logsChannel}>`
            : "No configurados"
        }\n` +
        `🚨 Anti-Raid: ${
          guild.antiraid.enabled ? "ON" : "OFF"
        }\n` +
        `🔗 Anti-Link: ${
          guild.antilink.enabled ? "ON" : "OFF"
        }\n` +
        `💬 Anti-Spam: ${
          guild.antispam.enabled ? "ON" : "OFF"
        }\n` +
        `🔒 Protección: ${
          guild.channelProtection.enabled ? "ON" : "OFF"
        }\n` +
        `👋 Welcome: ${
          guild.welcome.enabled ? "ON" : "OFF"
        }\n` +
        `🎭 Autorole: ${
          guild.autorole.enabled ? "ON" : "OFF"
        }\n` +
        `🛒 Productos: **${Object.keys(guild.shop.roles).length}**`
      );
    }

    // ========================================================
    // ❓ DESCONOCIDO
    // ========================================================

    return message.reply(
      `❌ Comando desconocido. Usa \`${PREFIX}help\` para ver los comandos.`
    );

  } catch (error) {
    console.error(
      "❌ Error ejecutando comando:",
      error
    );

    await message.reply(
      "❌ Ocurrió un error ejecutando el comando."
    ).catch(() => {});
  }
});

// ============================================================
// 🔐 LOGIN
// ============================================================

if (!process.env.DISCORD_TOKEN) {
  console.error(
    "❌ FALTA LA VARIABLE DISCORD_TOKEN EN RENDER."
  );

  process.exit(1);
}

console.log(
  "🔄 Conectando Naruto Uzumaki a Discord..."
);

client.login(
  process.env.DISCORD_TOKEN
).catch(error => {
  console.error(
    "❌ ERROR AL INICIAR SESIÓN EN DISCORD:"
  );

  console.error(error);
});
