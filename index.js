// ============================================================
// 🍥 NARUTO — DISCORD BOT
// PREFIX: N!
// discord.js v14
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
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember
  ]
});

// ============================================================
// 🌐 RENDER
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
      db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

      if (!db.users) db.users = {};
      if (!db.guilds) db.guilds = {};
    }
  } catch (error) {
    console.error("❌ Error cargando data.json:", error);
  }
}

function saveDB() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(db, null, 2),
      "utf8"
    );
  } catch (error) {
    console.error("❌ Error guardando DB:", error);
  }
}

loadDB();

// ============================================================
// 👤 USUARIO
// ============================================================

function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = {
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

  const user = db.users[id];

  user.money ??= 100;
  user.bank ??= 0;
  user.xp ??= 0;
  user.level ??= 1;
  user.reps ??= 0;
  user.warnings ??= 0;
  user.bio ??= "";
  user.lastDaily ??= 0;
  user.lastWork ??= 0;

  return user;
}

// ============================================================
// 🏠 GUILD
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
      message: "🎉 ¡Felicidades {user}! Has subido al nivel **{level}**."
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

  const g = db.guilds[guildId];
  const def = defaultGuild();

  if (!g.antilink) g.antilink = def.antilink;
  if (!g.antiraid) g.antiraid = def.antiraid;
  if (!g.antinuke) g.antinuke = def.antinuke;
  if (!g.welcome) g.welcome = def.welcome;
  if (!g.autorole) g.autorole = def.autorole;
  if (!g.rank) g.rank = def.rank;
  if (!g.shop) g.shop = def.shop;

  g.antilink.whitelist ??= [];
  g.antiraid.botWhitelist ??= [];
  g.antinuke.whitelistUsers ??= [];
  g.antinuke.whitelistRoles ??= [];
  g.shop.roles ??= {};

  g.rank.text ??= def.rank.text;
  g.rank.channel ??= null;
  g.rank.message ??= def.rank.message;

  return g;
}

// ============================================================
// 🛠️ UTILIDADES
// ============================================================

function isAdmin(member) {
  return member?.permissions?.has(
    PermissionsBitField.Flags.Administrator
  );
}

async function replyLong(message, text) {
  const max = 1900;

  if (!text) return;

  while (text.length > max) {
    let cut = text.lastIndexOf("\n", max);

    if (cut < 500) cut = max;

    await message.channel.send(text.slice(0, cut));
    text = text.slice(cut).trimStart();
  }

  if (text.length) {
    await message.channel.send(text);
  }
}

function duration(ms) {
  const seconds = Math.floor(ms / 1000);

  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h`;

  return `${Math.floor(hours / 24)}d`;
}

function parseTime(input) {
  if (!input) return null;

  const match = input.match(
    /^(\d+)(s|m|h|d|w)$/i
  );

  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000
  };

  return amount * multipliers[unit];
}

function cleanMention(text) {
  if (!text) return null;

  const match = text.match(/^<@!?(\d+)>$/);

  return match ? match[1] : null;
}

function getNeededXP(level) {
  return 100 + ((level - 1) * 50);
}

function replaceRankText(text, member, user) {
  return text
    .replaceAll("{user}", `${member}`)
    .replaceAll("{username}", member.user.username)
    .replaceAll("{level}", String(user.level))
    .replaceAll("{xp}", String(user.xp))
    .replaceAll("{needed}", String(getNeededXP(user.level)));
}

// ============================================================
// ⭐ XP / RANK
// ============================================================

async function addXP(member, amount = 5) {
  if (!member?.guild) return;

  const user = getUser(member.id);

  user.xp += amount;

  let leveledUp = false;

  while (user.xp >= getNeededXP(user.level)) {
    user.xp -= getNeededXP(user.level);
    user.level++;
    leveledUp = true;
  }

  saveDB();

  if (!leveledUp) return;

  const g = getGuild(member.guild.id);

  if (!g.rank.channel) return;

  const channel = member.guild.channels.cache.get(
    g.rank.channel
  );

  if (!channel || !channel.isTextBased()) return;

  const text = replaceRankText(
    g.rank.message,
    member,
    user
  );

  try {
    await channel.send(text);
  } catch {}
}

// ============================================================
// 📝 LOGS
// ============================================================

async function sendLog(guild, title, description, fields = []) {
  try {
    const g = getGuild(guild.id);

    if (!g.logsChannel) return;

    const channel = guild.channels.cache.get(
      g.logsChannel
    );

    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setTitle(`🍥 ${title}`)
      .setDescription(description || "Sin información")
      .setTimestamp()
      .setFooter({
        text: "Naruto • Sistema de Logs"
      });

    if (fields.length) {
      embed.addFields(fields);
    }

    await channel.send({
      embeds: [embed]
    });
  } catch (error) {
    console.error("Error enviando log:", error.message);
  }
}

// ============================================================
// 🔗 ANTILINK
// ============================================================

const LINK_REGEX =
  /(https?:\/\/|www\.|discord\.gg\/|discord\.com\/invite\/|[a-z0-9-]+\.(com|net|org|gg|io|me|xyz|tk|ml|shop|site|online|dev|co|es|tv|ly)\b)/i;

function containsLink(content) {
  return LINK_REGEX.test(content);
}

function whitelistedLink(content, whitelist) {
  return whitelist.some(domain =>
    content.toLowerCase().includes(
      domain.toLowerCase()
    )
  );
}

// ============================================================
// 🛡️ ANTI-NUKE
// ============================================================

async function getExecutor(guild, type, targetId) {
  try {
    const logs = await guild.fetchAuditLogs({
      type,
      limit: 5
    });

    const entry = logs.entries.find(entry => {
      if (!entry.target) return false;

      return (
        entry.target.id === targetId &&
        Date.now() - entry.createdTimestamp < 15000
      );
    });

    return entry?.executor || null;
  } catch {
    return null;
  }
}

async function handleAntiNuke(
  guild,
  type,
  targetId,
  targetName
) {
  const g = getGuild(guild.id);

  if (!g.antinuke.enabled) return;

  const executor = await getExecutor(
    guild,
    type,
    targetId
  );

  if (!executor) return;

  if (executor.id === client.user.id) return;
  if (executor.id === guild.ownerId) return;

  if (
    g.antinuke.whitelistUsers.includes(
      executor.id
    )
  ) {
    return;
  }

  const executorMember =
    await guild.members.fetch(executor.id)
      .catch(() => null);

  if (
    executorMember &&
    executorMember.roles.cache.some(role =>
      g.antinuke.whitelistRoles.includes(role.id)
    )
  ) {
    return;
  }

  if (!executorMember) return;

  if (g.antinuke.action === "kick") {
    if (executorMember.kickable) {
      await executorMember.kick(
        `Naruto Anti-Nuke: ${targetName}`
      ).catch(() => {});
    }
  }

  await sendLog(
    guild,
    "🚨 Anti-Nuke activado",
    `Se detectó una acción protegida.`,
    [
      {
        name: "Usuario",
        value: `${executor}`,
        inline: true
      },
      {
        name: "Acción",
        value: type.toString(),
        inline: true
      },
      {
        name: "Objetivo",
        value: targetName || targetId,
        inline: true
      }
    ]
  );
}

// ============================================================
// 🎛️ CATEGORÍAS
// ============================================================

// ---------------- PUBLIC ----------------

const PUBLIC_CATEGORIES = {
  economy: {
    label: "💰 Economía",
    description: "Dinero, banco, trabajo y economía.",
    commands: [
      "balance", "daily", "work", "pay", "deposit",
      "withdraw", "bank", "richest", "money", "cash",
      "wallet", "coins", "salary", "job", "mymoney",
      "wealth", "economy", "depositall", "withdrawall",
      "transfer", "give", "funds", "capital", "earnings",
      "salarycheck", "cashinfo", "balanceinfo", "paycheck",
      "income", "fortune"
    ]
  },

  shop: {
    label: "🛒 Shop",
    description: "Compra roles y mira la tienda.",
    commands: [
      "shop", "tienda", "nshop", "store", "market",
      "marketplace", "productos", "catalogo", "precios",
      "shoplist", "shopinfo", "items", "item", "comprar",
      "buy", "purchase", "myroles", "owned", "inventory",
      "inv", "shoproles", "rolestienda", "productlist",
      "shopmenu", "shopping", "storelist", "roleshop",
      "rolshop", "marketlist"
    ]
  },

  rank: {
    label: "🏆 Rank",
    description: "XP, niveles y rankings.",
    commands: [
      "rank", "level", "xp", "leaderboard", "top",
      "rankcard", "rewards", "levels", "mylevel", "myxp",
      "xptop", "leveltop", "progress", "nextlevel",
      "globalrank", "guildrank", "xpinfo", "ranking",
      "stats", "progressbar", "levelinfo", "xpneeded",
      "rankinfo", "xprank", "levelrank", "ranktop",
      "nlevel", "nprogress", "ninjarank", "ranktitle"
    ]
  },

  social: {
    label: "👤 Social",
    description: "Perfiles, reputación y usuarios.",
    commands: [
      "profile", "avatar", "banner", "bio", "setbio",
      "rep", "reps", "userinfo", "aboutme", "member",
      "joined", "created", "rolesme", "mention", "id",
      "account", "social", "whois", "user", "me",
      "userprofile", "profileinfo", "reputation",
      "repcount", "mybio", "setdescription", "memberinfo",
      "accountinfo", "userstats", "identity"
    ]
  },

  fun: {
    label: "🎮 Diversión",
    description: "Comandos divertidos.",
    commands: [
      "8ball", "dice", "rps", "joke", "choose",
      "reverse", "say", "random", "coinflip", "roll",
      "number", "truth", "dare", "rate", "roast",
      "compliment", "meme", "cat", "ninja", "luck",
      "magic8", "flip", "funfact", "magic", "numberguess",
      "clap", "yesno", "hi", "ramen", "jutsu"
    ]
  },

  server: {
    label: "🏠 Servidor",
    description: "Información del servidor.",
    commands: [
      "serverinfo", "servericon", "roleinfo", "channelinfo",
      "rolelist", "membercount", "members", "channels",
      "roles", "emojis", "stickers", "boosts", "owner",
      "createdserver", "serverid", "invite", "ping", "stats",
      "serverstats", "guildinfo", "guildid", "icon",
      "rolescount", "channelcount", "emojicount",
      "boostinfo", "serverowner", "datecreated", "info",
      "server"
    ]
  }
};

// ---------------- ADMIN ----------------

const ADMIN_CATEGORIES = {
  moderation: {
    label: "🛡️ Moderación",
    description: "Comandos exclusivos para administradores.",
    commands: [
      "ban", "unban", "kick", "softban", "timeout",
      "untimeout", "mute", "unmute", "warn", "warnings",
      "clear", "purge", "lock", "unlock", "slowmode",
      "nick", "resetnick", "voicekick", "deafen",
      "undeafen", "modlog", "reason", "massban",
      "tempban", "tempkick", "modstats", "jail",
      "unjail", "warnclear", "unwarn"
    ]
  },

  security: {
    label: "🔐 Seguridad",
    description: "AntiLink, AntiRaid, AntiNuke y logs.",
    commands: [
      "antilink", "antiraid", "antinuke", "whitelist",
      "botwhitelist", "antiwhitelist", "antichannel",
      "antirole", "protection", "security", "setlogs",
      "disablelogs", "testlogs", "logchannel", "logs",
      "audit", "auditlog", "raidstatus", "linkstatus",
      "nukestatus", "whitelistusers", "whitelistroles",
      "whitelistbots", "addwhitelist", "removewhitelist",
      "addbot", "removebot", "securityinfo",
      "protectionstatus", "antihelp"
    ]
  },

  config: {
    label: "⚙️ Configuración",
    description: "Configuración general del servidor.",
    commands: [
      "settings", "config", "setup", "welcome",
      "autorole", "setranktext", "ranktitle", "rankchannel",
      "rankmessage", "ranktest", "welcomechannel",
      "autoroleset", "ranktext", "setlogs", "disablelogs",
      "testlogs", "shopadd", "shopremove", "shopprice",
      "shopclear", "shopreset", "helpadmin", "help",
      "database", "backup", "botstatus", "activity",
      "language", "modules"
    ]
  },

  roles: {
    label: "🎭 Roles",
    description: "Administración de roles.",
    commands: [
      "roleinfo", "rolelist", "roles", "addrole",
      "removerole", "giverole", "takerole", "roleadd",
      "roleremove", "rolecreate", "roledelete", "rolecolor",
      "rolehoist", "rolemention", "roleshop", "autorole",
      "autoroleset", "rolecount", "memberroles",
      "rolesme", "myroles", "rolemembers", "rolepos",
      "roleedit", "roleperm", "rolecheck", "rolewhitelist",
      "roleprotect", "rolehelp", "roleset"
    ]
  }
};

// ============================================================
// 📋 HELP
// ============================================================

function createPublicHelp(userId) {
  const embed = new EmbedBuilder()
    .setTitle("🍥 Naruto • Centro de Ayuda")
    .setDescription(
      "Selecciona una categoría para ver los comandos disponibles.\n\n" +
      "🔹 Los comandos de administración están ocultos aquí.\n" +
      "🔹 Usa `N!helpadmin` si eres administrador."
    )
    .setFooter({
      text: "Naruto • Sistema de ayuda"
    });

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`help_public_${userId}`)
    .setPlaceholder("📚 Selecciona una categoría")
    .addOptions(
      Object.entries(PUBLIC_CATEGORIES).map(
        ([value, category]) => ({
          label: category.label.replace(/^[^\s]+\s/, ""),
          value,
          description: category.description,
          emoji: category.label.split(" ")[0]
        })
      )
    );

  const row = new ActionRowBuilder()
    .addComponents(menu);

  return {
    embeds: [embed],
    components: [row]
  };
}

function createAdminHelp(userId) {
  const embed = new EmbedBuilder()
    .setTitle("👑 Naruto • Panel Administrativo")
    .setDescription(
      "Selecciona una categoría administrativa.\n\n" +
      "🛡️ Moderación\n" +
      "🔐 Seguridad\n" +
      "⚙️ Configuración\n" +
      "🎭 Roles"
    )
    .setFooter({
      text: "Naruto • Solo administradores"
    });

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`help_admin_${userId}`)
    .setPlaceholder("👑 Selecciona una categoría")
    .addOptions(
      Object.entries(ADMIN_CATEGORIES).map(
        ([value, category]) => ({
          label: category.label.replace(/^[^\s]+\s/, ""),
          value,
          description: category.description,
          emoji: category.label.split(" ")[0]
        })
      )
    );

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(menu)
    ]
  };
}

function categoryEmbed(category) {
  const list = category.commands
    .map(cmd => `\`${PREFIX}${cmd}\``)
    .join(" • ");

  return new EmbedBuilder()
    .setTitle(category.label)
    .setDescription(
      `${category.description}\n\n${list}`
    )
    .setFooter({
      text: `Naruto • ${category.commands.length} comandos`
    });
}

