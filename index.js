// ============================================================
// 🍥 NARUTO — DISCORD BOT
// discord.js v14
// PREFIX: N!
// ============================================================

const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  AuditLogEvent,
  Events
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const http = require("http");

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const PREFIX = "N!";
const DATA_FILE = path.join(__dirname, "data.json");

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
// 🌐 RENDER / KEEP ALIVE
// ============================================================

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end("🍥 Naruto está conectado correctamente.");
}).listen(PORT, "0.0.0.0");

// ============================================================
// 💾 BASE DE DATOS
// ============================================================

let db = {
  users: {},
  guilds: {}
};

function loadDB() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      db = JSON.parse(raw);

      if (!db.users) db.users = {};
      if (!db.guilds) db.guilds = {};
    }
  } catch (err) {
    console.error("❌ Error cargando data.json:", err);
    db = {
      users: {},
      guilds: {}
    };
  }
}

function saveDB() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(db, null, 2),
      "utf8"
    );
  } catch (err) {
    console.error("❌ Error guardando data.json:", err);
  }
}

loadDB();

// ============================================================
// 👤 USUARIOS
// ============================================================

function defaultUser() {
  return {
    money: 100,
    bank: 0,
    xp: 0,
    level: 1,
    reps: 0,
    warnings: 0,
    bio: "",
    lastDaily: 0,
    lastWork: 0
  };
}

function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = defaultUser();
  }

  const defaults = defaultUser();

  for (const key of Object.keys(defaults)) {
    if (db.users[id][key] === undefined) {
      db.users[id][key] = defaults[key];
    }
  }

  return db.users[id];
}

// ============================================================
// 🏠 SERVIDORES
// ============================================================

function defaultGuild() {
  return {
    logsChannel: null,

    antilink: {
      enabled: false,
      timeout: 2 * 60 * 60 * 1000,
      whitelist: []
    },

    antiraid: {
      enabled: false,
      botWhitelist: []
    },

    antinuke: {
      enabled: false,
      protectChannels: true,
      protectRoles: true,
      whitelistUsers: [],
      whitelistRoles: [],
      action: "kick"
    },

    welcome: {
      enabled: false,
      channel: null
    },

    autorole: {
      enabled: false,
      role: null
    },

    rank: {
      text: "🍥 {user}, eres ninja al nivel **{level}**.\n⭐ XP: **{xp}/{needed}**",
      channel: null,
      levelMessage:
        "🎉 {user} ha subido al nivel **{level}**.",
      enabled: true
    },

    shop: {
      roles: {}
    }
  };
}

function getGuild(guildId) {
  if (!db.guilds[guildId]) {
    db.guilds[guildId] = defaultGuild();
  }

  const defaults = defaultGuild();

  for (const key of Object.keys(defaults)) {
    if (db.guilds[guildId][key] === undefined) {
      db.guilds[guildId][key] = defaults[key];
    }
  }

  const g = db.guilds[guildId];

  if (!g.antilink) g.antilink = defaults.antilink;
  if (!g.antiraid) g.antiraid = defaults.antiraid;
  if (!g.antinuke) g.antinuke = defaults.antinuke;
  if (!g.welcome) g.welcome = defaults.welcome;
  if (!g.autorole) g.autorole = defaults.autorole;
  if (!g.rank) g.rank = defaults.rank;
  if (!g.shop) g.shop = defaults.shop;

  if (!Array.isArray(g.antilink.whitelist)) {
    g.antilink.whitelist = [];
  }

  if (!Array.isArray(g.antiraid.botWhitelist)) {
    g.antiraid.botWhitelist = [];
  }

  if (!Array.isArray(g.antinuke.whitelistUsers)) {
    g.antinuke.whitelistUsers = [];
  }

  if (!Array.isArray(g.antinuke.whitelistRoles)) {
    g.antinuke.whitelistRoles = [];
  }

  if (!g.rank.channel) g.rank.channel = null;
  if (g.rank.enabled === undefined) g.rank.enabled = true;

  return g;
}

// ============================================================
// 🛡️ UTILIDADES
// ============================================================

function isAdmin(member) {
  return (
    member &&
    member.permissions &&
    member.permissions.has(
      PermissionsBitField.Flags.Administrator
    )
  );
}

function isOwner(member) {
  return (
    member &&
    member.guild &&
    member.id === member.guild.ownerId
  );
}

async function replyLong(message, text) {
  if (!text) return;

  const chunks = [];

  for (let i = 0; i < text.length; i += 1900) {
    chunks.push(text.slice(i, i + 1900));
  }

  for (const chunk of chunks) {
    await message.channel.send(chunk);
  }
}

async function safeReply(message, text) {
  try {
    return await message.reply(text);
  } catch {
    return null;
  }
}

function mentionUser(user) {
  return `<@${user.id}>`;
}

function neededXP(level) {
  return 100 + (level - 1) * 50;
}

function replaceRankText(text, user, data) {
  const needed = neededXP(data.level);

  return text
    .replaceAll("{user}", `<@${user.id}>`)
    .replaceAll("{username}", user.username)
    .replaceAll("{level}", String(data.level))
    .replaceAll("{xp}", String(data.xp))
    .replaceAll("{needed}", String(needed));
}

// ============================================================
// ⭐ XP / RANK
// ============================================================

async function addXP(member, amount = 5) {
  if (!member || !member.user) return;

  const user = getUser(member.id);
  const guildData = getGuild(member.guild.id);

  user.xp += amount;

  let leveledUp = false;

  while (user.xp >= neededXP(user.level)) {
    user.xp -= neededXP(user.level);
    user.level++;
    leveledUp = true;
  }

  saveDB();

  if (!leveledUp) return;

  if (
    guildData.rank.enabled &&
    guildData.rank.channel
  ) {
    const channel =
      member.guild.channels.cache.get(
        guildData.rank.channel
      );

    if (channel && channel.isTextBased()) {
      const text = replaceRankText(
        guildData.rank.levelMessage,
        member.user,
        user
      );

      channel.send(text).catch(() => {});
    }
  }
}

// ============================================================
// 📜 LOGS
// ============================================================

async function sendLog(guild, embed) {
  try {
    const guildData = getGuild(guild.id);

    if (!guildData.logsChannel) return;

    const channel =
      guild.channels.cache.get(
        guildData.logsChannel
      );

    if (!channel || !channel.isTextBased()) return;

    await channel.send({
      embeds: [embed]
    });
  } catch (err) {
    console.error("❌ Error enviando log:", err.message);
  }
}

function logEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setTimestamp()
    .setFooter({
      text: "🍥 Naruto Logs"
    });
}

// ============================================================
// 🔗 DETECTOR DE LINKS
// ============================================================

function containsLink(text) {
  const regex =
    /(https?:\/\/|www\.|discord\.gg\/|discord\.com\/invite\/|[a-z0-9-]+\.(com|net|org|gg|io|xyz|me|co|tv|site|online|dev|app|store|shop|pro|live|link|club)(\/|$|\s))/i;

  return regex.test(text);
}

function isWhitelistedLink(text, whitelist) {
  if (!Array.isArray(whitelist)) return false;

  return whitelist.some(domain =>
    text.toLowerCase().includes(domain.toLowerCase())
  );
}

// ============================================================
// 🔐 ANTINUKE
// ============================================================

async function getAuditExecutor(
  guild,
  type,
  targetId
) {
  try {
    const logs = await guild.fetchAuditLogs({
      type,
      limit: 10
    });

    const entry = logs.entries.find(entry => {
      if (targetId && entry.target?.id !== targetId) {
        return false;
      }

      return (
        Date.now() - entry.createdTimestamp < 15000
      );
    });

    return entry?.executor || null;
  } catch {
    return null;
  }
}

async function handleStructureProtection(
  guild,
  type,
  targetId,
  description
) {
  const config = getGuild(guild.id);

  if (!config.antinuke.enabled) return;

  const protectChannels =
    type === AuditLogEvent.ChannelCreate ||
    type === AuditLogEvent.ChannelDelete;

  const protectRoles =
    type === AuditLogEvent.RoleCreate ||
    type === AuditLogEvent.RoleDelete;

  if (
    protectChannels &&
    !config.antinuke.protectChannels
  ) {
    return;
  }

  if (
    protectRoles &&
    !config.antinuke.protectRoles
  ) {
    return;
  }

  const executor = await getAuditExecutor(
    guild,
    type,
    targetId
  );

  if (!executor) return;

  if (executor.id === client.user.id) return;
  if (executor.id === guild.ownerId) return;

  if (
    config.antinuke.whitelistUsers.includes(
      executor.id
    )
  ) {
    return;
  }

  const executorMember =
    guild.members.cache.get(executor.id) ||
    await guild.members.fetch(executor.id).catch(() => null);

  if (!executorMember) return;

  const hasWhitelistedRole =
    executorMember.roles.cache.some(role =>
      config.antinuke.whitelistRoles.includes(role.id)
    );

  if (hasWhitelistedRole) return;

  if (config.antinuke.action === "kick") {
    if (executorMember.kickable) {
      await executorMember.kick(
        "🍥 Naruto Anti-Nuke"
      ).catch(() => {});
    }
  }

  await sendLog(
    guild,
    logEmbed(
      "🚨 Anti-Nuke activado",
      `${description}\n👤 Responsable: ${executor.tag || executor.username}\n🛡️ Acción: **${config.antinuke.action}**`
    )
  );
}

// ============================================================
// 🎫 PARSEAR DURACIONES
// ============================================================

function parseDuration(input) {
  if (!input) return null;

  const match = input
    .toLowerCase()
    .match(/^(\d+)(s|m|h|d)$/);

  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2];

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return amount * multipliers[unit];
}

// ============================================================
// 🛒 SHOP
// ============================================================

async function showShop(message) {
  const guildData = getGuild(message.guild.id);
  const products = Object.entries(
    guildData.shop.roles || {}
  );

  if (!products.length) {
    return safeReply(
      message,
      "🛒 La Shop está vacía actualmente."
    );
  }

  for (const [roleId, price] of products) {
    const role =
      message.guild.roles.cache.get(roleId);

    if (!role) continue;

    const embed = new EmbedBuilder()
      .setTitle("🛒 Shop de Naruto")
      .setDescription(
        `🎭 **${role.name}**\n💰 Precio: **$${price}**`
      )
      .setFooter({
        text: "Pulsa 🛒 Comprar para adquirir el rol."
      });

    const button = new ButtonBuilder()
      .setCustomId(`buyrole_${role.id}`)
      .setLabel("Comprar")
      .setEmoji("🛒")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder()
      .addComponents(button);

    await message.channel.send({
      embeds: [embed],
      components: [row]
    });
  }
}

// ============================================================
// 📚 CATEGORÍAS
// ============================================================