// ============================================================
// 🛒 SHOP
// ============================================================

async function showShop(message) {
  const g = getGuild(message.guild.id);

  const entries = Object.entries(g.shop.roles);

  if (!entries.length) {
    return message.reply(
      "🛒 La tienda está vacía actualmente."
    );
  }

  for (const [roleId, price] of entries) {
    const role = message.guild.roles.cache.get(roleId);

    if (!role) continue;

    const embed = new EmbedBuilder()
      .setTitle("🛒 Naruto Shop")
      .setDescription(
        `🎭 **Rol:** ${role}\n` +
        `💰 **Precio:** ${price.toLocaleString()} monedas`
      )
      .setFooter({
        text: "Pulsa Comprar para adquirir el rol."
      });

    const button = new ButtonBuilder()
      .setCustomId(`shop_buy_${role.id}`)
      .setLabel("Comprar")
      .setEmoji("🛒")
      .setStyle(ButtonStyle.Success);

    await message.channel.send({
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(button)
      ]
    });
  }
}

// ============================================================
// 🎯 EVENTO READY
// ============================================================

client.once(Events.ClientReady, () => {
  console.log(
    `🍥 Naruto conectado como ${client.user.tag}`
  );

  client.user.setPresence({
    activities: [
      {
        name: "N!help",
        type: 0
      }
    ],
    status: "online"
  });
});

// ============================================================
// 👋 BIENVENIDA + AUTOROLE + ANTIRAID
// ============================================================

client.on(Events.GuildMemberAdd, async member => {
  const g = getGuild(member.guild.id);

  // AntiRaid
  if (
    member.user.bot &&
    g.antiraid.enabled &&
    !g.antiraid.botWhitelist.includes(member.id)
  ) {
    await member.ban({
      reason: "Naruto AntiRaid"
    }).catch(() => {});

    await sendLog(
      member.guild,
      "🚨 AntiRaid",
      `Se bloqueó un bot que intentó entrar al servidor.`,
      [
        {
          name: "Bot",
          value: `${member.user.tag}`,
          inline: true
        }
      ]
    );

    return;
  }

  // Autorole
  if (g.autorole.enabled && g.autorole.role) {
    const role = member.guild.roles.cache.get(
      g.autorole.role
    );

    if (role && role.editable) {
      await member.roles.add(role).catch(() => {});
    }
  }

  // Welcome
  if (g.welcome.enabled && g.welcome.channel) {
    const channel =
      member.guild.channels.cache.get(
        g.welcome.channel
      );

    if (channel?.isTextBased()) {
      await channel.send(
        `🍥 ¡Bienvenido ${member} a **${member.guild.name}**!`
      ).catch(() => {});
    }
  }

  await sendLog(
    member.guild,
    "👋 Miembro entró",
    `${member} entró al servidor.`,
    [
      {
        name: "Usuario",
        value: `${member.user.tag}`,
        inline: true
      },
      {
        name: "ID",
        value: member.id,
        inline: true
      }
    ]
  );
});

// ============================================================
// 🚪 MEMBER REMOVE
// ============================================================

client.on(Events.GuildMemberRemove, async member => {
  await sendLog(
    member.guild,
    "🚪 Miembro salió",
    `${member.user.tag} salió del servidor.`,
    [
      {
        name: "Usuario",
        value: member.user.tag,
        inline: true
      },
      {
        name: "ID",
        value: member.id,
        inline: true
      }
    ]
  );
});

// ============================================================
// 🗑️ MENSAJE BORRADO
// ============================================================

client.on(Events.MessageDelete, async message => {
  if (!message.guild) return;
  if (message.author?.bot) return;

  await sendLog(
    message.guild,
    "🗑️ Mensaje eliminado",
    `Se eliminó un mensaje en ${message.channel}.`,
    [
      {
        name: "Autor",
        value: message.author
          ? `${message.author}`
          : "Desconocido",
        inline: true
      },
      {
        name: "Canal",
        value: `${message.channel}`,
        inline: true
      },
      {
        name: "Contenido",
        value: message.content
          ? message.content.slice(0, 1000)
          : "Contenido no disponible"
      }
    ]
  );
});

// ============================================================
// ✏️ MENSAJE EDITADO
// ============================================================

client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  if (!newMessage.guild) return;
  if (newMessage.author?.bot) return;

  if (oldMessage.content === newMessage.content) return;

  await sendLog(
    newMessage.guild,
    "✏️ Mensaje editado",
    `Se editó un mensaje en ${newMessage.channel}.`,
    [
      {
        name: "Usuario",
        value: `${newMessage.author}`,
        inline: true
      },
      {
        name: "Antes",
        value: oldMessage.content
          ? oldMessage.content.slice(0, 900)
          : "No disponible"
      },
      {
        name: "Después",
        value: newMessage.content
          ? newMessage.content.slice(0, 900)
          : "No disponible"
      }
    ]
  );
});

// ============================================================
// 🎭 ROLE CREATE
// ============================================================

client.on(Events.GuildRoleCreate, async role => {
  await sendLog(
    role.guild,
    "🎭 Rol creado",
    `Se creó el rol ${role}.`,
    [
      {
        name: "Rol",
        value: role.name,
        inline: true
      },
      {
        name: "ID",
        value: role.id,
        inline: true
      }
    ]
  );

  await handleAntiNuke(
    role.guild,
    AuditLogEvent.RoleCreate,
    role.id,
    role.name
  );
});

// ============================================================
// 🗑️ ROLE DELETE
// ============================================================

client.on(Events.GuildRoleDelete, async role => {
  await sendLog(
    role.guild,
    "🗑️ Rol eliminado",
    `Se eliminó el rol **${role.name}**.`,
    [
      {
        name: "Rol",
        value: role.name,
        inline: true
      },
      {
        name: "ID",
        value: role.id,
        inline: true
      }
    ]
  );

  await handleAntiNuke(
    role.guild,
    AuditLogEvent.RoleDelete,
    role.id,
    role.name
  );
});

// ============================================================
// ✏️ ROLE UPDATE
// ============================================================

client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
  const changes = [];

  if (oldRole.name !== newRole.name) {
    changes.push({
      name: "Nombre",
      value: `${oldRole.name} → ${newRole.name}`
    });
  }

  if (oldRole.hexColor !== newRole.hexColor) {
    changes.push({
      name: "Color",
      value: `${oldRole.hexColor} → ${newRole.hexColor}`
    });
  }

  if (!changes.length) return;

  await sendLog(
    newRole.guild,
    "✏️ Rol modificado",
    `${newRole}`,
    changes
  );
});

// ============================================================
// 📁 CHANNEL CREATE
// ============================================================

client.on(Events.ChannelCreate, async channel => {
  if (!channel.guild) return;

  await sendLog(
    channel.guild,
    "📁 Canal creado",
    `${channel}`,
    [
      {
        name: "Nombre",
        value: channel.name,
        inline: true
      },
      {
        name: "ID",
        value: channel.id,
        inline: true
      }
    ]
  );

  const g = getGuild(channel.guild.id);

  if (g.antinuke.enabled && g.antinuke.protectChannels) {
    await handleAntiNuke(
      channel.guild,
      AuditLogEvent.ChannelCreate,
      channel.id,
      channel.name
    );
  }
});

// ============================================================
// 🗑️ CHANNEL DELETE
// ============================================================

client.on(Events.ChannelDelete, async channel => {
  if (!channel.guild) return;

  await sendLog(
    channel.guild,
    "🗑️ Canal eliminado",
    `Se eliminó **${channel.name}**.`,
    [
      {
        name: "ID",
        value: channel.id,
        inline: true
      }
    ]
  );

  const g = getGuild(channel.guild.id);

  if (g.antinuke.enabled && g.antinuke.protectChannels) {
    await handleAntiNuke(
      channel.guild,
      AuditLogEvent.ChannelDelete,
      channel.id,
      channel.name
    );
  }
});

// ============================================================
// ✏️ CHANNEL UPDATE
// ============================================================

client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
  if (!newChannel.guild) return;

  const changes = [];

  if (oldChannel.name !== newChannel.name) {
    changes.push({
      name: "Nombre",
      value: `${oldChannel.name} → ${newChannel.name}`
    });
  }

  if (
    oldChannel.parentId !== newChannel.parentId
  ) {
    changes.push({
      name: "Categoría",
      value: "Categoría modificada"
    });
  }

  if (!changes.length) return;

  await sendLog(
    newChannel.guild,
    "✏️ Canal modificado",
    `${newChannel}`,
    changes
  );
});

// ============================================================
// 🔨 BAN
// ============================================================

client.on(Events.GuildBanAdd, async (ban) => {
  await sendLog(
    ban.guild,
    "🔨 Usuario baneado",
    `${ban.user.tag} fue baneado.`,
    [
      {
        name: "Usuario",
        value: ban.user.tag,
        inline: true
      },
      {
        name: "ID",
        value: ban.user.id,
        inline: true
      }
    ]
  );
});

// ============================================================
// 🔓 UNBAN
// ============================================================

client.on(Events.GuildBanRemove, async (ban) => {
  await sendLog(
    ban.guild,
    "🔓 Usuario desbaneado",
    `${ban.user.tag} fue desbaneado.`,
    [
      {
        name: "Usuario",
        value: ban.user.tag,
        inline: true
      },
      {
        name: "ID",
        value: ban.user.id,
        inline: true
      }
    ]
  );
});

// ============================================================
// 👤 MEMBER UPDATE
// ============================================================

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  const changes = [];

  if (oldMember.nickname !== newMember.nickname) {
    changes.push({
      name: "Apodo",
      value:
        `${oldMember.nickname || "Ninguno"} → ` +
        `${newMember.nickname || "Ninguno"}`
    });
  }

  const oldRoles = oldMember.roles.cache;
  const newRoles = newMember.roles.cache;

  const addedRoles = newRoles.filter(
    r => !oldRoles.has(r.id)
  );

  const removedRoles = oldRoles.filter(
    r => !newRoles.has(r.id)
  );

  if (addedRoles.size) {
    changes.push({
      name: "Rol añadido",
      value: addedRoles.map(r => `${r}`).join(", ")
    });
  }

  if (removedRoles.size) {
    changes.push({
      name: "Rol eliminado",
      value: removedRoles.map(r => `${r}`).join(", ")
    });
  }

  if (
    oldMember.communicationDisabledUntilTimestamp !==
    newMember.communicationDisabledUntilTimestamp
  ) {
    changes.push({
      name: "Timeout",
      value: newMember.communicationDisabledUntilTimestamp
        ? "Aplicado"
        : "Quitado"
    });
  }

  if (!changes.length) return;

  await sendLog(
    newMember.guild,
    "👤 Miembro modificado",
    `${newMember}`,
    changes
  );
});

// ============================================================
// 🎙️ VOICE LOGS
// ============================================================

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  if (!newState.guild) return;

  if (!oldState.channelId && newState.channelId) {
    await sendLog(
      newState.guild,
      "🎙️ Entró a voz",
      `${newState.member} entró a ${newState.channel}.`
    );
  }

  if (oldState.channelId && !newState.channelId) {
    await sendLog(
      newState.guild,
      "🎙️ Salió de voz",
      `${oldState.member} salió de ${oldState.channel}.`
    );
  }

  if (
    oldState.channelId &&
    newState.channelId &&
    oldState.channelId !== newState.channelId
  ) {
    await sendLog(
      newState.guild,
      "🔄 Cambió de canal de voz",
      `${newState.member} cambió de canal.`
    );
  }
});

// ============================================================
// 💬 MENSAJES / COMANDOS
// ============================================================