const categories = {

  economy: {
    name: "💰 Economía",
    commands: [
      "balance",
      "daily",
      "work",
      "pay",
      "deposit",
      "withdraw",
      "bank",
      "richest",
      "money",
      "cash",
      "wallet",
      "coins",
      "salary",
      "job",
      "mymoney",
      "wealth",
      "economy",
      "depositall",
      "withdrawall",
      "transfer",
      "give",
      "funds",
      "capital",
      "earnings",
      "salarycheck",
      "cashinfo",
      "balanceinfo",
      "paycheck",
      "income",
      "fortune"
    ]
  },

  moderation: {
    name: "🛡️ Moderación",
    commands: [
      "ban",
      "unban",
      "kick",
      "softban",
      "timeout",
      "untimeout",
      "mute",
      "unmute",
      "warn",
      "warnings",
      "clear",
      "purge",
      "lock",
      "unlock",
      "slowmode",
      "nick",
      "resetnick",
      "voicekick",
      "deafen",
      "undeafen",
      "modlog",
      "reason",
      "massban",
      "tempban",
      "tempkick",
      "modstats",
      "jail",
      "unjail",
      "warnclear",
      "unwarn"
    ]
  },

  shop: {
    name: "🛒 Shop",
    commands: [
      "shop",
      "tienda",
      "nshop",
      "store",
      "market",
      "marketplace",
      "productos",
      "catalogo",
      "precios",
      "shoplist",
      "shopinfo",
      "items",
      "item",
      "comprar",
      "buy",
      "purchase",
      "myroles",
      "owned",
      "inventory",
      "inv",
      "shoproles",
      "rolestienda",
      "shopadd",
      "shopremove",
      "shopprice",
      "shopclear",
      "shopreset",
      "productlist",
      "shopmenu",
      "shopping"
    ]
  },

  rank: {
    name: "🏆 Rank",
    commands: [
      "rank",
      "level",
      "xp",
      "leaderboard",
      "top",
      "rankcard",
      "rewards",
      "levels",
      "mylevel",
      "myxp",
      "xptop",
      "leveltop",
      "progress",
      "nextlevel",
      "globalrank",
      "guildrank",
      "xpinfo",
      "ranking",
      "stats",
      "progressbar",
      "levelinfo",
      "xpneeded",
      "rankinfo",
      "xprank",
      "levelrank",
      "ranktop",
      "nlevel",
      "nprogress",
      "ninjarank",
      "ranktitle"
    ]
  },

  social: {
    name: "👤 Social",
    commands: [
      "profile",
      "avatar",
      "banner",
      "bio",
      "setbio",
      "rep",
      "reps",
      "userinfo",
      "aboutme",
      "member",
      "joined",
      "created",
      "rolesme",
      "mention",
      "id",
      "account",
      "social",
      "whois",
      "user",
      "me",
      "userprofile",
      "profileinfo",
      "reputation",
      "repcount",
      "mybio",
      "setdescription",
      "memberinfo",
      "accountinfo",
      "userstats",
      "identity"
    ]
  },

  fun: {
    name: "🎮 Diversión",
    commands: [
      "8ball",
      "dice",
      "rps",
      "joke",
      "choose",
      "reverse",
      "say",
      "random",
      "coinflip",
      "roll",
      "number",
      "truth",
      "dare",
      "rate",
      "roast",
      "compliment",
      "meme",
      "cat",
      "ninja",
      "luck",
      "magic8",
      "flip",
      "funfact",
      "magic",
      "numberguess",
      "clap",
      "yesno",
      "hi",
      "ramen",
      "jutsu"
    ]
  },

  server: {
    name: "🏠 Servidor",
    commands: [
      "serverinfo",
      "servericon",
      "roleinfo",
      "channelinfo",
      "rolelist",
      "membercount",
      "members",
      "channels",
      "roles",
      "emojis",
      "stickers",
      "boosts",
      "owner",
      "createdserver",
      "serverid",
      "invite",
      "ping",
      "stats",
      "serverstats",
      "guildinfo",
      "guildid",
      "icon",
      "rolescount",
      "channelcount",
      "emojicount",
      "boostinfo",
      "serverowner",
      "datecreated",
      "info",
      "guild"
    ]
  },

  security: {
    name: "🔐 Seguridad",
    commands: [
      "antilink",
      "antiraid",
      "antinuke",
      "whitelist",
      "botwhitelist",
      "antiwhitelist",
      "antichannel",
      "antirole",
      "protection",
      "security",
      "setlogs",
      "disablelogs",
      "testlogs",
      "logchannel",
      "logs",
      "audit",
      "auditlog",
      "raidstatus",
      "linkstatus",
      "nukestatus",
      "whitelistusers",
      "whitelistroles",
      "whitelistbots",
      "addwhitelist",
      "removewhitelist",
      "addbot",
      "removebot",
      "securityinfo",
      "protectionstatus",
      "antihelp"
    ]
  },

  config: {
    name: "⚙️ Configuración",
    commands: [
      "settings",
      "config",
      "setup",
      "welcome",
      "autorole",
      "setranktext",
      "ranktitle",
      "setprefix",
      "welcomechannel",
      "autoroleset",
      "ranktext",
      "shopadd",
      "shopremove",
      "shopprice",
      "shopclear",
      "shopreset",
      "setlogs",
      "disablelogs",
      "testlogs",
      "helpadmin",
      "help",
      "reload",
      "database",
      "backup",
      "botstatus",
      "activity",
      "language",
      "modules",
      "serverconfig"
    ]
  },

  roles: {
    name: "🎭 Roles",
    commands: [
      "roleinfo",
      "rolelist",
      "roles",
      "addrole",
      "removerole",
      "giverole",
      "takerole",
      "roleadd",
      "roleremove",
      "rolecreate",
      "roledelete",
      "rolecolor",
      "rolehoist",
      "rolemention",
      "roleshop",
      "autorole",
      "autoroleset",
      "rolecount",
      "memberroles",
      "rolesme",
      "myroles",
      "rolemembers",
      "rolepos",
      "move",
      "roleedit",
      "roleperm",
      "rolecheck",
      "rolewhitelist",
      "roleprotect",
      "rolehelp"
    ]
  }
};

// ============================================================
// 📚 DESCRIPCIONES DEL HELP
// ============================================================

function commandDescription(command) {
  const descriptions = {

    balance: "💰 Ver tu dinero.",
    daily: "🎁 Reclamar recompensa diaria.",
    work: "💼 Trabajar para ganar dinero.",
    pay: "💸 Enviar dinero a otro usuario.",
    deposit: "🏦 Depositar dinero.",
    withdraw: "🏧 Retirar dinero.",
    bank: "🏦 Ver tu banco.",
    richest: "👑 Ver los usuarios con más dinero.",

    ban: "🔨 Banear a un usuario.",
    unban: "🔓 Desbanear por ID.",
    kick: "👢 Expulsar a un usuario.",
    timeout: "⏱️ Aplicar timeout.",
    untimeout: "🔓 Quitar timeout.",
    warn: "⚠️ Dar una advertencia.",
    clear: "🧹 Borrar mensajes.",
    purge: "🧹 Limpiar mensajes.",
    lock: "🔒 Bloquear canal.",
    unlock: "🔓 Desbloquear canal.",

    shop: "🛒 Abrir la tienda.",
    shopadd: "➕ Añadir un rol a la Shop.",
    shopremove: "➖ Quitar un rol de la Shop.",
    shopprice: "💰 Cambiar precio de un rol.",
    shopclear: "🗑️ Vaciar la Shop.",
    shopreset: "♻️ Reiniciar la Shop.",

    rank: "🏆 Ver tu rango.",
    level: "⭐ Ver tu nivel.",
    xp: "✨ Ver tu XP.",
    leaderboard: "🏆 Ver el ranking.",
    setranktext: "📝 Cambiar el mensaje del Rank.",

    profile: "👤 Ver un perfil.",
    avatar: "🖼️ Ver avatar.",
    bio: "📖 Ver biografía.",
    setbio: "✏️ Cambiar biografía.",
    rep: "❤️ Dar reputación.",

    antilink: "🔗 Configurar AntiLink.",
    antiraid: "🚨 Configurar AntiRaid.",
    antinuke: "☢️ Configurar AntiNuke.",
    whitelist: "✅ Administrar whitelist.",
    setlogs: "📜 Configurar canal de logs.",

    serverinfo: "🏠 Ver información del servidor.",
    roleinfo: "🎭 Ver información de un rol.",
    channelinfo: "📁 Ver información del canal.",
    membercount: "👥 Ver cantidad de miembros.",

    help: "📚 Abrir ayuda.",
    helpadmin: "⚙️ Abrir ayuda de administración."
  };

  return (
    descriptions[command] ||
    `⚙️ Ejecutar ${PREFIX}${command}.`
  );
}

// ============================================================
// 📚 CREAR MENU DE AYUDA
// ============================================================

function createHelpMenu(userId, admin = false) {
  const options = Object.entries(categories).map(
    ([key, category]) => ({
      label: category.name,
      value: key,
      description: `${category.commands.length} comandos`,
      emoji: category.name.split(" ")[0]
    })
  );

  const menu = new StringSelectMenuBuilder()
    .setCustomId(
      `${admin ? "helpadmin" : "help"}_${userId}`
    )
    .setPlaceholder("📚 Selecciona una categoría")
    .addOptions(options);

  const row = new ActionRowBuilder()
    .addComponents(menu);

  return row;
}

function helpCategoryEmbed(categoryKey) {
  const category = categories[categoryKey];

  if (!category) return null;

  const text = category.commands
    .map(
      (command, index) =>
        `**${index + 1}.** \`${PREFIX}${command}\` — ${commandDescription(command)}`
    )
    .join("\n");

  return new EmbedBuilder()
    .setTitle(`${category.name} — Naruto`)
    .setDescription(text)
    .setFooter({
      text: `🍥 ${category.commands.length} comandos en esta categoría`
    });
}

// ============================================================
// 📚 HELP
// ============================================================

async function showHelp(message) {
  const embed = new EmbedBuilder()
    .setTitle("🍥 Naruto — Centro de Ayuda")
    .setDescription(
      "Selecciona una categoría para ver sus comandos.\n\n" +
      "⚙️ Los comandos administrativos requieren permisos de Administrador."
    )
    .setFooter({
      text: "Naruto Bot"
    });

  const components = [
    createHelpMenu(message.author.id, false)
  ];

  if (isAdmin(message.member)) {
    const adminButton = new ButtonBuilder()
      .setCustomId(
        `openadminhelp_${message.author.id}`
      )
      .setLabel("Panel de Administración")
      .setEmoji("⚙️")
      .setStyle(ButtonStyle.Danger);

    components.push(
      new ActionRowBuilder().addComponents(adminButton)
    );
  }

  return message.channel.send({
    embeds: [embed],
    components
  });
}

async function showAdminHelp(message) {
  if (!isAdmin(message.member)) {
    return safeReply(
      message,
      "❌ Necesitas permisos de Administrador."
    );
  }

  const embed = new EmbedBuilder()
    .setTitle("⚙️ Naruto — Administración")
    .setDescription(
      "Panel de comandos administrativos.\n\n" +
      "Selecciona una categoría."
    );

  return message.channel.send({
    embeds: [embed],
    components: [
      createHelpMenu(message.author.id, true)
    ]
  });
}

// ============================================================
// 💰 ECONOMÍA
// ============================================================