client.on(Events.MessageCreate, async message => {
  if (!message.guild) return;
  if (message.author.bot) return;

  const g = getGuild(message.guild.id);

  // ==========================================================
  // 🔗 ANTILINK
  // ==========================================================

  if (
    g.antilink.enabled &&
    !isAdmin(message.member) &&
    containsLink(message.content) &&
    !whitelistedLink(
      message.content,
      g.antilink.whitelist
    )
  ) {
    await message.delete().catch(() => {});

    if (message.member.moderatable) {
      await message.member.timeout(
        g.antilink.timeout,
        "Naruto AntiLink"
      ).catch(() => {});
    }

    await sendLog(
      message.guild,
      "🔗 AntiLink",
      `${message.author} intentó enviar un enlace.`,
      [
        {
          name: "Canal",
          value: `${message.channel}`,
          inline: true
        }
      ]
    );

    return;
  }

  // ==========================================================
  // PREFIX
  // ==========================================================

  if (!message.content.startsWith(PREFIX)) {
    await addXP(message.member, 5);
    return;
  }

  const args = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/);

  const command = args.shift()?.toLowerCase();

  if (!command) return;

  await addXP(message.member, 2);

  // ==========================================================
  // HELP
  // ==========================================================

  if (command === "help") {
    return message.reply(
      createPublicHelp(message.author.id)
    );
  }

  if (command === "helpadmin") {
    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Necesitas permisos de administrador."
      );
    }

    return message.reply(
      createAdminHelp(message.author.id)
    );
  }

  // ==========================================================
  // INTERACCIÓN DE CATEGORÍAS
  // ==========================================================

  // ==========================================================
  // 💰 ECONOMÍA
  // ==========================================================

  if (
    [
      "balance", "money", "cash", "wallet", "coins",
      "mymoney", "wealth", "economy", "funds", "capital",
      "earnings", "salarycheck", "cashinfo",
      "balanceinfo", "income", "bank"
    ].includes(command)
  ) {
    const user = getUser(message.author.id);

    return message.reply(
      `💰 **${message.author.username}**\n\n` +
      `💵 Dinero: **${user.money.toLocaleString()}**\n` +
      `🏦 Banco: **${user.bank.toLocaleString()}**\n` +
      `💎 Total: **${(user.money + user.bank).toLocaleString()}**`
    );
  }

  if (command === "daily") {
    const user = getUser(message.author.id);
    const now = Date.now();

    if (now - user.lastDaily < 24 * 60 * 60 * 1000) {
      return message.reply(
        `⏰ Ya reclamaste tu recompensa diaria.\n` +
        `Vuelve en **${duration(
          24 * 60 * 60 * 1000 -
          (now - user.lastDaily)
        )}**.`
      );
    }

    user.money += 500;
    user.lastDaily = now;

    saveDB();

    return message.reply(
      "🎁 Has recibido **500 monedas** por tu recompensa diaria."
    );
  }

  if (
    ["work", "job", "salary", "paycheck"].includes(command)
  ) {
    const user = getUser(message.author.id);
    const now = Date.now();

    if (now - user.lastWork < 60 * 60 * 1000) {
      return message.reply(
        `⏰ Ya trabajaste recientemente.`
      );
    }

    const amount =
      Math.floor(Math.random() * 301) + 200;

    user.money += amount;
    user.lastWork = now;

    saveDB();

    return message.reply(
      `💼 Trabajaste y ganaste **${amount} monedas**.`
    );
  }

  if (
    ["pay", "transfer", "give"].includes(command)
  ) {
    const target =
      message.mentions.users.first();

    const amount = Number(args[1] || args[0]);

    if (!target) {
      return message.reply(
        `❌ Usa: \`${PREFIX}pay @usuario cantidad\``
      );
    }

    if (
      target.id === message.author.id ||
      target.bot
    ) {
      return message.reply(
        "❌ Ese usuario no puede recibir el dinero."
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return message.reply(
        "❌ Cantidad inválida."
      );
    }

    const sender = getUser(message.author.id);

    if (sender.money < amount) {
      return message.reply(
        "❌ No tienes suficiente dinero."
      );
    }

    const receiver = getUser(target.id);

    sender.money -= amount;
    receiver.money += amount;

    saveDB();

    return message.reply(
      `💸 Enviaste **${amount.toLocaleString()}** monedas a ${target}.`
    );
  }

  if (
    ["deposit", "depositall"].includes(command)
  ) {
    const user = getUser(message.author.id);

    let amount =
      command === "depositall"
        ? user.money
        : Number(args[0]);

    if (!Number.isFinite(amount) || amount <= 0) {
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

    saveDB();

    return message.reply(
      `🏦 Depositaste **${amount.toLocaleString()}** monedas.`
    );
  }

  if (
    ["withdraw", "withdrawall"].includes(command)
  ) {
    const user = getUser(message.author.id);

    let amount =
      command === "withdrawall"
        ? user.bank
        : Number(args[0]);

    if (!Number.isFinite(amount) || amount <= 0) {
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

    saveDB();

    return message.reply(
      `💵 Retiraste **${amount.toLocaleString()}** monedas.`
    );
  }

  if (command === "richest") {
    const list = Object.entries(db.users)
      .sort((a, b) =>
        (b[1].money + b[1].bank) -
        (a[1].money + a[1].bank)
      )
      .slice(0, 10);

    let text = "🏆 **Usuarios con más dinero**\n\n";

    for (let i = 0; i < list.length; i++) {
      const user = client.users.cache.get(list[i][0]);
      const data = list[i][1];

      text +=
        `**${i + 1}.** ${user?.username || list[i][0]} — ` +
        `💰 ${(data.money + data.bank).toLocaleString()}\n`;
    }

    return replyLong(message, text);
  }

  if (command === "fortune") {
    const amount =
      Math.floor(Math.random() * 1000) + 1;

    return message.reply(
      `🔮 Tu fortuna dice que hoy tendrás **${amount}** monedas de suerte.`
    );
  }

  // ==========================================================
  // 🛒 SHOP
  // ==========================================================

  if (
    [
      "shop", "tienda", "nshop", "store", "market",
      "marketplace", "productos", "catalogo", "precios",
      "shoplist", "shopinfo", "items", "item", "comprar",
      "buy", "purchase", "productlist", "shopmenu",
      "shopping", "storelist", "roleshop", "rolshop",
      "marketlist", "shoproles", "rolestienda"
    ].includes(command)
  ) {
    return showShop(message);
  }

  if (
    [
      "myroles", "owned", "inventory", "inv"
    ].includes(command)
  ) {
    const roles = message.member.roles.cache
      .filter(r => r.id !== message.guild.id)
      .map(r => r.name);

    return replyLong(
      message,
      `🎭 **Tus roles**\n\n` +
      (roles.length
        ? roles.map(r => `• ${r}`).join("\n")
        : "No tienes roles.")
    );
  }

  // ==========================================================
  // 🏆 RANK
  // ==========================================================

  if (
    [
      "rank", "level", "rankcard", "mylevel",
      "progress", "nextlevel", "guildrank",
      "xpinfo", "stats", "progressbar",
      "levelinfo", "xpneeded", "rankinfo",
      "xprank", "levelrank", "nlevel",
      "nprogress", "ninjarank"
    ].includes(command)
  ) {
    const user = getUser(message.author.id);
    const needed = getNeededXP(user.level);

    const percent =
      Math.floor((user.xp / needed) * 10);

    const bar =
      "█".repeat(percent) +
      "░".repeat(10 - percent);

    const g = getGuild(message.guild.id);

    return message.reply(
      replaceRankText(
        g.rank.text,
        message.member,
        user
      ) +
      `\n\n📊 Progreso: **[${bar}]**`
    );
  }

  if (
    [
      "xp", "myxp", "xptop", "leaderboard",
      "top", "ranking", "globalrank",
      "ranktop"
    ].includes(command)
  ) {
    const list = Object.entries(db.users)
      .sort((a, b) => {
        if (b[1].level !== a[1].level) {
          return b[1].level - a[1].level;
        }

        return b[1].xp - a[1].xp;
      })
      .slice(0, 10);

    let text = "🏆 **Ranking de Ninjas**\n\n";

    for (let i = 0; i < list.length; i++) {
      const user = client.users.cache.get(list[i][0]);

      text +=
        `**${i + 1}.** ${user?.username || list[i][0]} — ` +
        `Nivel **${list[i][1].level}** • ` +
        `XP **${list[i][1].xp}**\n`;
    }

    return replyLong(message, text);
  }

  if (command === "rewards") {
    return message.reply(
      "🎁 Las recompensas dependen de los niveles configurados por el sistema."
    );
  }

  // ==========================================================
  // 👤 SOCIAL
  // ==========================================================

  if (
    [
      "profile", "userprofile", "profileinfo",
      "aboutme", "memberinfo", "accountinfo",
      "userstats", "identity", "account",
      "social", "user", "me"
    ].includes(command)
  ) {
    const target =
      message.mentions.users.first() ||
      message.author;

    const user = getUser(target.id);
    const member =
      message.guild.members.cache.get(target.id);

    return message.reply(
      `👤 **Perfil de ${target.username}**\n\n` +
      `🆔 ID: **${target.id}**\n` +
      `🏆 Nivel: **${user.level}**\n` +
      `⭐ XP: **${user.xp}**\n` +
      `💰 Dinero: **${user.money}**\n` +
      `❤️ Reputación: **${user.reps}**\n` +
      `📝 Bio: ${user.bio || "Sin bio"}\n` +
      `📅 Entró: ${member?.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : "Desconocido"}`
    );
  }

  if (
    ["avatar", "banner"].includes(command)
  ) {
    const target =
      message.mentions.users.first() ||
      message.author;

    const url =
      command === "avatar"
        ? target.displayAvatarURL({
            size: 1024,
            extension: "png"
          })
        : target.bannerURL({
            size: 1024,
            extension: "png"
          });

    if (!url) {
      return message.reply(
        "❌ Este usuario no tiene banner."
      );
    }

    return message.reply(url);
  }

  if (command === "bio") {
    const target =
      message.mentions.users.first() ||
      message.author;

    const user = getUser(target.id);

    return message.reply(
      `📝 Bio de **${target.username}**:\n${user.bio || "Sin bio"}`
    );
  }

  if (command === "setbio") {
    const text = args.join(" ");

    if (!text) {
      return message.reply(
        `❌ Usa: \`${PREFIX}setbio tu texto\``
      );
    }

    if (text.length > 300) {
      return message.reply(
        "❌ La bio no puede superar 300 caracteres."
      );
    }

    getUser(message.author.id).bio = text;
    saveDB();

    return message.reply(
      "✅ Tu bio fue actualizada."
    );
  }

  if (
    ["rep", "reps", "reputation", "repcount"].includes(command)
  ) {
    const target =
      message.mentions.users.first() ||
      message.author;

    if (target.id === message.author.id) {
      return message.reply(
        "❌ No puedes darte reputación a ti mismo."
      );
    }

    getUser(target.id).reps++;
    saveDB();

    return message.reply(
      `❤️ ${message.author} dio reputación a ${target}.`
    );
  }

  if (
    [
      "joined", "created", "id", "mention",
      "member", "whois"
    ].includes(command)
  ) {
    const target =
      message.mentions.users.first() ||
      message.author;

    const member =
      message.guild.members.cache.get(target.id);

    return message.reply(
      `👤 **${target.username}**\n\n` +
      `🆔 ID: ${target.id}\n` +
      `📅 Cuenta: <t:${Math.floor(target.createdTimestamp / 1000)}:F>\n` +
      `👋 Entrada: ${
        member?.joinedTimestamp
          ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
          : "Desconocida"
      }\n` +
      `📌 Mención: ${target}`
    );
  }

  // ==========================================================
  // 🎮 DIVERSIÓN
  // ==========================================================

  if (command === "8ball" || command === "magic8") {
    const answers = [
      "🔮 Sí.",
      "🔮 No.",
      "🔮 Probablemente.",
      "🔮 No estoy seguro.",
      "🔮 Pregunta más tarde.",
      "🔮 Definitivamente."
    ];

    return message.reply(
      answers[Math.floor(Math.random() * answers.length)]
    );
  }

  if (
    ["dice", "roll"].includes(command)
  ) {
    return message.reply(
      `🎲 Sacaste un **${Math.floor(Math.random() * 6) + 1}**.`
    );
  }

  if (command === "coinflip" || command === "flip") {
    return message.reply(
      Math.random() < 0.5
        ? "🪙 **Cara**"
        : "🪙 **Cruz**"
    );
  }

  if (command === "rps") {
    const choices = [
      "🪨 Piedra",
      "📄 Papel",
      "✂️ Tijera"
    ];

    return message.reply(
      `🎮 Elegiste al azar: **${
        choices[Math.floor(Math.random() * choices.length)]
      }**`
    );
  }

  if (command === "choose") {
    if (args.length < 2) {
      return message.reply(
        `❌ Usa: \`${PREFIX}choose opción1 opción2 ...\``
      );
    }

    return message.reply(
      `🎯 Elijo: **${
        args[Math.floor(Math.random() * args.length)]
      }**`
    );
  }

  if (command === "reverse") {
    const text = args.join(" ");

    return message.reply(
      text.split("").reverse().join("")
    );
  }

  if (command === "say") {
    const text = args.join(" ");

    if (!text) return;

    return message.channel.send(text);
  }

  if (
    ["random", "number", "numberguess"].includes(command)
  ) {
    return message.reply(
      `🎯 Número aleatorio: **${
        Math.floor(Math.random() * 100) + 1
      }**`
    );
  }

  if (command === "truth") {
    const truths = [
      "¿Cuál es tu videojuego favorito?",
      "¿Cuál es tu comida favorita?",
      "¿Qué superpoder elegirías?",
      "¿Cuál es tu personaje favorito?"
    ];

    return message.reply(
      `🤔 ${truths[Math.floor(Math.random() * truths.length)]}`
    );
  }

  if (command === "dare") {
    const dares = [
      "🎯 Escribe una frase usando solo emojis.",
      "🎯 Di tu personaje favorito de anime.",
      "🎯 Escribe una palabra al revés.",
      "🎯 Cuenta un chiste."
    ];

    return message.reply(
      dares[Math.floor(Math.random() * dares.length)]
    );
  }

  if (command === "joke") {
    return message.reply(
      "😂 ¿Qué hace un ninja cuando tiene hambre? ¡Busca ramen!"
    );
  }

  if (command === "compliment") {
    return message.reply(
      `✨ ${message.author}, tienes buena energía ninja.`
    );
  }

  if (command === "roast") {
    return message.reply(
      `🔥 ${message.author}, tu chakra necesita una actualización. 😂`
    );
  }

  if (command === "rate") {
    return message.reply(
      `⭐ Le doy a esa idea un **${Math.floor(Math.random() * 101)}/100**.`
    );
  }

  if (
    ["meme", "cat", "ninja", "luck", "funfact",
     "magic", "clap", "yesno", "hi", "ramen",
     "jutsu"].includes(command)
  ) {
    const responses = {
      meme: "😂 Naruto entrando al servidor: *dattebayo*.",
      cat: "🐱 Nyaaa.",
      ninja: "🥷 ¡Modo ninja activado!",
      luck: "🍀 ¡Que tengas suerte, ninja!",
      funfact: "🧠 Dato: Naruto tiene una gran cantidad de referencias a la cultura japonesa.",
      magic: "✨ ¡POOF! Magia ninja.",
      clap: "👏👏👏",
      yesno: Math.random() < 0.5 ? "✅ Sí" : "❌ No",
      hi: "👋 ¡Hola, ninja!",
      ramen: "🍜 ¡RAMEN!",
      jutsu: "🌀 ¡Jutsu de Clones de Sombra!"
    };

    return message.reply(
      responses[command]
    );
  }

  // ==========================================================
  // 🏠 SERVIDOR
  // ==========================================================

  if (
    [
      "serverinfo", "guildinfo", "server", "info",
      "serverstats", "stats"
    ].includes(command)
  ) {
    const guild = message.guild;

    return message.reply(
      `🏠 **${guild.name}**\n\n` +
      `👑 Dueño: <@${guild.ownerId}>\n` +
      `👥 Miembros: **${guild.memberCount}**\n` +
      `🎭 Roles: **${guild.roles.cache.size}**\n` +
      `📁 Canales: **${guild.channels.cache.size}**\n` +
      `😀 Emojis: **${guild.emojis.cache.size}**\n` +
      `🚀 Boosts: **${guild.premiumSubscriptionCount || 0}**\n` +
      `🆔 ID: **${guild.id}**`
    );
  }

  if (
    ["servericon", "icon"].includes(command)
  ) {
    return message.reply(
      message.guild.iconURL({
        size: 1024
      }) || "❌ El servidor no tiene icono."
    );
  }

  if (
    ["membercount", "members"].includes(command)
  ) {
    return message.reply(
      `👥 Hay **${message.guild.memberCount}** miembros.`
    );
  }

  if (
    ["roles", "rolelist"].includes(command)
  ) {
    return replyLong(
      message,
      "🎭 **Roles:**\n\n" +
      message.guild.roles.cache
        .sort((a, b) => b.position - a.position)
        .map(r => `• ${r.name}`)
        .join("\n")
    );
  }

  if (command === "emojis") {
    return replyLong(
      message,
      "😀 **Emojis:**\n\n" +
      (
        message.guild.emojis.cache.size
          ? message.guild.emojis.cache
              .map(e => `${e}`)
              .join(" ")
          : "No hay emojis."
      )
    );
  }

  if (command === "channels") {
    return replyLong(
      message,
      "📁 **Canales:**\n\n" +
      message.guild.channels.cache
        .map(c => `• ${c.name}`)
        .join("\n")
    );
  }

  if (command === "channelinfo") {
    return message.reply(
      `📁 **${message.channel.name}**\n` +
      `🆔 ${message.channel.id}\n` +
      `📌 Tipo: ${message.channel.type}`
    );
  }

  if (command === "ping") {
    return message.reply(
      `🏓 Pong! **${client.ws.ping}ms**`
    );
  }

  if (
    ["owner", "serverowner"].includes(command)
  ) {
    return message.reply(
      `👑 Dueño: <@${message.guild.ownerId}>`
    );
  }

  if (
    ["createdserver", "datecreated"].includes(command)
  ) {
    return message.reply(
      `📅 Servidor creado: <t:${Math.floor(
        message.guild.createdTimestamp / 1000
      )}:F>`
    );
  }

  if (
    ["serverid", "guildid"].includes(command)
  ) {
    return message.reply(
      `🆔 ID del servidor: **${message.guild.id}**`
    );
  }

  if (
    ["rolescount", "rolecount"].includes(command)
  ) {
    return message.reply(
      `🎭 Roles: **${message.guild.roles.cache.size}**`
    );
  }

  if (command === "channelcount") {
    return message.reply(
      `📁 Canales: **${message.guild.channels.cache.size}**`
    );
  }

  if (command === "emojicount") {
    return message.reply(
      `😀 Emojis: **${message.guild.emojis.cache.size}**`
    );
  }

  if (
    ["boosts", "boostinfo"].includes(command)
  ) {
    return message.reply(
      `🚀 Boosts: **${message.guild.premiumSubscriptionCount || 0}**`
    );
  }

  if (command === "invite") {
    const invite =
      await message.channel.createInvite({
        maxAge: 86400,
        maxUses: 0
      }).catch(() => null);

    if (!invite) {
      return message.reply(
        "❌ No puedo crear una invitación en este canal."
      );
    }

    return message.reply(
      `🔗 Invitación válida durante 24 horas:\n${invite.url}`
    );
  }

  // ==========================================================
  // 👑 ADMINISTRACIÓN
  // ==========================================================

  const adminCommands = [
    ...ADMIN_CATEGORIES.moderation.commands,
    ...ADMIN_CATEGORIES.security.commands,
    ...ADMIN_CATEGORIES.config.commands,
    ...ADMIN_CATEGORIES.roles.commands
  ];

  if (adminCommands.includes(command)) {
    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Este comando es exclusivo para administradores."
      );
    }
  }

  // ==========================================================
  // 🛡️ MODERACIÓN
  // ==========================================================

  if (
    ["ban", "softban"].includes(command)
  ) {
    const member =
      message.mentions.members.first();

    if (!member) {
      return message.reply(
        `❌ Usa: \`${PREFIX}${command} @usuario [razón]\``
      );
    }

    if (!member.bannable) {
      return message.reply(
        "❌ No puedo banear a ese usuario."
      );
    }

    const reason =
      args.slice(1).join(" ") ||
      "Sin razón";

    await member.ban({
      reason
    }).catch(() => null);

    if (command === "softban") {
      await message.guild.members.unban(
        member.id
      ).catch(() => {});
    }

    return message.reply(
      `🔨 ${member.user.tag} fue ${command === "softban" ? "softbaneado" : "baneado"}.`
    );
  }

  if (command === "unban") {
    const id = args[0];

    if (!id) {
      return message.reply(
        `❌ Usa: \`${PREFIX}unban ID\``
      );
    }

    await message.guild.members.unban(id)
      .catch(() => null);

    return message.reply(
      `🔓 Se intentó desbanear a **${id}**.`
    );
  }

  if (
    ["kick", "tempkick"].includes(command)
  ) {
    const member =
      message.mentions.members.first();

    if (!member || !member.kickable) {
      return message.reply(
        "❌ No puedo expulsar a ese usuario."
      );
    }

    await member.kick(
      args.slice(1).join(" ") ||
      "Sin razón"
    ).catch(() => {});

    return message.reply(
      `👢 ${member.user.tag} fue expulsado.`
    );
  }

  if (
    ["timeout", "mute", "jail"].includes(command)
  ) {
    const member =
      message.mentions.members.first();

    const time =
      parseTime(args[1]) ||
      10 * 60 * 1000;

    if (!member?.moderatable) {
      return message.reply(
        "❌ No puedo aplicar timeout a ese usuario."
      );
    }

    await member.timeout(
      Math.min(time, 28 * 24 * 60 * 60 * 1000),
      args.slice(2).join(" ") || "Moderación"
    ).catch(() => {});

    return message.reply(
      `🔇 ${member} recibió timeout durante **${duration(time)}**.`
    );
  }

  if (
    ["untimeout", "unmute", "unjail"].includes(command)
  ) {
    const member =
      message.mentions.members.first();

    if (!member) {
      return message.reply(
        `❌ Usa: \`${PREFIX}${command} @usuario\``
      );
    }

    await member.timeout(null)
      .catch(() => {});

    return message.reply(
      `🔊 Timeout eliminado de ${member}.`
    );
  }

  if (command === "warn") {
    const member =
      message.mentions.members.first();

    if (!member) {
      return message.reply(
        `❌ Usa: \`${PREFIX}warn @usuario razón\``
      );
    }

    const user = getUser(member.id);

    user.warnings++;

    saveDB();

    await sendLog(
      message.guild,
      "⚠️ Advertencia",
      `${member} recibió una advertencia.`,
      [
        {
          name: "Razón",
          value: args.slice(1).join(" ") || "Sin razón"
        }
      ]
    );

    return message.reply(
      `⚠️ ${member} recibió una advertencia.\n` +
      `Total: **${user.warnings}**`
    );
  }

  if (
    ["warnings", "warnclear", "unwarn"].includes(command)
  ) {
    const member =
      message.mentions.members.first();

    if (!member) {
      return message.reply(
        `❌ Menciona a un usuario.`
      );
    }

    const user = getUser(member.id);

    if (
      command === "warnings"
    ) {
      return message.reply(
        `⚠️ ${member} tiene **${user.warnings}** advertencias.`
      );
    }

    user.warnings = 0;
    saveDB();

    return message.reply(
      `✅ Advertencias de ${member} eliminadas.`
    );
  }

  if (
    ["clear", "purge"].includes(command)
  ) {
    const amount = Number(args[0]);

    if (
      !Number.isInteger(amount) ||
      amount < 1 ||
      amount > 100
    ) {
      return message.reply(
        `❌ Usa una cantidad entre 1 y 100.`
      );
    }

    const deleted =
      await message.channel.bulkDelete(
        amount,
        true
      ).catch(() => null);

    return message.channel.send(
      `🧹 Eliminé **${deleted?.size || 0}** mensajes.`
    );
  }

  if (
    ["lock", "unlock"].includes(command)
  ) {
    const everyone =
      message.guild.roles.everyone;

    await message.channel.permissionOverwrites.edit(
      everyone,
      {
        SendMessages:
          command === "unlock"
            ? null
            : false
      }
    );

    return message.reply(
      command === "lock"
        ? "🔒 Canal bloqueado."
        : "🔓 Canal desbloqueado."
    );
  }

  if (command === "slowmode") {
    const seconds = Number(args[0]);

    if (
      !Number.isInteger(seconds) ||
      seconds < 0 ||
      seconds > 21600
    ) {
      return message.reply(
        "❌ Usa un valor entre 0 y 21600 segundos."
      );
    }

    if (
      typeof message.channel.setRateLimitPerUser !==
      "function"
    ) {
      return message.reply(
        "❌ Este canal no admite slowmode."
      );
    }

    await message.channel.setRateLimitPerUser(
      seconds
    );

    return message.reply(
      `🐌 Slowmode establecido en **${seconds}s**.`
    );
  }

  if (
    ["nick", "resetnick"].includes(command)
  ) {
    const member =
      message.mentions.members.first();

    if (!member) {
      return message.reply(
        `❌ Menciona un usuario.`
      );
    }

    if (command === "resetnick") {
      await member.setNickname(null).catch(() => {});

      return message.reply(
        `✅ Apodo de ${member} restablecido.`
      );
    }

    const nick =
      args.slice(1).join(" ");

    if (!nick) {
      return message.reply(
        `❌ Usa: \`${PREFIX}nick @usuario NuevoNombre\``
      );
    }

    await member.setNickname(nick)
      .catch(() => {});

    return message.reply(
      `✏️ Apodo cambiado a **${nick}**.`
    );
  }

  if (command === "voicekick") {
    const member =
      message.mentions.members.first();

    if (!member?.voice?.channel) {
      return message.reply(
        "❌ Ese usuario no está en voz."
      );
    }

    await member.voice.disconnect()
      .catch(() => {});

    return message.reply(
      `🎙️ ${member} fue desconectado de voz.`
    );
  }

  if (
    ["deafen", "undeafen"].includes(command)
  ) {
    const member =
      message.mentions.members.first();

    if (!member?.voice?.channel) {
      return message.reply(
        "❌ Ese usuario no está en voz."
      );
    }

    await member.voice.setDeaf(
      command === "deafen"
    ).catch(() => {});

    return message.reply(
      command === "deafen"
        ? `🔇 ${member} fue ensordecido.`
        : `🔊 ${member} dejó de estar ensordecido.`
    );
  }

  if (
    ["modlog", "modstats"].includes(command)
  ) {
    return message.reply(
      `🛡️ **Moderación**\n\n` +
      `⚠️ Sistema de advertencias activo.\n` +
      `🧹 Purga disponible.\n` +
      `🔇 Timeout disponible.\n` +
      `🔨 Ban/Kick disponibles.`
    );
  }

  if (command === "reason") {
    return message.reply(
      "📝 Puedes colocar la razón después del usuario en los comandos de moderación."
    );
  }

  if (command === "massban") {
    const members =
      message.mentions.members;

    if (!members.size) {
      return message.reply(
        `❌ Menciona los usuarios que quieres banear.`
      );
    }

    let count = 0;

    for (const member of members.values()) {
      if (
        member.bannable &&
        member.id !== message.author.id
      ) {
        await member.ban({
          reason: "Massban"
        }).catch(() => {});

        count++;
      }
    }

    return message.reply(
      `🔨 Se procesaron **${count}** usuarios.`
    );
  }

  if (command === "tempban") {
    const member =
      message.mentions.members.first();

    const time =
      parseTime(args[1]);

    if (!member || !time) {
      return message.reply(
        `❌ Usa: \`${PREFIX}tempban @usuario 10m\``
      );
    }

    if (!member.bannable) {
      return message.reply(
        "❌ No puedo banear a ese usuario."
      );
    }

    await member.ban({
      reason: "Tempban"
    });

    setTimeout(async () => {
      await message.guild.members.unban(
        member.id
      ).catch(() => {});
    }, time);

    return message.reply(
      `🔨 ${member.user.tag} fue baneado durante **${duration(time)}**.`
    );
  }

  // ==========================================================
  // 🔐 SEGURIDAD
  // ==========================================================

  if (command === "antilink") {
    const action = args[0]?.toLowerCase();

    if (action === "on") {
      g.antilink.enabled = true;
      saveDB();

      return message.reply(
        "🔗 AntiLink activado."
      );
    }

    if (action === "off") {
      g.antilink.enabled = false;
      saveDB();

      return message.reply(
        "🔗 AntiLink desactivado."
      );
    }

    if (action === "add") {
      const domain = args[1];

      if (!domain) {
        return message.reply(
          `❌ Usa: \`${PREFIX}antilink add discord.gg\``
        );
      }

      if (!g.antilink.whitelist.includes(domain)) {
        g.antilink.whitelist.push(domain);
      }

      saveDB();

      return message.reply(
        `✅ **${domain}** añadido a la whitelist.`
      );
    }

    if (action === "remove") {
      const domain = args[1];

      g.antilink.whitelist =
        g.antilink.whitelist.filter(
          x => x !== domain
        );

      saveDB();

      return message.reply(
        `✅ **${domain}** eliminado de la whitelist.`
      );
    }

    return message.reply(
      `🔗 AntiLink: **${g.antilink.enabled ? "ON" : "OFF"}**\n` +
      `📝 Whitelist: ${g.antilink.whitelist.length}`
    );
  }

  if (command === "antiraid") {
    const action = args[0]?.toLowerCase();

    if (action === "on") {
      g.antiraid.enabled = true;
      saveDB();

      return message.reply(
        "🚨 AntiRaid activado."
      );
    }

    if (action === "off") {
      g.antiraid.enabled = false;
      saveDB();

      return message.reply(
        "🚨 AntiRaid desactivado."
      );
    }

    if (action === "add") {
      const id =
        cleanMention(args[1]) || args[1];

      if (!id) {
        return message.reply(
          `❌ Usa: \`${PREFIX}antiraid add ID_BOT\``
        );
      }

      if (!g.antiraid.botWhitelist.includes(id)) {
        g.antiraid.botWhitelist.push(id);
      }

      saveDB();

      return message.reply(
        "✅ Bot añadido a la whitelist."
      );
    }

    if (action === "remove") {
      const id =
        cleanMention(args[1]) || args[1];

      g.antiraid.botWhitelist =
        g.antiraid.botWhitelist.filter(
          x => x !== id
        );

      saveDB();

      return message.reply(
        "✅ Bot eliminado de la whitelist."
      );
    }

    return message.reply(
      `🚨 AntiRaid: **${g.antiraid.enabled ? "ON" : "OFF"}**`
    );
  }

  if (command === "antinuke") {
    const action = args[0]?.toLowerCase();

    if (action === "on") {
      g.antinuke.enabled = true;
      saveDB();

      return message.reply(
        "🛡️ Anti-Nuke activado."
      );
    }

    if (action === "off") {
      g.antinuke.enabled = false;
      saveDB();

      return message.reply(
        "🛡️ Anti-Nuke desactivado."
      );
    }

    if (action === "status") {
      return message.reply(
        `🛡️ **Anti-Nuke**\n\n` +
        `Estado: **${g.antinuke.enabled ? "ON" : "OFF"}**\n` +
        `📁 Canales: **${g.antinuke.protectChannels ? "ON" : "OFF"}**\n` +
        `🎭 Roles: **${g.antinuke.protectRoles ? "ON" : "OFF"}**`
      );
    }

    return message.reply(
      `🛡️ Anti-Nuke: **${g.antinuke.enabled ? "ON" : "OFF"}**`
    );
  }

  if (
    ["protection", "security", "securityinfo",
     "protectionstatus", "antihelp"].includes(command)
  ) {
    return message.reply(
      `🔐 **Naruto Security**\n\n` +
      `🔗 AntiLink: **${g.antilink.enabled ? "ON" : "OFF"}**\n` +
      `🚨 AntiRaid: **${g.antiraid.enabled ? "ON" : "OFF"}**\n` +
      `🛡️ AntiNuke: **${g.antinuke.enabled ? "ON" : "OFF"}**\n` +
      `📝 Logs: **${g.logsChannel ? "ON" : "OFF"}**`
    );
  }

  if (
    ["antichannel", "antirole"].includes(command)
  ) {
    const action = args[0]?.toLowerCase();

    const property =
      command === "antichannel"
        ? "protectChannels"
        : "protectRoles";

    if (action === "on") {
      g.antinuke[property] = true;
    } else if (action === "off") {
      g.antinuke[property] = false;
    } else {
      return message.reply(
        `Estado: **${g.antinuke[property] ? "ON" : "OFF"}**`
      );
    }

    saveDB();

    return message.reply(
      `✅ Protección actualizada.`
    );
  }

  if (
    ["whitelist", "addwhitelist"].includes(command)
  ) {
    const type = args[0]?.toLowerCase();
    const target = args[1];

    if (type === "user") {
      const id =
        cleanMention(target) || target;

      if (!id) {
        return message.reply(
          `❌ Usa: \`${PREFIX}whitelist user @usuario\``
        );
      }

      if (
        !g.antinuke.whitelistUsers.includes(id)
      ) {
        g.antinuke.whitelistUsers.push(id);
      }

      saveDB();

      return message.reply(
        "✅ Usuario añadido a Anti-Nuke whitelist."
      );
    }

    if (type === "role") {
      const id =
        cleanMention(target) || target;

      if (
        !g.antinuke.whitelistRoles.includes(id)
      ) {
        g.antinuke.whitelistRoles.push(id);
      }

      saveDB();

      return message.reply(
        "✅ Rol añadido a Anti-Nuke whitelist."
      );
    }

    return message.reply(
      `❌ Usa \`${PREFIX}whitelist user @usuario\` o \`${PREFIX}whitelist role @rol\``
    );
  }

  if (command === "removewhitelist") {
    const type = args[0]?.toLowerCase();
    const id =
      cleanMention(args[1]) || args[1];

    if (type === "user") {
      g.antinuke.whitelistUsers =
        g.antinuke.whitelistUsers.filter(
          x => x !== id
        );
    }

    if (type === "role") {
      g.antinuke.whitelistRoles =
        g.antinuke.whitelistRoles.filter(
          x => x !== id
        );
    }

    saveDB();

    return message.reply(
      "✅ Whitelist actualizada."
    );
  }

  if (
    [
      "whitelistusers",
      "whitelistroles",
      "whitelistbots"
    ].includes(command)
  ) {
    if (command === "whitelistusers") {
      return replyLong(
        message,
        "👤 **Usuarios whitelist:**\n\n" +
        (
          g.antinuke.whitelistUsers.length
            ? g.antinuke.whitelistUsers
                .map(id => `• <@${id}>`)
                .join("\n")
            : "Ninguno."
        )
      );
    }

    if (command === "whitelistroles") {
      return replyLong(
        message,
        "🎭 **Roles whitelist:**\n\n" +
        (
          g.antinuke.whitelistRoles.length
            ? g.antinuke.whitelistRoles
                .map(id => `• <@&${id}>`)
                .join("\n")
            : "Ninguno."
        )
      );
    }

    return replyLong(
      message,
      "🤖 **Bots whitelist:**\n\n" +
      (
        g.antiraid.botWhitelist.length
          ? g.antiraid.botWhitelist
              .map(id => `• ${id}`)
              .join("\n")
          : "Ninguno."
      )
    );
  }

  if (
    ["botwhitelist", "addbot"].includes(command)
  ) {
    const action = args[0]?.toLowerCase();
    const id =
      cleanMention(args[1]) || args[1];

    if (action === "add") {
      if (!g.antiraid.botWhitelist.includes(id)) {
        g.antiraid.botWhitelist.push(id);
      }

      saveDB();

      return message.reply(
        "🤖 Bot añadido a whitelist."
      );
    }

    if (action === "remove") {
      g.antiraid.botWhitelist =
        g.antiraid.botWhitelist.filter(
          x => x !== id
        );

      saveDB();

      return message.reply(
        "🤖 Bot eliminado de whitelist."
      );
    }

    return message.reply(
      "🤖 Usa `add` o `remove`."
    );
  }

  if (command === "removebot") {
    const id =
      cleanMention(args[0]) || args[0];

    g.antiraid.botWhitelist =
      g.antiraid.botWhitelist.filter(
        x => x !== id
      );

    saveDB();

    return message.reply(
      "✅ Bot eliminado de la whitelist."
    );
  }

  if (
    ["raidstatus", "linkstatus", "nukestatus"].includes(command)
  ) {
    if (command === "raidstatus") {
      return message.reply(
        `🚨 AntiRaid: **${g.antiraid.enabled ? "ON" : "OFF"}**`
      );
    }

    if (command === "linkstatus") {
      return message.reply(
        `🔗 AntiLink: **${g.antilink.enabled ? "ON" : "OFF"}**`
      );
    }

    return message.reply(
      `🛡️ AntiNuke: **${g.antinuke.enabled ? "ON" : "OFF"}**`
    );
  }

  if (
    ["audit", "auditlog"].includes(command)
  ) {
    const logs =
      await message.guild.fetchAuditLogs({
        limit: 10
      }).catch(() => null);

    if (!logs) {
      return message.reply(
        "❌ No puedo acceder a los audit logs."
      );
    }

    let text = "📜 **Últimos Audit Logs**\n\n";

    for (const entry of logs.entries.values()) {
      text +=
        `• **${entry.action}** — ` +
        `${entry.executor?.tag || "Desconocido"}\n`;
    }

    return replyLong(message, text);
  }

  // ==========================================================
  // 📝 CONFIGURACIÓN DE LOGS
  // ==========================================================

  if (
    ["setlogs", "logchannel"].includes(command)
  ) {
    const channel =
      message.mentions.channels.first() ||
      message.channel;

    g.logsChannel = channel.id;

    saveDB();

    return message.reply(
      `📝 Los logs ahora se enviarán a ${channel}.`
    );
  }

  if (
    ["disablelogs"].includes(command)
  ) {
    g.logsChannel = null;

    saveDB();

    return message.reply(
      "📝 Logs desactivados."
    );
  }

  if (command === "testlogs") {
    await sendLog(
      message.guild,
      "🧪 Prueba de Logs",
      `Los logs están funcionando correctamente.`
    );

    return message.reply(
      "✅ Prueba enviada al canal de logs."
    );
  }

  if (command === "logs") {
    return message.reply(
      g.logsChannel
        ? `📝 Canal de logs: <#${g.logsChannel}>`
        : "📝 Los logs están desactivados."
    );
  }

  // ==========================================================
  // 👋 WELCOME
  // ==========================================================

  if (command === "welcome") {
    const action = args[0]?.toLowerCase();

    if (action === "on") {
      g.welcome.enabled = true;
      saveDB();

      return message.reply(
        "👋 Bienvenida activada."
      );
    }

    if (action === "off") {
      g.welcome.enabled = false;
      saveDB();

      return message.reply(
        "👋 Bienvenida desactivada."
      );
    }

    return message.reply(
      `👋 Bienvenida: **${g.welcome.enabled ? "ON" : "OFF"}**`
    );
  }

  if (command === "welcomechannel") {
    const channel =
      message.mentions.channels.first();

    if (!channel) {
      return message.reply(
        `❌ Menciona el canal.`
      );
    }

    g.welcome.channel = channel.id;
    saveDB();

    return message.reply(
      `👋 Canal de bienvenida: ${channel}`
    );
  }

  // ==========================================================
  // 🎭 AUTOROLE
  // ==========================================================

  if (
    ["autorole", "autoroleset"].includes(command)
  ) {
    const action = args[0]?.toLowerCase();

    if (action === "on") {
      g.autorole.enabled = true;
      saveDB();

      return message.reply(
        "🎭 Autorole activado."
      );
    }

    if (action === "off") {
      g.autorole.enabled = false;
      saveDB();

      return message.reply(
        "🎭 Autorole desactivado."
      );
    }

    const role =
      message.mentions.roles.first();

    if (role) {
      if (!role.editable) {
        return message.reply(
          "❌ Naruto no puede administrar ese rol."
        );
      }

      g.autorole.role = role.id;
      saveDB();

      return message.reply(
        `🎭 Autorole configurado: ${role}`
      );
    }

    return message.reply(
      `🎭 Autorole: **${g.autorole.enabled ? "ON" : "OFF"}**`
    );
  }

  // ==========================================================
  // 🏆 CONFIGURACIÓN DE RANK
  // ==========================================================

  if (
    ["setranktext", "ranktext", "ranktitle"].includes(command)
  ) {
    if (command === "ranktitle" && args[0] === "reset") {
      g.rank.text =
        "🍥 {user}, eres ninja al nivel **{level}**.\n⭐ XP: **{xp}/{needed}**";

      saveDB();

      return message.reply(
        "✅ Texto del rank restablecido."
      );
    }

    const text = args.join(" ");

    if (!text) {
      return message.reply(
        `❌ Usa:\n\`${PREFIX}setranktext 🍥 {user}, eres ninja al nivel {level}\``
      );
    }

    g.rank.text = text;

    saveDB();

    return message.reply(
      "✅ Texto del rank actualizado."
    );
  }

  if (command === "rankchannel") {
    const channel =
      message.mentions.channels.first();

    if (!channel) {
      return message.reply(
        `❌ Usa: \`${PREFIX}rankchannel #canal\``
      );
    }

    g.rank.channel = channel.id;

    saveDB();

    return message.reply(
      `🏆 Los mensajes de subida de nivel se enviarán en ${channel}.`
    );
  }

  if (command === "rankmessage") {
    const text = args.join(" ");

    if (!text) {
      return message.reply(
        `❌ Usa: \`${PREFIX}rankmessage 🎉 Felicidades {user}, subiste al nivel {level}\``
      );
    }

    g.rank.message = text;

    saveDB();

    return message.reply(
      "✅ Mensaje de subida de nivel actualizado."
    );
  }

  if (command === "ranktest") {
    if (!g.rank.channel) {
      return message.reply(
        "❌ Primero configura `N!rankchannel #canal`."
      );
    }

    const channel =
      message.guild.channels.cache.get(
        g.rank.channel
      );

    if (!channel?.isTextBased()) {
      return message.reply(
        "❌ El canal configurado no existe."
      );
    }

    const user = getUser(message.author.id);

    await channel.send(
      replaceRankText(
        g.rank.message,
        message.member,
        user
      )
    );

    return message.reply(
      "✅ Mensaje de rank de prueba enviado."
    );
  }

  // ==========================================================
  // 🛒 SHOP ADMIN
  // ==========================================================

  if (command === "shopadd") {
    const role =
      message.mentions.roles.first();

    const price =
      Number(args[1]);

    if (!role || !Number.isFinite(price) || price <= 0) {
      return message.reply(
        `❌ Usa: \`${PREFIX}shopadd @rol precio\``
      );
    }

    if (!role.editable) {
      return message.reply(
        "❌ Naruto no puede administrar ese rol."
      );
    }

    g.shop.roles[role.id] = price;

    saveDB();

    return message.reply(
      `🛒 ${role} añadido a la tienda por **${price}** monedas.`
    );
  }

  if (command === "shopremove") {
    const role =
      message.mentions.roles.first();

    if (!role) {
      return message.reply(
        `❌ Menciona el rol.`
      );
    }

    delete g.shop.roles[role.id];

    saveDB();

    return message.reply(
      `🗑️ ${role} eliminado de la tienda.`
    );
  }

  if (command === "shopprice") {
    const role =
      message.mentions.roles.first();

    const price =
      Number(args[1]);

    if (
      !role ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      return message.reply(
        `❌ Usa: \`${PREFIX}shopprice @rol precio\``
      );
    }

    g.shop.roles[role.id] = price;

    saveDB();

    return message.reply(
      `💰 Precio actualizado: **${price}** monedas.`
    );
  }

  if (command === "shopclear") {
    g.shop.roles = {};

    saveDB();

    return message.reply(
      "🧹 La tienda fue vaciada."
    );
  }

  if (command === "shopreset") {
    g.shop = {
      roles: {}
    };

    saveDB();

    return message.reply(
      "🔄 Tienda restablecida."
    );
  }

  // ==========================================================
  // ⚙️ CONFIG
  // ==========================================================

  if (
    ["settings", "config", "setup", "modules"].includes(command)
  ) {
    return message.reply(
      `⚙️ **Configuración Naruto**\n\n` +
      `📝 Logs: ${g.logsChannel ? `<#${g.logsChannel}>` : "OFF"}\n` +
      `👋 Welcome: ${g.welcome.enabled ? "ON" : "OFF"}\n` +
      `🎭 Autorole: ${g.autorole.enabled ? "ON" : "OFF"}\n` +
      `🏆 Rank: ${g.rank.channel ? `<#${g.rank.channel}>` : "OFF"}\n` +
      `🔗 AntiLink: ${g.antilink.enabled ? "ON" : "OFF"}\n` +
      `🚨 AntiRaid: ${g.antiraid.enabled ? "ON" : "OFF"}\n` +
      `🛡️ AntiNuke: ${g.antinuke.enabled ? "ON" : "OFF"}`
    );
  }

  if (command === "database") {
    return message.reply(
      `💾 **Base de datos**\n\n` +
      `👤 Usuarios: **${Object.keys(db.users).length}**\n` +
      `🏠 Servidores: **${Object.keys(db.guilds).length}**`
    );
  }

  if (command === "backup") {
    saveDB();

    return message.reply(
      "💾 Base de datos guardada correctamente."
    );
  }

  if (command === "botstatus") {
    return message.reply(
      `🍥 Naruto está conectado.\n` +
      `🏓 Ping: **${client.ws.ping}ms**\n` +
      `🏠 Servidores: **${client.guilds.cache.size}**`
    );
  }

  if (command === "activity") {
    return message.reply(
      `🎮 Actividad actual: **N!help**`
    );
  }

  if (command === "language") {
    return message.reply(
      "🇪🇸 Idioma actual: Español."
    );
  }

  // ==========================================================
  // 🎭 ROLES
  // ==========================================================

  if (
    [
      "addrole", "giverole", "roleadd"
    ].includes(command)
  ) {
    const member =
      message.mentions.members.first();

    const role =
      message.mentions.roles.first();

    if (!member || !role) {
      return message.reply(
        `❌ Usa: \`${PREFIX}addrole @usuario @rol\``
      );
    }

    if (!role.editable) {
      return message.reply(
        "❌ Naruto no puede administrar ese rol."
      );
    }

    await member.roles.add(role)
      .catch(() => {});

    return message.reply(
      `🎭 ${role} añadido a ${member}.`
    );
  }

  if (
    [
      "removerole", "takerole", "roleremove"
    ].includes(command)
  ) {
    const member =
      message.mentions.members.first();

    const role =
      message.mentions.roles.first();

    if (!member || !role) {
      return message.reply(
        `❌ Usa: \`${PREFIX}removerole @usuario @rol\``
      );
    }

    if (!role.editable) {
      return message.reply(
        "❌ Naruto no puede administrar ese rol."
      );
    }

    await member.roles.remove(role)
      .catch(() => {});

    return message.reply(
      `🗑️ ${role} eliminado de ${member}.`
    );
  }

  if (
    ["roleinfo"].includes(command)
  ) {
    const role =
      message.mentions.roles.first();

    if (!role) {
      return message.reply(
        "❌ Menciona un rol."
      );
    }

    return message.reply(
      `🎭 **${role.name}**\n\n` +
      `🆔 ${role.id}\n` +
      `🎨 ${role.hexColor}\n` +
      `📌 Posición: ${role.position}\n` +
      `👥 Miembros: ${role.members.size}`
    );
  }

  if (
    ["rolecreate"].includes(command)
  ) {
    const name =
      args.join(" ");

    if (!name) {
      return message.reply(
        `❌ Usa: \`${PREFIX}rolecreate Nombre\``
      );
    }

    const role =
      await message.guild.roles.create({
        name,
        reason: `Creado por ${message.author.tag}`
      }).catch(() => null);

    if (!role) {
      return message.reply(
        "❌ No pude crear el rol."
      );
    }

    return message.reply(
      `🎭 Rol creado: ${role}`
    );
  }

  if (
    ["roledelete"].includes(command)
  ) {
    const role =
      message.mentions.roles.first();

    if (!role) {
      return message.reply(
        "❌ Menciona un rol."
      );
    }

    if (!role.editable) {
      return message.reply(
        "❌ Naruto no puede eliminar ese rol."
      );
    }

    await role.delete(
      `Eliminado por ${message.author.tag}`
    ).catch(() => {});

    return message.reply(
      "🗑️ Rol eliminado."
    );
  }

  if (command === "rolecolor") {
    const role =
      message.mentions.roles.first();

    const hex =
      args.find(x =>
        /^#[0-9a-f]{6}$/i.test(x)
      );

    if (!role || !hex) {
      return message.reply(
        `❌ Usa: \`${PREFIX}rolecolor @rol #ff0000\``
      );
    }

    if (!role.editable) {
      return message.reply(
        "❌ Naruto no puede editar ese rol."
      );
    }

    await role.setColor(hex)
      .catch(() => {});

    return message.reply(
      "🎨 Color del rol actualizado."
    );
  }

  if (
    ["rolehoist", "rolemention"].includes(command)
  ) {
    const role =
      message.mentions.roles.first();

    if (!role || !role.editable) {
      return message.reply(
        "❌ Rol inválido."
      );
    }

    if (command === "rolehoist") {
      await role.setHoist(!role.hoist);

      return message.reply(
        `🎭 Hoist: **${!role.hoist ? "ON" : "OFF"}**`
      );
    }

    await role.setMentionable(
      !role.mentionable
    );

    return message.reply(
      "📢 Configuración de menciones actualizada."
    );
  }

  if (
    [
      "memberroles", "rolesme", "myroles"
    ].includes(command)
  ) {
    const member =
      message.mentions.members.first() ||
      message.member;

    const roles =
      member.roles.cache
        .filter(r => r.id !== message.guild.id)
        .map(r => r.toString());

    return replyLong(
      message,
      `🎭 **Roles de ${member.user.username}**\n\n` +
      (roles.length
        ? roles.join(", ")
        : "Sin roles.")
    );
  }

  if (command === "rolemembers") {
    const role =
      message.mentions.roles.first();

    if (!role) {
      return message.reply(
        "❌ Menciona un rol."
      );
    }

    return replyLong(
      message,
      `👥 **Miembros de ${role.name}**\n\n` +
      (
        role.members.size
          ? role.members
              .map(m => `• ${m.user.tag}`)
              .join("\n")
          : "Ninguno."
      )
    );
  }

  if (
    ["rolepos", "rolecheck"].includes(command)
  ) {
    const role =
      message.mentions.roles.first();

    if (!role) {
      return message.reply(
        "❌ Menciona un rol."
      );
    }

    return message.reply(
      `🎭 **${role.name}**\n` +
      `📌 Posición: **${role.position}**\n` +
      `🤖 Naruto puede administrarlo: **${role.editable ? "Sí" : "No"}**`
    );
  }

  if (
    ["rolecount"].includes(command)
  ) {
    return message.reply(
      `🎭 El servidor tiene **${message.guild.roles.cache.size}** roles.`
    );
  }

  if (
    ["rolelist", "roles"].includes(command)
  ) {
    return replyLong(
      message,
      message.guild.roles.cache
        .sort((a, b) => b.position - a.position)
        .map(r => `• ${r.name}`)
        .join("\n")
    );
  }

  if (
    ["roleshop", "autorole", "autoroleset"].includes(command)
  ) {
    return message.reply(
      "🎭 Usa la configuración de Autorole o Shop desde `N!helpadmin`."
    );
  }

  if (
    ["roleperm", "rolewhitelist", "roleprotect",
     "roleedit", "roleset", "rolehelp"].includes(command)
  ) {
    return message.reply(
      `🎭 Configuración avanzada de roles disponible desde los comandos de administración.`
    );
  }

  // ==========================================================
  // 🛒 BOTÓN DE COMPRA
  // ==========================================================

});

// ============================================================
// 🖱️ INTERACCIONES
// ============================================================

client.on(Events.InteractionCreate, async interaction => {

  // ==========================================================
  // 📚 MENÚ PÚBLICO
  // ==========================================================

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId.startsWith("help_public_")
  ) {
    const ownerId =
      interaction.customId.replace(
        "help_public_",
        ""
      );

    if (interaction.user.id !== ownerId) {
      return interaction.reply({
        content:
          "❌ Este menú pertenece a otra persona.",
        ephemeral: true
      });
    }

    const category =
      PUBLIC_CATEGORIES[
        interaction.values[0]
      ];

    if (!category) return;

    return interaction.update({
      embeds: [
        categoryEmbed(category)
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(
              `help_public_${ownerId}`
            )
            .setPlaceholder("📚 Selecciona otra categoría")
            .addOptions(
              Object.entries(
                PUBLIC_CATEGORIES
              ).map(
                ([value, cat]) => ({
                  label: cat.label.replace(
                    /^[^\s]+\s/,
                    ""
                  ),
                  value,
                  description: cat.description,
                  emoji: cat.label.split(" ")[0]
                })
              )
            )
        )
      ]
    });
  }

  // ==========================================================
  // 👑 MENÚ ADMIN
  // ==========================================================

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId.startsWith("help_admin_")
  ) {
    const ownerId =
      interaction.customId.replace(
        "help_admin_",
        ""
      );

    if (interaction.user.id !== ownerId) {
      return interaction.reply({
        content:
          "❌ Este menú pertenece a otro administrador.",
        ephemeral: true
      });
    }

    if (
      !interaction.member ||
      !isAdmin(interaction.member)
    ) {
      return interaction.reply({
        content:
          "❌ Necesitas permisos de administrador.",
        ephemeral: true
      });
    }

    const category =
      ADMIN_CATEGORIES[
        interaction.values[0]
      ];

    if (!category) return;

    return interaction.update({
      embeds: [
        categoryEmbed(category)
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(
              `help_admin_${ownerId}`
            )
            .setPlaceholder("👑 Selecciona otra categoría")
            .addOptions(
              Object.entries(
                ADMIN_CATEGORIES
              ).map(
                ([value, cat]) => ({
                  label: cat.label.replace(
                    /^[^\s]+\s/,
                    ""
                  ),
                  value,
                  description: cat.description,
                  emoji: cat.label.split(" ")[0]
                })
              )
            )
        )
      ]
    });
  }

  // ==========================================================
  // 🛒 COMPRA SHOP
  // ==========================================================

  if (
    interaction.isButton() &&
    interaction.customId.startsWith("shop_buy_")
  ) {
    const roleId =
      interaction.customId.replace(
        "shop_buy_",
        ""
      );

    const guild = interaction.guild;

    const g = getGuild(guild.id);

    const price =
      g.shop.roles[roleId];

    const role =
      guild.roles.cache.get(roleId);

    if (!price || !role) {
      return interaction.reply({
        content:
          "❌ Este producto ya no existe.",
        ephemeral: true
      });
    }

    const user =
      getUser(interaction.user.id);

    if (user.money < price) {
      return interaction.reply({
        content:
          `❌ Necesitas **${price.toLocaleString()}** monedas.`,
        ephemeral: true
      });
    }

    if (
      interaction.member.roles.cache.has(
        role.id
      )
    ) {
      return interaction.reply({
        content:
          "❌ Ya tienes este rol.",
        ephemeral: true
      });
    }

    if (!role.editable) {
      return interaction.reply({
        content:
          "❌ Naruto no puede darte este rol porque está por encima de mi rol.",
        ephemeral: true
      });
    }

    user.money -= price;

    await interaction.member.roles.add(
      role
    ).catch(() => null);

    saveDB();

    return interaction.reply({
      content:
        `🛒 ¡Compra realizada!\n\n` +
        `🎭 Rol: ${role}\n` +
        `💰 Precio: **${price.toLocaleString()}**\n` +
        `💵 Dinero restante: **${user.money.toLocaleString()}**`,
      ephemeral: true
    });
  }
});

// ============================================================
// 🚨 ERRORES
// ============================================================

process.on("unhandledRejection", error => {
  console.error(
    "❌ Unhandled Rejection:",
    error
  );
});

process.on("uncaughtException", error => {
  console.error(
    "❌ Uncaught Exception:",
    error
  );
});

// ============================================================
// 🔑 LOGIN
// ============================================================

if (!process.env.DISCORD_TOKEN) {
  console.error(
    "❌ Falta la variable DISCORD_TOKEN en Render."
  );
} else {
  client.login(
    process.env.DISCORD_TOKEN
  );
}