async function economyCommand(message, command, args) {
  const user = getUser(message.author.id);

  const balanceAliases = [
    "balance",
    "money",
    "cash",
    "wallet",
    "coins",
    "mymoney",
    "wealth",
    "economy",
    "funds",
    "capital",
    "earnings",
    "salarycheck",
    "cashinfo",
    "balanceinfo",
    "income"
  ];

  if (balanceAliases.includes(command)) {
    return safeReply(
      message,
      `💰 **${message.author.username}**\n\n` +
      `💵 Dinero: **$${user.money}**\n` +
      `🏦 Banco: **$${user.bank}**\n` +
      `💎 Total: **$${user.money + user.bank}**`
    );
  }

  if (command === "daily") {
    const cooldown = 24 * 60 * 60 * 1000;

    if (
      Date.now() - user.lastDaily <
      cooldown
    ) {
      const remaining =
        cooldown -
        (Date.now() - user.lastDaily);

      const hours = Math.ceil(
        remaining / (60 * 60 * 1000)
      );

      return safeReply(
        message,
        `⏳ Ya reclamaste tu Daily. Vuelve en aproximadamente **${hours}h**.`
      );
    }

    const amount =
      Math.floor(Math.random() * 201) + 100;

    user.money += amount;
    user.lastDaily = Date.now();

    saveDB();

    await sendLog(
      message.guild,
      logEmbed(
        "💰 Daily reclamado",
        `${message.author} recibió **$${amount}**.`
      )
    );

    return safeReply(
      message,
      `🎁 Recibiste **$${amount}** de tu recompensa diaria.`
    );
  }

  if (
    ["work", "job", "salary", "paycheck"].includes(
      command
    )
  ) {
    const cooldown = 60 * 60 * 1000;

    if (
      Date.now() - user.lastWork <
      cooldown
    ) {
      return safeReply(
        message,
        "⏳ Debes esperar antes de volver a trabajar."
      );
    }

    const amount =
      Math.floor(Math.random() * 151) + 50;

    user.money += amount;
    user.lastWork = Date.now();

    saveDB();

    return safeReply(
      message,
      `💼 Trabajaste y ganaste **$${amount}**.`
    );
  }

  if (
    ["pay", "transfer", "give"].includes(command)
  ) {
    const target =
      message.mentions.users.first();

    const amount = Number(args[1]);

    if (!target || !Number.isFinite(amount)) {
      return safeReply(
        message,
        `❌ Uso: \`${PREFIX}pay @usuario cantidad\``
      );
    }

    if (target.id === message.author.id) {
      return safeReply(
        message,
        "❌ No puedes enviarte dinero a ti mismo."
      );
    }

    if (amount <= 0) {
      return safeReply(
        message,
        "❌ La cantidad debe ser mayor que 0."
      );
    }

    if (user.money < amount) {
      return safeReply(
        message,
        "❌ No tienes suficiente dinero."
      );
    }

    const receiver = getUser(target.id);

    user.money -= amount;
    receiver.money += amount;

    saveDB();

    return safeReply(
      message,
      `💸 Enviaste **$${amount}** a ${target}.`
    );
  }

  if (
    ["deposit", "depositall"].includes(command)
  ) {
    let amount;

    if (
      command === "depositall" ||
      args[0]?.toLowerCase() === "all"
    ) {
      amount = user.money;
    } else {
      amount = Number(args[0]);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return safeReply(
        message,
        `❌ Uso: \`${PREFIX}deposit cantidad\``
      );
    }

    if (user.money < amount) {
      return safeReply(
        message,
        "❌ No tienes suficiente dinero."
      );
    }

    user.money -= amount;
    user.bank += amount;

    saveDB();

    return safeReply(
      message,
      `🏦 Depositaste **$${amount}**.`
    );
  }

  if (
    ["withdraw", "withdrawall"].includes(command)
  ) {
    let amount;

    if (
      command === "withdrawall" ||
      args[0]?.toLowerCase() === "all"
    ) {
      amount = user.bank;
    } else {
      amount = Number(args[0]);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return safeReply(
        message,
        `❌ Uso: \`${PREFIX}withdraw cantidad\``
      );
    }

    if (user.bank < amount) {
      return safeReply(
        message,
        "❌ No tienes suficiente dinero en el banco."
      );
    }

    user.bank -= amount;
    user.money += amount;

    saveDB();

    return safeReply(
      message,
      `🏧 Retiraste **$${amount}**.`
    );
  }

  if (command === "bank") {
    return safeReply(
      message,
      `🏦 Tienes **$${user.bank}** en el banco.`
    );
  }

  if (command === "richest") {
    const list = Object.entries(db.users)
      .sort(
        (a, b) =>
          (b[1].money + b[1].bank) -
          (a[1].money + a[1].bank)
      )
      .slice(0, 10);

    if (!list.length) {
      return safeReply(
        message,
        "📊 Todavía no hay datos."
      );
    }

    let text =
      "👑 **Top 10 más ricos**\n\n";

    list.forEach(([id, data], index) => {
      text +=
        `**${index + 1}.** <@${id}> — **$${data.money + data.bank}**\n`;
    });

    return replyLong(message, text);
  }

  if (command === "fortune") {
    const fortunes = [
      "🍀 Hoy la suerte está de tu lado.",
      "🥷 Un gran camino ninja te espera.",
      "💰 Quizás encuentres una recompensa pronto.",
      "⭐ Sigue ganando XP y podrás subir de nivel.",
      "🍥 Naruto cree en ti."
    ];

    return safeReply(
      message,
      fortunes[
        Math.floor(
          Math.random() * fortunes.length
        )
      ]
    );
  }
}

// ============================================================
// 🛡️ MODERACIÓN
// ============================================================

async function moderationCommand(
  message,
  command,
  args
) {
  if (!isAdmin(message.member)) {
    return safeReply(
      message,
      "❌ Necesitas permisos de Administrador."
    );
  }

  const target =
    message.mentions.members.first();

  if (
    ["ban", "kick", "softban", "timeout",
      "mute", "warn", "jail", "tempban",
      "tempkick", "voicekick", "deafen",
      "undeafen"].includes(command) &&
    !target
  ) {
    return safeReply(
      message,
      "❌ Debes mencionar a un usuario."
    );
  }

  if (
    ["ban", "softban", "kick", "tempban",
      "tempkick"].includes(command)
  ) {
    if (!target.bannable && command !== "kick" && command !== "tempkick") {
      return safeReply(
        message,
        "❌ No puedo moderar a ese usuario por la jerarquía de roles."
      );
    }

    if (
      !target.kickable &&
      ["kick", "tempkick"].includes(command)
    ) {
      return safeReply(
        message,
        "❌ No puedo expulsar a ese usuario."
      );
    }
  }

  if (command === "ban") {
    await target.ban({
      reason:
        args.slice(1).join(" ") ||
        `Ban ejecutado por ${message.author.tag}`
    }).catch(() => null);

    await sendLog(
      message.guild,
      logEmbed(
        "🔨 Usuario baneado",
        `${target.user} fue baneado por ${message.author}.`
      )
    );

    return safeReply(
      message,
      `🔨 ${target.user.tag} fue baneado.`
    );
  }

  if (command === "unban") {
    const id = args[0];

    if (!id) {
      return safeReply(
        message,
        `❌ Uso: \`${PREFIX}unban ID\``
      );
    }

    await message.guild.members
      .unban(id)
      .catch(() => null);

    return safeReply(
      message,
      `🔓 Intenté desbanear a **${id}**.`
    );
  }

  if (
    ["kick", "tempkick"].includes(command)
  ) {
    await target.kick(
      args.slice(1).join(" ") ||
      `Kick ejecutado por ${message.author.tag}`
    ).catch(() => null);

    await sendLog(
      message.guild,
      logEmbed(
        "👢 Usuario expulsado",
        `${target.user} fue expulsado por ${message.author}.`
      )
    );

    return safeReply(
      message,
      `👢 ${target.user.tag} fue expulsado.`
    );
  }

  if (command === "softban") {
    await target.ban({
      reason: `Softban por ${message.author.tag}`,
      deleteMessageSeconds: 24 * 60 * 60
    }).catch(() => null);

    await message.guild.members
      .unban(target.id)
      .catch(() => null);

    return safeReply(
      message,
      `🔄 Softban realizado a ${target.user.tag}.`
    );
  }

  if (
    ["timeout", "mute", "jail"].includes(command)
  ) {
    const duration =
      parseDuration(args[1]) ||
      10 * 60 * 1000;

    await target.timeout(
      duration,
      args.slice(2).join(" ") ||
      `Timeout por ${message.author.tag}`
    ).catch(() => null);

    await sendLog(
      message.guild,
      logEmbed(
        "⏱️ Timeout",
        `${target.user} recibió timeout por ${message.author}.`
      )
    );

    return safeReply(
      message,
      `⏱️ ${target.user.tag} recibió timeout.`
    );
  }

  if (
    ["untimeout", "unmute", "unjail"].includes(command)
  ) {
    await target.timeout(null).catch(() => null);

    return safeReply(
      message,
      `🔓 Timeout retirado a ${target.user.tag}.`
    );
  }

  if (command === "warn") {
    const user = getUser(target.id);
    user.warnings++;

    saveDB();

    await sendLog(
      message.guild,
      logEmbed(
        "⚠️ Warn",
        `${target.user} recibió una advertencia de ${message.author}.\nTotal: **${user.warnings}**`
      )
    );

    return safeReply(
      message,
      `⚠️ ${target.user.tag} recibió un warn. Total: **${user.warnings}**`
    );
  }

  if (
    ["warnings", "warnclear", "unwarn"].includes(command)
  ) {
    const member =
      target ||
      message.member;

    const user = getUser(member.id);

    if (command === "warnings") {
      return safeReply(
        message,
        `⚠️ ${member.user.tag} tiene **${user.warnings}** warnings.`
      );
    }

    user.warnings = 0;
    saveDB();

    return safeReply(
      message,
      `✅ Warnings de ${member.user.tag} limpiados.`
    );
  }

  if (
    ["clear", "purge"].includes(command)
  ) {
    const amount =
      Math.min(
        Math.max(
          Number(args[0]) || 10,
          1
        ),
        100
      );

    const deleted =
      await message.channel.bulkDelete(
        amount,
        true
      ).catch(() => null);

    return safeReply(
      message,
      `🧹 Se eliminaron **${deleted?.size || 0}** mensajes.`
    );
  }

  if (command === "lock") {
    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      {
        SendMessages: false
      }
    );

    return safeReply(
      message,
      "🔒 Canal bloqueado."
    );
  }

  if (command === "unlock") {
    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      {
        SendMessages: null
      }
    );

    return safeReply(
      message,
      "🔓 Canal desbloqueado."
    );
  }

  if (command === "slowmode") {
    const seconds =
      Math.max(
        0,
        Math.min(
          Number(args[0]) || 0,
          21600
        )
      );

    await message.channel.setRateLimitPerUser(
      seconds
    );

    return safeReply(
      message,
      `🐌 Slowmode establecido en **${seconds}s**.`
    );
  }

  if (command === "nick") {
    if (!target) {
      return safeReply(
        message,
        `❌ Uso: \`${PREFIX}nick @usuario nuevo nombre\``
      );
    }

    const nickname =
      args.slice(1).join(" ");

    await target.setNickname(
      nickname || null
    ).catch(() => null);

    return safeReply(
      message,
      "✏️ Nickname actualizado."
    );
  }

  if (command === "resetnick") {
    const member =
      target || message.member;

    await member.setNickname(null)
      .catch(() => null);

    return safeReply(
      message,
      "🔄 Nickname reiniciado."
    );
  }

  if (command === "voicekick") {
    if (!target.voice.channel) {
      return safeReply(
        message,
        "❌ Ese usuario no está en un canal de voz."
      );
    }

    await target.voice.disconnect()
      .catch(() => null);

    return safeReply(
      message,
      `🔊 ${target.user.tag} fue desconectado del canal de voz.`
    );
  }

  if (command === "deafen") {
    await target.voice.setDeaf(true)
      .catch(() => null);

    return safeReply(
      message,
      `🔇 ${target.user.tag} fue ensordecido.`
    );
  }

  if (command === "undeafen") {
    await target.voice.setDeaf(false)
      .catch(() => null);

    return safeReply(
      message,
      `🔊 Se quitó el deaf a ${target.user.tag}.`
    );
  }

  if (
    ["modlog", "reason", "modstats"].includes(command)
  ) {
    const guildData =
      getGuild(message.guild.id);

    return safeReply(
      message,
      `🛡️ **Moderación**\n\n` +
      `📜 Canal de logs: ${
        guildData.logsChannel
          ? `<#${guildData.logsChannel}>`
          : "No configurado"
      }\n⚠️ Warns guardados: activos\n🔨 Moderación: activa`
    );
  }

  if (command === "massban") {
    const users =
      message.mentions.users;

    if (!users.size) {
      return safeReply(
        message,
        `❌ Uso: \`${PREFIX}massban @usuario1 @usuario2\``
      );
    }

    let count = 0;

    for (const user of users.values()) {
      await message.guild.members
        .ban(user.id, {
          reason: `Massban por ${message.author.tag}`
        })
        .then(() => count++)
        .catch(() => {});
    }

    return safeReply(
      message,
      `🔨 Massban completado: **${count}** usuarios.`
    );
  }

  if (command === "tempban") {
    const duration =
      parseDuration(args[1]);

    if (!duration) {
      return safeReply(
        message,
        `❌ Uso: \`${PREFIX}tempban @usuario 10m\``
      );
    }

    await target.ban({
      reason: `Tempban por ${message.author.tag}`
    }).catch(() => null);

    setTimeout(() => {
      message.guild.members
        .unban(target.id)
        .catch(() => {});
    }, duration);

    return safeReply(
      message,
      `⏱️ ${target.user.tag} fue baneado temporalmente.`
    );
  }
}

// ============================================================
// 🛒 SHOP COMMANDS
// ============================================================

async function shopCommand(
  message,
  command,
  args
) {
  const shopAliases = [
    "shop",
    "tienda",
    "nshop",
    "store",
    "market",
    "marketplace",
    "productos",
    "catalogo",
    "precios",
    "shoplist",
    "shopinfo",
    "items",
    "item",
    "productlist",
    "shopmenu",
    "shopping"
  ];

  if (shopAliases.includes(command)) {
    return showShop(message);
  }

  if (
    ["comprar", "buy", "purchase"].includes(command)
  ) {
    const role =
      message.mentions.roles.first();

    if (!role) {
      return safeReply(
        message,
        `❌ Uso: \`${PREFIX}buy @rol\``
      );
    }

    const guildData =
      getGuild(message.guild.id);

    const price =
      guildData.shop.roles[role.id];

    if (price === undefined) {
      return safeReply(
        message,
        "❌ Ese rol no está en la Shop."
      );
    }

    const user =
      getUser(message.author.id);

    if (user.money < price) {
      return safeReply(
        message,
        `❌ Necesitas **$${price}**. Tienes **$${user.money}**.`
      );
    }

    if (
      message.member.roles.cache.has(
        role.id
      )
    ) {
      return safeReply(
        message,
        "❌ Ya tienes ese rol."
      );
    }

    if (!role.editable) {
      return safeReply(
        message,
        "❌ Naruto no puede entregar ese rol. Pon el rol de Naruto por encima."
      );
    }

    user.money -= price;

    await message.member.roles
      .add(role)
      .catch(() => null);

    saveDB();

    await sendLog(
      message.guild,
      logEmbed(
        "🛒 Compra realizada",
        `${message.author} compró ${role} por **$${price}**.`
      )
    );

    return safeReply(
      message,
      `🛒 Compraste ${role} por **$${price}**.`
    );
  }

  if (
    ["myroles", "owned", "inventory", "inv"].includes(
      command
    )
  ) {
    const roles =
      message.member.roles.cache
        .filter(role => role.id !== message.guild.id)
        .map(role => role.name);

    return replyLong(
      message,
      `🎭 **Tus roles**\n\n${
        roles.length
          ? roles.map(r => `• ${r}`).join("\n")
          : "No tienes roles."
      }`
    );
  }

  if (
    [
      "shopadd",
      "shopremove",
      "shopprice",
      "shopclear",
      "shopreset"
    ].includes(command)
  ) {
    if (!isAdmin(message.member)) {
      return safeReply(
        message,
        "❌ Necesitas permisos de Administrador."
      );
    }

    const guildData =
      getGuild(message.guild.id);

    if (command === "shopadd") {
      const role =
        message.mentions.roles.first();

      const price =
        Number(args[1]);

      if (!role || !Number.isFinite(price)) {
        return safeReply(
          message,
          `❌ Uso: \`${PREFIX}shopadd @rol precio\``
        );
      }

      guildData.shop.roles[role.id] =
        price;

      saveDB();

      return safeReply(
        message,
        `🛒 ${role} añadido a la Shop por **$${price}**.`
      );
    }

    if (command === "shopremove") {
      const role =
        message.mentions.roles.first();

      if (!role) {
        return safeReply(
          message,
          `❌ Uso: \`${PREFIX}shopremove @rol\``
        );
      }

      delete guildData.shop.roles[
        role.id
      ];

      saveDB();

      return safeReply(
        message,
        `🗑️ ${role} eliminado de la Shop.`
      );
    }

    if (command === "shopprice") {
      const role =
        message.mentions.roles.first();

      const price =
        Number(args[1]);

      if (!role || !Number.isFinite(price)) {
        return safeReply(
          message,
          `❌ Uso: \`${PREFIX}shopprice @rol precio\``
        );
      }

      guildData.shop.roles[role.id] =
        price;

      saveDB();

      return safeReply(
        message,
        `💰 Precio de ${role}: **$${price}**.`
      );
    }

    if (
      command === "shopclear" ||
      command === "shopreset"
    ) {
      guildData.shop.roles = {};

      saveDB();

      return safeReply(
        message,
        "♻️ Shop reiniciada y vaciada."
      );
    }
  }
}

// ============================================================
// 🏆 RANK
// ============================================================

async function rankCommand(
  message,
  command,
  args
) {
  const user =
    getUser(message.author.id);

  if (
    [
      "rank",
      "level",
      "xp",
      "rankcard",
      "levels",
      "mylevel",
      "myxp",
      "progress",
      "nextlevel",
      "xpinfo",
      "progressbar",
      "levelinfo",
      "xpneeded",
      "rankinfo",
      "xprank",
      "levelrank",
      "nlevel",
      "nprogress",
      "ninjarank"
    ].includes(command)
  ) {
    const needed =
      neededXP(user.level);

    const percentage =
      Math.floor(
        (user.xp / needed) * 100
      );

    const bars =
      Math.floor(percentage / 10);

    const progress =
      "🟩".repeat(bars) +
      "⬜".repeat(10 - bars);

    const guildData =
      getGuild(message.guild.id);

    const text =
      replaceRankText(
        guildData.rank.text,
        message.author,
        user
      );

    return safeReply(
      message,
      `${text}\n\n` +
      `🏆 Nivel: **${user.level}**\n` +
      `⭐ XP: **${user.xp}/${needed}**\n` +
      `${progress} **${percentage}%**`
    );
  }

  if (
    [
      "leaderboard",
      "top",
      "xptop",
      "leveltop",
      "globalrank",
      "guildrank",
      "ranking",
      "ranktop"
    ].includes(command)
  ) {
    const list =
      Object.entries(db.users)
        .sort(
          (a, b) =>
            b[1].level - a[1].level ||
            b[1].xp - a[1].xp
        )
        .slice(0, 10);

    let text =
      "🏆 **Ranking de Naruto**\n\n";

    list.forEach(([id, data], index) => {
      text +=
        `**${index + 1}.** <@${id}> — Nivel **${data.level}** | XP **${data.xp}**\n`;
    });

    return replyLong(message, text);
  }

  if (
    ["rewards"].includes(command)
  ) {
    return safeReply(
      message,
      "🎁 Los niveles pueden utilizarse para recompensas y roles."
    );
  }

  if (
    ["stats"].includes(command)
  ) {
    return safeReply(
      message,
      `🏆 Nivel: **${user.level}**\n⭐ XP: **${user.xp}/${neededXP(user.level)}**`
    );
  }

  if (
    ["ranktitle", "setranktext"].includes(command)
  ) {
    if (!isAdmin(message.member)) {
      return safeReply(
        message,
        "❌ Necesitas permisos de Administrador."
      );
    }

    const guildData =
      getGuild(message.guild.id);

    if (args[0]?.toLowerCase() === "reset") {
      guildData.rank.text =
        "🍥 {user}, eres ninja al nivel **{level}**.\n⭐ XP: **{xp}/{needed}**";

      saveDB();

      return safeReply(
        message,
        "🔄 Texto del Rank reiniciado."
      );
    }

    const text =
      args.join(" ");

    if (!text) {
      return safeReply(
        message,
        `❌ Uso: \`${PREFIX}setranktext texto\``
      );
    }

    guildData.rank.text = text;

    saveDB();

    return safeReply(
      message,
      "✅ Texto del Rank actualizado."
    );
  }
}

// ============================================================
// 👤 SOCIAL
// ============================================================

async function socialCommand(
  message,
  command,
  args
) {
  const target =
    message.mentions.members.first() ||
    message.member;

  const user =
    getUser(target.id);

  if (
    [
      "profile",
      "aboutme",
      "member",
      "userprofile",
      "profileinfo",
      "account",
      "accountinfo",
      "social",
      "user",
      "me",
      "memberinfo",
      "userstats",
      "identity"
    ].includes(command)
  ) {
    return safeReply(
      message,
      `👤 **Perfil de ${target.user.username}**\n\n` +
      `⭐ Nivel: **${user.level}**\n` +
      `✨ XP: **${user.xp}**\n` +
      `❤️ Reputación: **${user.reps}**\n` +
      `⚠️ Warnings: **${user.warnings}**\n` +
      `📖 Bio: ${user.bio || "Sin biografía"}`
    );
  }

  if (command === "avatar") {
    return safeReply(
      message,
      target.user.displayAvatarURL({
        size: 1024,
        extension: "png"
      })
    );
  }

  if (command === "banner") {
    const fetched =
      await client.users.fetch(
        target.id,
        { force: true }
      );

    const banner =
      fetched.bannerURL({
        size: 1024,
        extension: "png"
      });

    return safeReply(
      message,
      banner ||
      "❌ Este usuario no tiene banner."
    );
  }

  if (
    ["bio", "mybio"].includes(command)
  ) {
    return safeReply(
      message,
      `📖 **Bio de ${target.user.username}:**\n${user.bio || "Sin biografía."}`
    );
  }

  if (
    ["setbio", "setdescription"].includes(command)
  ) {
    const me =
      getUser(message.author.id);

    me.bio =
      args.join(" ").slice(0, 500);

    saveDB();

    return safeReply(
      message,
      "📖 Biografía actualizada."
    );
  }

  if (
    ["rep", "reps", "reputation", "repcount"].includes(
      command
    )
  ) {
    if (command === "rep") {
      const mentioned =
        message.mentions.users.first();

      if (!mentioned) {
        return safeReply(
          message,
          `❌ Uso: \`${PREFIX}rep @usuario\``
        );
      }

      if (mentioned.id === message.author.id) {
        return safeReply(
          message,
          "❌ No puedes darte reputación a ti mismo."
        );
      }

      const targetUser =
        getUser(mentioned.id);

      targetUser.reps++;

      saveDB();

      return safeReply(
        message,
        `❤️ ${mentioned} ahora tiene **${targetUser.reps}** reputaciones.`
      );
    }

    return safeReply(
      message,
      `❤️ ${target.user.username} tiene **${user.reps}** reputaciones.`
    );
  }

  if (command === "rolesme") {
    const roles =
      target.roles.cache
        .filter(r => r.id !== message.guild.id)
        .map(r => r.toString());

    return replyLong(
      message,
      roles.length
        ? roles.join(" ")
        : "🎭 Sin roles."
    );
  }

  if (command === "id") {
    return safeReply(
      message,
      `🆔 ID: \`${target.id}\``
    );
  }

  if (command === "mention") {
    return safeReply(
      message,
      `<@${target.id}>`
    );
  }

  if (command === "joined") {
    return safeReply(
      message,
      `📅 Entró al servidor: <t:${Math.floor(target.joinedTimestamp / 1000)}:F>`
    );
  }

  if (command === "created") {
    return safeReply(
      message,
      `📅 Cuenta creada: <t:${Math.floor(target.user.createdTimestamp / 1000)}:F>`
    );
  }

  if (command === "whois") {
    return safeReply(
      message,
      `👤 ${target.user.tag}\n🆔 ${target.id}`
    );
  }
}

// ============================================================
// 🎮 DIVERSIÓN
// ============================================================

async function funCommand(
  message,
  command,
  args
) {
  if (
    ["8ball", "magic8", "magic"].includes(command)
  ) {
    const answers = [
      "🥷 Sí.",
      "🍥 Definitivamente.",
      "⭐ Probablemente.",
      "🤔 No estoy seguro.",
      "❌ No.",
      "🔥 Parece que sí.",
      "🌙 Mejor pregunta después."
    ];

    return safeReply(
      message,
      answers[
        Math.floor(
          Math.random() * answers.length
        )
      ]
    );
  }

  if (
    ["dice", "roll"].includes(command)
  ) {
    const number =
      Math.floor(
        Math.random() * 6
      ) + 1;

    return safeReply(
      message,
      `🎲 Sacaste **${number}**.`
    );
  }

  if (command === "coinflip" || command === "flip") {
    return safeReply(
      message,
      Math.random() < 0.5
        ? "🪙 Cara"
        : "🪙 Cruz"
    );
  }

  if (command === "rps") {
    const choices = [
      "🪨 Piedra",
      "📄 Papel",
      "✂️ Tijera"
    ];

    return safeReply(
      message,
      `🤖 Naruto eligió: **${
        choices[
          Math.floor(
            Math.random() *
            choices.length
          )
        ]
      }**`
    );
  }

  if (command === "choose") {
    const options =
      args.join(" ")
        .split("|")
        .map(x => x.trim())
        .filter(Boolean);

    if (options.length < 2) {
      return safeReply(
        message,
        `❌ Uso: \`${PREFIX}choose pizza | hamburguesa\``
      );
    }

    return safeReply(
      message,
      `🎯 Elijo: **${
        options[
          Math.floor(
            Math.random() *
            options.length
          )
        ]
      }**`
    );
  }

  if (command === "reverse") {
    return safeReply(
      message,
      args.join(" ").split("").reverse().join("")
    );
  }

  if (command === "say") {
    if (!args.length) {
      return safeReply(
        message,
        "❌ Escribe algo."
      );
    }

    return safeReply(
      message,
      args.join(" ")
    );
  }

  if (
    ["random", "number", "numberguess"].includes(
      command
    )
  ) {
    return safeReply(
      message,
      `🔢 Número aleatorio: **${
        Math.floor(Math.random() * 100) + 1
      }**`
    );
  }

  if (command === "truth") {
    return safeReply(
      message,
      "🤔 Verdad: ¿Cuál es tu juego favorito?"
    );
  }

  if (command === "dare") {
    return safeReply(
      message,
      "🎯 Reto: escribe una frase usando solo emojis."
    );
  }

  if (command === "rate") {
    return safeReply(
      message,
      `⭐ Calificación aleatoria: **${
        Math.floor(Math.random() * 101)
      }/100**`
    );
  }

  if (command === "roast") {
    return safeReply(
      message,
      "🔥 Roast amistoso: hasta Naruto tarda menos en aprender un jutsu que tú en decidir qué jugar 😂"
    );
  }

  if (command === "compliment") {
    return safeReply(
      message,
      "✨ ¡Eres una máquina! Sigue así."
    );
  }

  if (command === "meme") {
    return safeReply(
      message,
      "😂 Cuando dices 'una partida más' y son las 3 AM."
    );
  }

  if (command === "cat") {
    return safeReply(
      message,
      "🐱 Miau."
    );
  }

  if (command === "ninja") {
    return safeReply(
      message,
      "🥷 ¡Modo ninja activado!"
    );
  }

  if (command === "luck") {
    return safeReply(
      message,
      `🍀 Tu suerte hoy es **${
        Math.floor(Math.random() * 101)
      }%**.`
    );
  }

  if (command === "funfact") {
    return safeReply(
      message,
      "🍥 Fun fact: Naruto es conocido por su pasión por el ramen."
    );
  }

  if (command === "clap") {
    return safeReply(
      message,
      "👏👏👏👏👏"
    );
  }

  if (command === "yesno") {
    return safeReply(
      message,
      Math.random() < 0.5
        ? "✅ Sí"
        : "❌ No"
    );
  }

  if (command === "hi") {
    return safeReply(
      message,
      "🍥 ¡Hola! Soy Naruto."
    );
  }

  if (command === "ramen") {
    return safeReply(
      message,
      "🍜 ¡Ramen para todos!"
    );
  }

  if (command === "jutsu") {
    return safeReply(
      message,
      "🔥 ¡Katon! ¡Gōkakyū no Jutsu!"
    );
  }
}

// ============================================================
// 🏠 SERVIDOR
// ============================================================

async function serverCommand(
  message,
  command,
  args
) {
  const guild =
    message.guild;

  if (
    [
      "serverinfo",
      "guildinfo",
      "info",
      "serverstats",
      "guild"
    ].includes(command)
  ) {
    const owner =
      await guild.fetchOwner();

    return safeReply(
      message,
      `🏠 **${guild.name}**\n\n` +
      `👑 Dueño: ${owner.user.tag}\n` +
      `👥 Miembros: **${guild.memberCount}**\n` +
      `🎭 Roles: **${guild.roles.cache.size}**\n` +
      `📁 Canales: **${guild.channels.cache.size}**\n` +
      `😀 Emojis: **${guild.emojis.cache.size}**\n` +
      `🚀 Boosts: **${guild.premiumSubscriptionCount || 0}**\n` +
      `🆔 ID: \`${guild.id}\``
    );
  }

  if (
    ["servericon", "icon"].includes(command)
  ) {
    return safeReply(
      message,
      guild.iconURL({
        size: 1024
      }) || "❌ Sin icono."
    );
  }

  if (
    ["roleinfo"].includes(command)
  ) {
    const role =
      message.mentions.roles.first();

    if (!role) {
      return safeReply(
        message,
        `❌ Uso: \`${PREFIX}roleinfo @rol\``
      );
    }

    return safeReply(
      message,
      `🎭 **${role.name}**\n🆔 ${role.id}\n👥 Miembros: **${role.members.size}**\n📊 Posición: **${role.position}**`
    );
  }

  if (command === "channelinfo") {
    const channel =
      message.mentions.channels.first() ||
      message.channel;

    return safeReply(
      message,
      `📁 **${channel.name}**\n🆔 ${channel.id}\n📌 Tipo: ${channel.type}`
    );
  }

  if (
    ["rolelist", "roles"].includes(command)
  ) {
    const roles =
      guild.roles.cache
        .sort((a, b) => b.position - a.position)
        .map(r => r.name);

    return replyLong(
      message,
      `🎭 **Roles**\n\n${roles.join("\n")}`
    );
  }

  if (
    ["membercount", "members"].includes(command)
  ) {
    return safeReply(
      message,
      `👥 Este servidor tiene **${guild.memberCount}** miembros.`
    );
  }

  if (command === "channels") {
    const channels =
      guild.channels.cache
        .map(c => `• ${c.name}`);

    return replyLong(
      message,
      channels.join("\n")
    );
  }

  if (command === "emojis") {
    const emojis =
      guild.emojis.cache
        .map(e => `${e} ${e.name}`);

    return replyLong(
      message,
      emojis.length
        ? emojis.join("\n")
        : "😀 No hay emojis."
    );
  }

  if (command === "stickers") {
    return safeReply(
      message,
      `🎟️ Stickers: **${guild.stickers.cache.size}**`
    );
  }

  if (
    ["boosts", "boostinfo"].includes(command)
  ) {
    return safeReply(
      message,
      `🚀 Boosts: **${guild.premiumSubscriptionCount || 0}**\n📈 Nivel: **${guild.premiumTier}**`
    );
  }

  if (
    ["owner", "serverowner"].includes(command)
  ) {
    const owner =
      await guild.fetchOwner();

    return safeReply(
      message,
      `👑 Dueño: ${owner.user.tag}`
    );
  }

  if (
    ["createdserver", "datecreated"].includes(command)
  ) {
    return safeReply(
      message,
      `📅 Creado: <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`
    );
  }

  if (
    ["serverid", "guildid"].includes(command)
  ) {
    return safeReply(
      message,
      `🆔 \`${guild.id}\``
    );
  }

  if (command === "invite") {
    const invite =
      await message.channel
        .createInvite({
          maxAge: 86400,
          maxUses: 0
        })
        .catch(() => null);

    return safeReply(
      message,
      invite
        ? `🔗 ${invite.url}`
        : "❌ No tengo permisos para crear invitaciones."
    );
  }

  if (command === "ping") {
    return safeReply(
      message,
      `🏓 Pong! **${client.ws.ping}ms**`
    );
  }

  if (command === "stats") {
    return safeReply(
      message,
      `📊 **Estadísticas**\n👥 ${guild.memberCount} miembros\n🎭 ${guild.roles.cache.size} roles\n📁 ${guild.channels.cache.size} canales`
    );
  }

  if (command === "rolescount") {
    return safeReply(
      message,
      `🎭 Roles: **${guild.roles.cache.size}**`
    );
  }

  if (command === "channelcount") {
    return safeReply(
      message,
      `📁 Canales: **${guild.channels.cache.size}**`
    );
  }

  if (command === "emojicount") {
    return safeReply(
      message,
      `😀 Emojis: **${guild.emojis.cache.size}**`
    );
  }
}

// ============================================================
// 🔐 SEGURIDAD
// ============================================================

async function securityCommand(
  message,
  command,
  args
) {
  if (!isAdmin(message.member)) {
    return safeReply(
      message,
      "❌ Necesitas permisos de Administrador."
    );
  }

  const config =
    getGuild(message.guild.id);

  if (command === "antilink") {
    const option =
      args[0]?.toLowerCase();

    if (option === "on") {
      config.antilink.enabled = true;
      saveDB();

      return safeReply(
        message,
        "🔗 AntiLink activado."
      );
    }

    if (option === "off") {
      config.antilink.enabled = false;
      saveDB();

      return safeReply(
        message,
        "🔗 AntiLink desactivado."
      );
    }

    if (option === "add") {
      const domain = args[1];

      if (!domain) {
        return safeReply(
          message,
          `❌ Uso: \`${PREFIX}antilink add dominio.com\``
        );
      }

      config.antilink.whitelist.push(
        domain
      );

      saveDB();

      return safeReply(
        message,
        `✅ Dominio añadido a whitelist: **${domain}**`
      );
    }

    if (option === "remove") {
      const domain = args[1];

      config.antilink.whitelist =
        config.antilink.whitelist.filter(
          x => x !== domain
        );

      saveDB();

      return safeReply(
        message,
        "🗑️ Dominio eliminado."
      );
    }

    return safeReply(
      message,
      `🔗 AntiLink: **${
        config.antilink.enabled
          ? "ACTIVO"
          : "INACTIVO"
      }**`
    );
  }

  if (command === "antiraid") {
    const option =
      args[0]?.toLowerCase();

    if (option === "on") {
      config.antiraid.enabled = true;
      saveDB();

      return safeReply(
        message,
        "🚨 AntiRaid activado."
      );
    }

    if (option === "off") {
      config.antiraid.enabled = false;
      saveDB();

      return safeReply(
        message,
        "🚨 AntiRaid desactivado."
      );
    }

    if (option === "add") {
      const bot =
        message.mentions.users.first();

      if (!bot) {
        return safeReply(
          message,
          `❌ Uso: \`${PREFIX}antiraid add @bot\``
        );
      }

      if (
        !config.antiraid.botWhitelist.includes(
          bot.id
        )
      ) {
        config.antiraid.botWhitelist.push(
          bot.id
        );
      }

      saveDB();

      return safeReply(
        message,
        `✅ ${bot} añadido a la whitelist de AntiRaid.`
      );
    }

    if (option === "remove") {
      const bot =
        message.mentions.users.first();

      if (bot) {
        config.antiraid.botWhitelist =
          config.antiraid.botWhitelist.filter(
            id => id !== bot.id
          );
      }

      saveDB();

      return safeReply(
        message,
        "🗑️ Bot eliminado de AntiRaid."
      );
    }

    return safeReply(
      message,
      `🚨 AntiRaid: **${
        config.antiraid.enabled
          ? "ACTIVO"
          : "INACTIVO"
      }**`
    );
  }

  if (command === "antinuke") {
    const option =
      args[0]?.toLowerCase();

    if (option === "on") {
      config.antinuke.enabled = true;
      saveDB();

      return safeReply(
        message,
        "☢️ AntiNuke activado."
      );
    }

    if (option === "off") {
      config.antinuke.enabled = false;
      saveDB();

      return safeReply(
        message,
        "☢️ AntiNuke desactivado."
      );
    }

    return safeReply(
      message,
      `☢️ AntiNuke: **${
        config.antinuke.enabled
          ? "ACTIVO"
          : "INACTIVO"
      }**\n📁 Canales protegidos: **${
        config.antinuke.protectChannels
      }**\n🎭 Roles protegidos: **${
        config.antinuke.protectRoles
      }**`
    );
  }

  if (
    ["protection", "security", "securityinfo",
      "protectionstatus", "antihelp",
      "nukestatus"].includes(command)
  ) {
    return safeReply(
      message,
      `🔐 **Seguridad Naruto**\n\n` +
      `🔗 AntiLink: ${config.antilink.enabled ? "🟢" : "🔴"}\n` +
      `🚨 AntiRaid: ${config.antiraid.enabled ? "🟢" : "🔴"}\n` +
      `☢️ AntiNuke: ${config.antinuke.enabled ? "🟢" : "🔴"}\n` +
      `📜 Logs: ${config.logsChannel ? `<#${config.logsChannel}>` : "🔴"}`
    );
  }

  if (
    [
      "whitelist",
      "addwhitelist",
      "removewhitelist"
    ].includes(command)
  ) {
    const type =
      args[0]?.toLowerCase();

    const user =
      message.mentions.users.first();

    const role =
      message.mentions.roles.first();

    if (type === "user" && user) {
      if (
        command === "removewhitelist"
      ) {
        config.antinuke.whitelistUsers =
          config.antinuke.whitelistUsers.filter(
            id => id !== user.id
          );
      } else {
        if (
          !config.antinuke.whitelistUsers.includes(
            user.id
          )
        ) {
          config.antinuke.whitelistUsers.push(
            user.id
          );
        }
      }

      saveDB();

      return safeReply(
        message,
        "✅ Whitelist de usuario actualizada."
      );
    }

    if (type === "role" && role) {
      if (
        command === "removewhitelist"
      ) {
        config.antinuke.whitelistRoles =
          config.antinuke.whitelistRoles.filter(
            id => id !== role.id
          );
      } else {
        if (
          !config.antinuke.whitelistRoles.includes(
            role.id
          )
        ) {
          config.antinuke.whitelistRoles.push(
            role.id
          );
        }
      }

      saveDB();

      return safeReply(
        message,
        "✅ Whitelist de rol actualizada."
      );
    }

    return safeReply(
      message,
      `❌ Uso: \`${PREFIX}whitelist user @usuario\` o \`${PREFIX}whitelist role @rol\``
    );
  }

  if (
    ["botwhitelist", "addbot", "removebot"].includes(
      command
    )
  ) {
    const bot =
      message.mentions.users.first();

    if (!bot) {
      return safeReply(
        message,
        `❌ Menciona un bot.`
      );
    }

    if (
      command === "removebot"
    ) {
      config.antiraid.botWhitelist =
        config.antiraid.botWhitelist.filter(
          id => id !== bot.id
        );
    } else {
      if (
        !config.antiraid.botWhitelist.includes(
          bot.id
        )
      ) {
        config.antiraid.botWhitelist.push(
          bot.id
        );
      }
    }

    saveDB();

    return safeReply(
      message,
      "🤖 Whitelist de bots actualizada."
    );
  }

  if (
    ["antichannel", "antirole"].includes(
      command
    )
  ) {
    const option =
      args[0]?.toLowerCase();

    const key =
      command === "antichannel"
        ? "protectChannels"
        : "protectRoles";

    if (option === "on") {
      config.antinuke[key] = true;
    } else if (option === "off") {
      config.antinuke[key] = false;
    }

    saveDB();

    return safeReply(
      message,
      `🛡️ Protección ${
        command === "antichannel"
          ? "de canales"
          : "de roles"
      }: **${
        config.antinuke[key]
          ? "ACTIVA"
          : "INACTIVA"
      }**`
    );
  }

  if (
    [
      "setlogs",
      "logchannel"
    ].includes(command)
  ) {
    const channel =
      message.mentions.channels.first();

    if (!channel) {
      return safeReply(
        message,
        `❌ Uso: \`${PREFIX}setlogs #canal\``
      );
    }

    config.logsChannel = channel.id;

    saveDB();

    return safeReply(
      message,
      `📜 Canal de logs configurado: ${channel}`
    );
  }

  if (
    ["disablelogs"].includes(command)
  ) {
    config.logsChannel = null;

    saveDB();

    return safeReply(
      message,
      "📜 Logs desactivados."
    );
  }

  if (command === "testlogs") {
    await sendLog(
      message.guild,
      logEmbed(
        "🧪 Test de Logs",
        `Los logs funcionan correctamente.\nProbado por ${message.author}.`
      )
    );

    return safeReply(
      message,
      "🧪 Log de prueba enviado."
    );
  }

  if (
    ["logs"].includes(command)
  ) {
    return safeReply(
      message,
      `📜 Canal de logs: ${
        config.logsChannel
          ? `<#${config.logsChannel}>`
          : "No configurado"
      }`
    );
  }

  if (
    ["audit", "auditlog"].includes(command)
  ) {
    const logs =
      await message.guild
        .fetchAuditLogs({
          limit: 5
        })
        .catch(() => null);

    if (!logs) {
      return safeReply(
        message,
        "❌ No pude acceder a los Audit Logs."
      );
    }

    let text = "📜 **Últimos Audit Logs**\n\n";

    logs.entries.forEach(entry => {
      text +=
        `• ${entry.action} — ${entry.executor?.tag || "Desconocido"}\n`;
    });

    return replyLong(
      message,
      text
    );
  }

  if (
    ["raidstatus", "linkstatus"].includes(command)
  ) {
    return safeReply(
      message,
      `🚨 AntiRaid: ${
        config.antiraid.enabled
          ? "🟢 Activo"
          : "🔴 Inactivo"
      }\n🔗 AntiLink: ${
        config.antilink.enabled
          ? "🟢 Activo"
          : "🔴 Inactivo"
      }`
    );
  }

  if (command === "whitelistusers") {
    return safeReply(
      message,
      config.antinuke.whitelistUsers.length
        ? config.antinuke.whitelistUsers
            .map(id => `<@${id}>`)
            .join("\n")
        : "No hay usuarios en whitelist."
    );
  }

  if (command === "whitelistroles") {
    return safeReply(
      message,
      config.antinuke.whitelistRoles.length
        ? config.antinuke.whitelistRoles
            .map(id => `<@&${id}>`)
            .join("\n")
        : "No hay roles en whitelist."
    );
  }

  if (command === "whitelistbots") {
    return safeReply(
      message,
      config.antiraid.botWhitelist.length
        ? config.antiraid.botWhitelist
            .map(id => `<@${id}>`)
            .join("\n")
        : "No hay bots en whitelist."
    );
  }

  if (
    ["antiwhitelist"].includes(command)
  ) {
    return safeReply(
      message,
      `👤 Usuarios: **${config.antinuke.whitelistUsers.length}**\n🎭 Roles: **${config.antinuke.whitelistRoles.length}**\n🤖 Bots: **${config.antiraid.botWhitelist.length}**`
    );
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

async function configCommand(
  message,
  command,
  args
) {
  if (
    [
      "settings",
      "config",
      "setup",
      "serverconfig",
      "modules"
    ].includes(command)
  ) {
    if (!isAdmin(message.member)) {
      return safeReply(
        message,
        "❌ Necesitas permisos de Administrador."
      );
    }

    const g =
      getGuild(message.guild.id);

    return safeReply(
      message,
      `⚙️ **Configuración Naruto**\n\n` +
      `📜 Logs: ${g.logsChannel ? `<#${g.logsChannel}>` : "❌"}\n` +
      `🔗 AntiLink: ${g.antilink.enabled ? "🟢" : "🔴"}\n` +
      `🚨 AntiRaid: ${g.antiraid.enabled ? "🟢" : "🔴"}\n` +
      `☢️ AntiNuke: ${g.antinuke.enabled ? "🟢" : "🔴"}\n` +
      `👋 Welcome: ${g.welcome.enabled ? "🟢" : "🔴"}\n` +
      `🎭 Autorole: ${g.autorole.enabled ? "🟢" : "🔴"}\n` +
      `🏆 Rank: ${g.rank.enabled ? "🟢" : "🔴"}`
    );
  }

  if (
    ["welcome", "welcomechannel"].includes(
      command
    )
  ) {
    if (!isAdmin(message.member)) {
      return safeReply(
        message,
        "❌ Necesitas permisos de Administrador."
      );
    }

    const g =
      getGuild(message.guild.id);

    if (command === "welcome") {
      const option =
        args[0]?.toLowerCase();

      if (option === "on") {
        g.welcome.enabled = true;
      }

      if (option === "off") {
        g.welcome.enabled = false;
      }

      saveDB();

      return safeReply(
        message,
        `👋 Welcome: **${
          g.welcome.enabled
            ? "ACTIVO"
            : "INACTIVO"
        }**`
      );
    }

    const channel =
      message.mentions.channels.first();

    if (!channel) {
      return safeReply(
        message,
        `❌ Menciona un canal.`
      );
    }

    g.welcome.channel =
      channel.id;

    saveDB();

    return safeReply(
      message,
      `👋 Canal de bienvenida: ${channel}`
    );
  }

  if (
    ["autorole", "autoroleset"].includes(
      command
    )
  ) {
    if (!isAdmin(message.member)) {
      return safeReply(
        message,
        "❌ Necesitas permisos de Administrador."
      );
    }

    const g =
      getGuild(message.guild.id);

    if (command === "autorole") {
      const option =
        args[0]?.toLowerCase();

      if (option === "on") {
        g.autorole.enabled = true;
      }

      if (option === "off") {
        g.autorole.enabled = false;
      }

      saveDB();

      return safeReply(
        message,
        `🎭 Autorole: **${
          g.autorole.enabled
            ? "ACTIVO"
            : "INACTIVO"
        }**`
      );
    }

    const role =
      message.mentions.roles.first();

    if (!role) {
      return safeReply(
        message,
        "❌ Menciona un rol."
      );
    }

    g.autorole.role =
      role.id;

    saveDB();

    return safeReply(
      message,
      `🎭 Autorole configurado: ${role}`
    );
  }

  if (
    ["setranktext", "ranktext", "ranktitle"].includes(
      command
    )
  ) {
    return rankCommand(
      message,
      "setranktext",
      args
    );
  }

  if (command === "setprefix") {
    return safeReply(
      message,
      "🍥 El prefijo de Naruto está fijado en `N!`."
    );
  }

  if (command === "reload") {
    loadDB();

    return safeReply(
      message,
      "♻️ Base de datos recargada."
    );
  }

  if (command === "database") {
    return safeReply(
      message,
      `💾 Usuarios: **${Object.keys(db.users).length}**\n🏠 Servidores: **${Object.keys(db.guilds).length}**`
    );
  }

  if (command === "backup") {
    saveDB();

    return safeReply(
      message,
      "💾 Base de datos guardada correctamente."
    );
  }

  if (command === "botstatus") {
    return safeReply(
      message,
      `🍥 Naruto está conectado.\n🏠 Servidores: **${client.guilds.cache.size}**\n👥 Usuarios en caché: **${client.users.cache.size}**`
    );
  }

  if (command === "activity") {
    return safeReply(
      message,
      `🎮 Actividad: **Naruto | ${PREFIX}help**`
    );
  }

  if (command === "language") {
    return safeReply(
      message,
      "🇪🇸 Idioma configurado: Español."
    );
  }

  if (
    ["shopadd", "shopremove", "shopprice",
      "shopclear", "shopreset"].includes(command)
  ) {
    return shopCommand(
      message,
      command,
      args
    );
  }

  if (
    ["setlogs", "disablelogs", "testlogs"].includes(
      command
    )
  ) {
    return securityCommand(
      message,
      command,
      args
    );
  }

  if (command === "helpadmin") {
    return showAdminHelp(message);
  }

  if (command === "help") {
    return showHelp(message);
  }
}

// ============================================================
// 🎭 ROLES
// ============================================================

async function rolesCommand(
  message,
  command,
  args
) {
  if (
    [
      "roleinfo",
      "rolelist",
      "roles",
      "rolecount",
      "rolecheck",
      "rolewhitelist",
      "roleprotect"
    ].includes(command)
  ) {
    return serverCommand(
      message,
      command,
      args
    );
  }

  if (
    ["rolesme", "myroles", "memberroles"].includes(
      command
    )
  ) {
    return socialCommand(
      message,
      "rolesme",
      args
    );
  }

  if (
    [
      "addrole",
      "giverole",
      "roleadd",
      "removerole",
      "takerole",
      "roleremove",
      "rolecreate",
      "roledelete",
      "rolecolor",
      "rolehoist",
      "rolemention",
      "move",
      "roleedit",
      "roleperm"
    ].includes(command)
  ) {
    if (!isAdmin(message.member)) {
      return safeReply(
        message,
        "❌ Necesitas permisos de Administrador."
      );
    }
  }

  if (
    ["addrole", "giverole", "roleadd"].includes(
      command
    )
  ) {
    const member =
      message.mentions.members.first();

    const role =
      message.mentions.roles.first();

    if (!member || !role) {
      return safeReply(
        message,
        `❌ Uso: \`${PREFIX}giverole @usuario @rol\``
      );
    }

    if (!role.editable) {
      return safeReply(
        message,
        "❌ Naruto no puede administrar ese rol."
      );
    }

    await member.roles.add(role)
      .catch(() => null);

    return safeReply(
      message,
      `🎭 ${role} añadido a ${member}.`
    );
  }

  if (
    ["removerole", "takerole", "roleremove"].includes(
      command
    )
  ) {
    const member =
      message.mentions.members.first();

    const role =
      message.mentions.roles.first();

    if (!member || !role) {
      return safeReply(
        message,
        `❌ Uso: \`${PREFIX}takerole @usuario @rol\``
      );
    }

    if (!role.editable) {
      return safeReply(
        message,
        "❌ Naruto no puede administrar ese rol."
      );
    }

    await member.roles.remove(role)
      .catch(() => null);

    return safeReply(
      message,
      `🎭 ${role} eliminado de ${member}.`
    );
  }

  if (command === "rolecreate") {
    const name =
      args.join(" ");

    if (!name) {
      return safeReply(
        message,
        `❌ Uso: \`${PREFIX}rolecreate nombre\``
      );
    }

    const role =
      await message.guild.roles.create({
        name,
        reason: `Creado por ${message.author.tag}`
      }).catch(() => null);

    return safeReply(
      message,
      role
        ? `🎭 Rol creado: ${role}`
        : "❌ No pude crear el rol."
    );
  }

  if (command === "roledelete") {
    const role =
      message.mentions.roles.first();

    if (!role) {
      return safeReply(
        message,
        "❌ Menciona un rol."
      );
    }

    if (!role.editable) {
      return safeReply(
        message,
        "❌ No puedo eliminar ese rol."
      );
    }

    await role.delete()
      .catch(() => null);

    return safeReply(
      message,
      "🗑️ Rol eliminado."
    );
  }

  if (command === "rolecolor") {
    const role =
      message.mentions.roles.first();

    const hex =
      args.find(x =>
        /^#[0-9A-F]{6}$/i.test(x)
      );

    if (!role || !hex) {
      return safeReply(
        message,
        `❌ Uso: \`${PREFIX}rolecolor @rol #FF0000\``
      );
    }

    await role.setColor(hex)
      .catch(() => null);

    return safeReply(
      message,
      "🎨 Color del rol actualizado."
    );
  }

  if (command === "rolehoist") {
    const role =
      message.mentions.roles.first();

    if (!role) {
      return safeReply(
        message,
        "❌ Menciona un rol."
      );
    }

    await role.setHoist(!role.hoist)
      .catch(() => null);

    return safeReply(
      message,
      "🎭 Hoist actualizado."
    );
  }

  if (command === "rolemention") {
    const role =
      message.mentions.roles.first();

    if (!role) {
      return safeReply(
        message,
        "❌ Menciona un rol."
      );
    }

    await role.setMentionable(
      !role.mentionable
    ).catch(() => null);

    return safeReply(
      message,
      "📣 Mentionable actualizado."
    );
  }

  if (command === "move") {
    const role =
      message.mentions.roles.first();

    const position =
      Number(args[1]);

    if (!role || !Number.isFinite(position)) {
      return safeReply(
        message,
        `❌ Uso: \`${PREFIX}move @rol posición\``
      );
    }

    await role.setPosition(position)
      .catch(() => null);

    return safeReply(
      message,
      "↕️ Posición actualizada."
    );
  }

  if (
    ["roleedit", "roleperm", "rolehelp"].includes(
      command
    )
  ) {
    return safeReply(
      message,
      "🎭 Usa los comandos de gestión de roles de Naruto."
    );
  }
}

// ============================================================
// 🎛️ BOTONES
// ============================================================

client.on(
  Events.InteractionCreate,
  async interaction => {

    try {

      if (interaction.isButton()) {

        if (
          interaction.customId.startsWith(
            "openadminhelp_"
          )
        ) {
          const userId =
            interaction.customId.split("_")[1];

          if (
            interaction.user.id !== userId
          ) {
            return interaction.reply({
              content:
                "❌ Este menú pertenece a otra persona.",
              ephemeral: true
            });
          }

          if (
            !isAdmin(
              interaction.member
            )
          ) {
            return interaction.reply({
              content:
                "❌ Necesitas permisos de Administrador.",
              ephemeral: true
            });
          }

          return interaction.update({
            embeds: [
              new EmbedBuilder()
                .setTitle(
                  "⚙️ Naruto — Administración"
                )
                .setDescription(
                  "Selecciona una categoría."
                )
            ],
            components: [
              createHelpMenu(
                interaction.user.id,
                true
              )
            ]
          });
        }

        if (
          interaction.customId.startsWith(
            "buyrole_"
          )
        ) {
          const roleId =
            interaction.customId
              .replace("buyrole_", "");

          const guild =
            interaction.guild;

          const role =
            guild.roles.cache.get(roleId);

          if (!role) {
            return interaction.reply({
              content:
                "❌ Ese rol ya no existe.",
              ephemeral: true
            });
          }

          const guildData =
            getGuild(guild.id);

          const price =
            guildData.shop.roles[roleId];

          if (price === undefined) {
            return interaction.reply({
              content:
                "❌ Ese producto ya no está disponible.",
              ephemeral: true
            });
          }

          const user =
            getUser(interaction.user.id);

          if (user.money < price) {
            return interaction.reply({
              content:
                `❌ Necesitas **$${price}** y tienes **$${user.money}**.`,
              ephemeral: true
            });
          }

          if (
            interaction.member.roles.cache.has(
              roleId
            )
          ) {
            return interaction.reply({
              content:
                "❌ Ya tienes ese rol.",
              ephemeral: true
            });
          }

          if (!role.editable) {
            return interaction.reply({
              content:
                "❌ Naruto no puede entregar este rol. Pon el rol de Naruto por encima.",
              ephemeral: true
            });
          }

          user.money -= price;

          await interaction.member.roles
            .add(role)
            .catch(() => null);

          saveDB();

          await sendLog(
            guild,
            logEmbed(
              "🛒 Compra realizada",
              `${interaction.user} compró ${role} por **$${price}**.`
            )
          );

          return interaction.reply({
            content:
              `🛒 ¡Compra realizada! Recibiste ${role} por **$${price}**.`,
            ephemeral: true
          });
        }
      }

      if (
        interaction.isStringSelectMenu()
      ) {
        const parts =
          interaction.customId.split("_");

        const type =
          parts[0];

        const userId =
          parts[1];

        if (
          interaction.user.id !== userId
        ) {
          return interaction.reply({
            content:
              "❌ Este menú pertenece a otra persona.",
            ephemeral: true
          });
        }

        const category =
          interaction.values[0];

        const embed =
          helpCategoryEmbed(
            category
          );

        if (!embed) {
          return interaction.reply({
            content:
              "❌ Categoría no encontrada.",
            ephemeral: true
          });
        }

        return interaction.update({
          embeds: [embed],
          components: [
            createHelpMenu(
              interaction.user.id,
              type === "helpadmin"
            )
          ]
        });
      }

    } catch (err) {
      console.error(
        "❌ Interaction error:",
        err
      );
    }
  }
);

// ============================================================
// 👋 MIEMBROS
// ============================================================

client.on(
  Events.GuildMemberAdd,
  async member => {

    const config =
      getGuild(member.guild.id);

    // AntiRaid
    if (
      member.user.bot &&
      config.antiraid.enabled &&
      !config.antiraid.botWhitelist.includes(
        member.id
      )
    ) {
      if (member.bannable) {
        await member.ban({
          reason:
            "🚨 Naruto AntiRaid"
        }).catch(() => {});
      }

      await sendLog(
        member.guild,
        logEmbed(
          "🚨 AntiRaid",
          `🤖 Bot bloqueado: ${member.user.tag}`
        )
      );

      return;
    }

    // Autorole
    if (
      config.autorole.enabled &&
      config.autorole.role
    ) {
      const role =
        member.guild.roles.cache.get(
          config.autorole.role
        );

      if (
        role &&
        role.editable
      ) {
        await member.roles
          .add(role)
          .catch(() => {});
      }
    }

    // Welcome
    if (
      config.welcome.enabled &&
      config.welcome.channel
    ) {
      const channel =
        member.guild.channels.cache.get(
          config.welcome.channel
        );

      if (
        channel &&
        channel.isTextBased()
      ) {
        channel.send(
          `👋 ¡Bienvenido ${member} a **${member.guild.name}**! 🍥`
        ).catch(() => {});
      }
    }

    await sendLog(
      member.guild,
      logEmbed(
        "👋 Usuario entró",
        `${member.user.tag} entró al servidor.`
      )
    );
  }
);

client.on(
  Events.GuildMemberRemove,
  async member => {
    await sendLog(
      member.guild,
      logEmbed(
        "🚪 Usuario salió",
        `${member.user.tag} salió del servidor.`
      )
    );
  }
);

// ============================================================
// 📝 MENSAJES BORRADOS
// ============================================================

client.on(
  Events.MessageDelete,
  async message => {

    if (!message.guild) return;

    if (message.author?.bot) return;

    const content =
      message.content || "Contenido no disponible";

    await sendLog(
      message.guild,
      logEmbed(
        "🗑️ Mensaje borrado",
        `👤 Autor: ${message.author || "Desconocido"}\n` +
        `📁 Canal: ${message.channel}\n` +
        `💬 Contenido:\n> ${content.slice(0, 1500)}`
      )
    );
  }
);

// ============================================================
// ✏️ MENSAJES EDITADOS
// ============================================================

client.on(
  Events.MessageUpdate,
  async (oldMessage, newMessage) => {

    if (!newMessage.guild) return;
    if (newMessage.author?.bot) return;

    if (
      oldMessage.content ===
      newMessage.content
    ) {
      return;
    }

    await sendLog(
      newMessage.guild,
      logEmbed(
        "✏️ Mensaje editado",
        `👤 Autor: ${newMessage.author}\n` +
        `📁 Canal: ${newMessage.channel}\n\n` +
        `🔴 Antes:\n> ${(oldMessage.content || "No disponible").slice(0, 700)}\n\n` +
        `🟢 Después:\n> ${(newMessage.content || "No disponible").slice(0, 700)}`
      )
    );
  }
);

// ============================================================
// 🎭 ROLES CREADOS
// ============================================================

client.on(
  Events.RoleCreate,
  async role => {

    await handleStructureProtection(
      role.guild,
      AuditLogEvent.RoleCreate,
      role.id,
      `🎭 Rol creado: **${role.name}**`
    );

    await sendLog(
      role.guild,
      logEmbed(
        "🎭 Rol creado",
        `Rol: ${role}\n🆔 ${role.id}`
      )
    );
  }
);

// ============================================================
// 🗑️ ROLES ELIMINADOS
// ============================================================

client.on(
  Events.RoleDelete,
  async role => {

    await handleStructureProtection(
      role.guild,
      AuditLogEvent.RoleDelete,
      role.id,
      `🗑️ Rol eliminado: **${role.name}**`
    );

    await sendLog(
      role.guild,
      logEmbed(
        "🗑️ Rol eliminado",
        `Rol: **${role.name}**\n🆔 ${role.id}`
      )
    );
  }
);

// ============================================================
// 📁 CANALES CREADOS
// ============================================================

client.on(
  Events.ChannelCreate,
  async channel => {

    if (!channel.guild) return;

    await handleStructureProtection(
      channel.guild,
      AuditLogEvent.ChannelCreate,
      channel.id,
      `📁 Canal creado: **${channel.name}**`
    );

    await sendLog(
      channel.guild,
      logEmbed(
        "📁 Canal creado",
        `Canal: ${channel}\n🆔 ${channel.id}`
      )
    );
  }
);

// ============================================================
// 🗑️ CANALES ELIMINADOS
// ============================================================

client.on(
  Events.ChannelDelete,
  async channel => {

    if (!channel.guild) return;

    await handleStructureProtection(
      channel.guild,
      AuditLogEvent.ChannelDelete,
      channel.id,
      `🗑️ Canal eliminado: **${channel.name}**`
    );

    await sendLog(
      channel.guild,
      logEmbed(
        "🗑️ Canal eliminado",
        `Canal: **${channel.name}**\n🆔 ${channel.id}`
      )
    );
  }
);

// ============================================================
// 💬 MENSAJES / COMANDOS
// ============================================================

client.on(
  Events.MessageCreate,
  async message => {

    if (!message.guild) return;
    if (message.author.bot) return;

    const guildData =
      getGuild(message.guild.id);

    // ========================================================
    // 🔗 ANTILINK
    // ========================================================

    if (
      guildData.antilink.enabled &&
      !isAdmin(message.member) &&
      containsLink(message.content) &&
      !isWhitelistedLink(
        message.content,
        guildData.antilink.whitelist
      )
    ) {
      await message.delete()
        .catch(() => {});

      await message.member
        .timeout(
          guildData.antilink.timeout,
          "🔗 Naruto AntiLink"
        )
        .catch(() => {});

      await sendLog(
        message.guild,
        logEmbed(
          "🔗 AntiLink",
          `${message.author} envió un enlace y fue sancionado.`
        )
      );

      return;
    }

    // ========================================================
    // ⭐ XP
    // ========================================================

    await addXP(
      message.member,
      5
    );

    // ========================================================
    // 📌 PREFIJO
    // ========================================================

    if (
      !message.content
        .toLowerCase()
        .startsWith(PREFIX.toLowerCase())
    ) {
      return;
    }

    const raw =
      message.content.slice(
        PREFIX.length
      ).trim();

    if (!raw) return;

    const parts =
      raw.split(/\s+/);

    const command =
      parts.shift().toLowerCase();

    const args =
      parts;

    // ========================================================
    // 📚 HELP
    // ========================================================

    if (command === "help") {
      return showHelp(message);
    }

    if (command === "helpadmin") {
      return showAdminHelp(message);
    }

    // ========================================================
    // 💰 ECONOMÍA
    // ========================================================

    const economyCommands =
      categories.economy.commands;

    if (
      economyCommands.includes(command)
    ) {
      return economyCommand(
        message,
        command,
        args
      );
    }

    // ========================================================
    // 🛡️ MODERACIÓN
    // ========================================================

    if (
      categories.moderation.commands
        .includes(command)
    ) {
      return moderationCommand(
        message,
        command,
        args
      );
    }

    // ========================================================
    // 🛒 SHOP
    // ========================================================

    if (
      categories.shop.commands
        .includes(command)
    ) {
      return shopCommand(
        message,
        command,
        args
      );
    }

    // ========================================================
    // 🏆 RANK
    // ========================================================

    if (
      categories.rank.commands
        .includes(command)
    ) {
      return rankCommand(
        message,
        command,
        args
      );
    }

    // ========================================================
    // 👤 SOCIAL
    // ========================================================

    if (
      categories.social.commands
        .includes(command)
    ) {
      return socialCommand(
        message,
        command,
        args
      );
    }

    // ========================================================
    // 🎮 DIVERSIÓN
    // ========================================================

    if (
      categories.fun.commands
        .includes(command)
    ) {
      return funCommand(
        message,
        command,
        args
      );
    }

    // ========================================================
    // 🏠 SERVIDOR
    // ========================================================

    if (
      categories.server.commands
        .includes(command)
    ) {
      return serverCommand(
        message,
        command,
        args
      );
    }

    // ========================================================
    // 🔐 SEGURIDAD
    // ========================================================

    if (
      categories.security.commands
        .includes(command)
    ) {
      return securityCommand(
        message,
        command,
        args
      );
    }

    // ========================================================
    // ⚙️ CONFIGURACIÓN
    // ========================================================

    if (
      categories.config.commands
        .includes(command)
    ) {
      return configCommand(
        message,
        command,
        args
      );
    }

    // ========================================================
    // 🎭 ROLES
    // ========================================================

    if (
      categories.roles.commands
        .includes(command)
    ) {
      return rolesCommand(
        message,
        command,
        args
      );
    }

    // ========================================================
    // ❓ COMANDO DESCONOCIDO
    // ========================================================

    return safeReply(
      message,
      `❌ Comando desconocido. Usa \`${PREFIX}help\` para ver los comandos.`
    );
  }
);

// ============================================================
// 🟢 READY
// ============================================================

client.once(
  Events.ClientReady,
  readyClient => {

    console.log(
      `🍥 Naruto conectado como ${readyClient.user.tag}`
    );

    readyClient.user.setPresence({
      activities: [
        {
          name: `${PREFIX}help | Naruto`,
          type: 0
        }
      ],
      status: "online"
    });
  }
);

// ============================================================
// ❌ ERRORES
// ============================================================

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "❌ Unhandled Rejection:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {
    console.error(
      "❌ Uncaught Exception:",
      error
    );
  }
);

// ============================================================
// 🔑 LOGIN
// ============================================================

if (!process.env.DISCORD_TOKEN) {
  console.error(
    "❌ Falta la variable DISCORD_TOKEN en Render."
  );
  process.exit(1);
}

client.login(
  process.env.DISCORD_TOKEN
);
