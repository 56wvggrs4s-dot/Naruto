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
// PREFIX: N!
// ============================================================

const PREFIX = "N!";
const DATA_FILE = path.join(__dirname, "data.json");

// ============================================================
// 🌐 SERVIDOR HTTP PARA RENDER
// ============================================================

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end("🍥 Naruto Uzumaki está conectado correctamente.");
}).listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 HTTP iniciado en ${PORT}`);
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
  } catch (e) {
    console.error("❌ Error guardando DB:", e);
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

    db.users = parsed.users || {};
    db.guilds = parsed.guilds || {};
  } catch (e) {
    console.error("❌ Error cargando DB:", e);
    db = { users: {}, guilds: {} };
    saveDB();
  }
}

loadDB();

// ============================================================
// 👤 USUARIOS
// ============================================================

function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = {
      money: 100,
      bank: 0,
      xp: 0,
      level: 1,
      bio: "Sin biografía.",
      reps: 0,
      warnings: 0,
      daily: 0,
      work: 0
    };
  }

  const u = db.users[id];

  u.money = Number(u.money) || 100;
  u.bank = Number(u.bank) || 0;
  u.xp = Number(u.xp) || 0;
  u.level = Number(u.level) || 1;
  u.reps = Number(u.reps) || 0;
  u.warnings = Number(u.warnings) || 0;
  u.daily = Number(u.daily) || 0;
  u.work = Number(u.work) || 0;
  u.bio = typeof u.bio === "string"
    ? u.bio
    : "Sin biografía.";

  return u;
}

// ============================================================
// 🏠 SERVIDORES
// ============================================================

function defaultGuild() {
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

    shop: {
      roles: {}
    }
  };
}

function getGuild(id) {
  if (!db.guilds[id]) {
    db.guilds[id] = defaultGuild();
    saveDB();
  }

  const g = db.guilds[id];

  if (!g.shop) g.shop = { roles: {} };
  if (!g.shop.roles) g.shop.roles = {};

  if (!g.antiraid) {
    g.antiraid = defaultGuild().antiraid;
  }

  if (!g.antilink) {
    g.antilink = defaultGuild().antilink;
  }

  if (!Array.isArray(g.antilink.whitelist)) {
    g.antilink.whitelist = [
      "discord.com",
      "discord.gg"
    ];
  }

  if (!g.antispam) {
    g.antispam = defaultGuild().antispam;
  }

  if (!g.channelProtection) {
    g.channelProtection =
      defaultGuild().channelProtection;
  }

  if (!g.welcome) {
    g.welcome = defaultGuild().welcome;
  }

  if (!g.autorole) {
    g.autorole = defaultGuild().autorole;
  }

  if (!("logsChannel" in g)) {
    g.logsChannel = null;
  }

  return g;
}

// ============================================================
// 🔐 PERMISOS
// ============================================================

function isAdmin(member) {
  return !!member?.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
}

function isOwner(member) {
  return member?.guild.ownerId === member?.id;
}

// ============================================================
// 📝 LOGS
// ============================================================

async function sendLog(guild, embed) {
  try {
    const settings = getGuild(guild.id);

    if (!settings.logsChannel) return;

    const channel =
      guild.channels.cache.get(settings.logsChannel);

    if (channel?.isTextBased()) {
      await channel.send({
        embeds: [embed]
      });
    }
  } catch {}
}

// ============================================================
// ⭐ XP
// ============================================================

function addXP(user, amount = null) {
  const gained =
    amount ??
    Math.floor(Math.random() * 10) + 5;

  user.xp += gained;

  let levelUp = false;

  while (user.xp >= user.level * 100) {
    user.xp -= user.level * 100;
    user.level++;
    levelUp = true;
  }

  saveDB();

  return {
    gained,
    levelUp
  };
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
  "unlock",
  "slowmode",
  "nick",
  "resetnick",
  "softban",
  "deafen",
  "undeafen",
  "voicekick",
  "modlog"
];

// ============================================================
// 📚 MENÚS
// ============================================================

// ---------------- PUBLICO ----------------

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
    "economy",
    "cash",
    "wallet",
    "coins",
    "salary",
    "job",
    "depositall",
    "withdrawall",
    "mymoney",
    "give",
    "wealth"
  ],

  rank: [
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
    "rankinfo",
    "globalrank",
    "guildrank",
    "xpinfo",
    "ranking"
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
    "social",
    "userinfo",
    "aboutme",
    "member",
    "joined",
    "created",
    "rolesme",
    "mention",
    "id",
    "account"
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
    "members",
    "channels",
    "roles",
    "emojis",
    "stickers",
    "boosts",
    "owner",
    "createdserver",
    "serverid",
    "region",
    "invite"
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
    "ship",
    "coinflip",
    "roll",
    "number",
    "truth",
    "dare",
    "rate",
    "howgay",
    "roast",
    "compliment",
    "meme"
  ],

  tienda: [
    "tienda",
    "comprar",
    "shop",
    "buy",
    "productos",
    "catalogo",
    "precios",
    "roleshop",
    "rolshop",
    "shoplist",
    "shopinfo",
    "items",
    "item",
    "purchase",
    "cart",
    "myroles",
    "owned",
    "rolcomprado",
    "store",
    "market"
  ]
};

// ---------------- ADMIN ----------------

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
    "unlock",
    "slowmode",
    "nick",
    "resetnick",
    "softban",
    "deafen",
    "undeafen",
    "voicekick",
    "modlog"
  ],

  servidor: [
    "logs",
    "welcome",
    "autorole",
    "settings",
    "antilink",
    "antispam",
    "antiraid",
    "channelprotect",
    "setlogs",
    "disablelogs",
    "testlogs",
    "welcomechannel",
    "welcomeon",
    "welcomeoff",
    "autoroleset",
    "autoroleon",
    "autoroleoff",
    "serverconfig",
    "security"
  ],

  roles: [
    "roles",
    "roleinfo",
    "rolelist",
    "rolecreate",
    "roledelete",
    "roleadd",
    "roleremove",
    "rolecolor",
    "rolename",
    "rolehoist",
    "rolemention",
    "roleposition",
    "roleperm",
    "giverole",
    "takerole",
    "addrole",
    "removerole",
    "createrole",
    "deleterole",
    "editrole"
  ],

  tienda: [
    "tienda",
    "tienda agregar",
    "tienda quitar",
    "tienda precio",
    "tienda editar",
    "tienda lista",
    "shopadd",
    "shopremove",
    "shopprice",
    "shopedit",
    "shoplist",
    "shopclear",
    "shopreset",
    "shoprole",
    "shoproleprice",
    "shopenable",
    "shopdisable",
    "shopreload",
    "shopconfig",
    "shopadmin"
  ],

  economia: [
    "addmoney",
    "removemoney",
    "addxp",
    "removexp",
    "setmoney",
    "setxp",
    "setlevel",
    "resetmoney",
    "resetxp",
    "resetuser",
    "economyreset",
    "moneyreset",
    "xpreset",
    "levelreset",
    "givecash",
    "takecash",
    "givebank",
    "takebank",
    "bankset",
    "economyconfig"
  ]
};

// ============================================================
// 🎨 DECORACIÓN
// ============================================================

const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

function section(title, emoji, commands) {
  return (
    `\n${emoji} **${title}**\n` +
    `${LINE}\n` +
    commands
      .map((x, i) =>
        `**${String(i + 1).padStart(2, "0")}.** \`${PREFIX}${x}\``
      )
      .join("\n")
  );
}

function publicMenu() {
  return (
    "🍥 **NARUTO UZUMAKI**\n" +
    "╭────────────────────────────╮\n" +
    "│       📖 MENÚ PRINCIPAL       │\n" +
    "╰────────────────────────────╯\n\n" +

    "✨ Prefix: `N!`\n" +
    "🎮 Diversión • 💰 Economía • 🏆 Rank\n" +
    "👤 Social • 🏠 Servidor • 🛒 Tienda\n" +

    section("ECONOMÍA", "💰", publicHelp.economia) +
    section("RANK", "🏆", publicHelp.rank) +
    section("SOCIAL", "👤", publicHelp.social) +
    section("SERVIDOR", "🏠", publicHelp.servidor) +
    section("DIVERSIÓN", "🎮", publicHelp.diversion) +
    section("TIENDA", "🛒", publicHelp.tienda) +

    `\n${LINE}\n` +
    `🔐 Administración: \`${PREFIX}helpadmin\`\n` +
    `🍥 Naruto Uzumaki • ${client.guilds.cache.size} servidores`
  );
}

function adminMenu() {
  return (
    "🍥 **NARUTO UZUMAKI — ADMIN PANEL**\n" +
    "╭────────────────────────────╮\n" +
    "│       🔐 PANEL ADMIN       │\n" +
    "╰────────────────────────────╯\n\n" +

    "⚠️ Estos comandos requieren **Administrador**.\n" +

    section("MODERACIÓN", "🛡️", adminHelp.moderacion) +
    section("SERVIDOR", "🏠", adminHelp.servidor) +
    section("ROLES", "🎭", adminHelp.roles) +
    section("TIENDA", "🛒", adminHelp.tienda) +
    section("ECONOMÍA ADMIN", "💰", adminHelp.economia) +

    `\n${LINE}\n` +
    `🍥 Prefix: \`${PREFIX}\``
  );
}

// ============================================================
// 🚀 READY
// ============================================================

client.once(Events.ClientReady, ready => {
  console.log("");
  console.log("======================================");
  console.log("🍥 NARUTO UZUMAKI");
  console.log("======================================");
  console.log(`🤖 ${ready.user.tag}`);
  console.log(`🏠 Servidores: ${ready.guilds.cache.size}`);
  console.log(`🔑 Prefix: ${PREFIX}`);
  console.log(`📡 Ping: ${ready.ws.ping}ms`);
  console.log("🟢 CONECTADO");
  console.log("======================================");

  ready.user.setActivity(
    `${PREFIX}help | Naruto Uzumaki`
  );
});

// ============================================================
// 👋 BIENVENIDA + AUTOROLE
// ============================================================

client.on(Events.GuildMemberAdd, async member => {
  try {
    const g = getGuild(member.guild.id);

    if (g.autorole.enabled && g.autorole.role) {
      const role =
        member.guild.roles.cache.get(g.autorole.role);

      if (
        role &&
        role.editable &&
        !member.roles.cache.has(role.id)
      ) {
        await member.roles.add(role).catch(() => {});
      }
    }

    if (g.welcome.enabled && g.welcome.channel) {
      const channel =
        member.guild.channels.cache.get(g.welcome.channel);

      if (channel?.isTextBased()) {
        await channel.send(
          `🍥 ¡Bienvenido/a ${member} a **${member.guild.name}**!`
        ).catch(() => {});
      }
    }
  } catch (e) {
    console.error("Welcome:", e);
  }
});

// ============================================================
// 💬 ANTI-SPAM
// ============================================================

const spam = new Map();

client.on(Events.MessageCreate, async message => {
  if (!message.guild || message.author.bot) return;

  const g = getGuild(message.guild.id);

  if (!g.antispam.enabled) return;
  if (isAdmin(message.member)) return;

  const key =
    `${message.guild.id}:${message.author.id}`;

  const now = Date.now();

  if (!spam.has(key)) spam.set(key, []);

  const arr = spam.get(key);

  arr.push(now);

  while (
    arr.length &&
    now - arr[0] > g.antispam.interval
  ) {
    arr.shift();
  }

  if (arr.length >= g.antispam.maxMessages) {
    arr.length = 0;

    await message.delete().catch(() => {});

    if (message.member.moderatable) {
      await message.member.timeout(
        g.antispam.timeout,
        "Anti-Spam"
      ).catch(() => {});
    }

    await sendLog(
      message.guild,
      new EmbedBuilder()
        .setTitle("🚨 ANTI-SPAM")
        .setDescription(`${message.author} fue detectado por spam.`)
        .setTimestamp()
    );
  }
});

// ============================================================
// 🔗 ANTI-LINK
// ============================================================

client.on(Events.MessageCreate, async message => {
  if (!message.guild || message.author.bot) return;

  const g = getGuild(message.guild.id);

  if (!g.antilink.enabled) return;
  if (isAdmin(message.member)) return;

  if (!/(https?:\/\/|www\.)/i.test(message.content)) {
    return;
  }

  const content =
    message.content.toLowerCase();

  const allowed =
    g.antilink.whitelist.some(domain =>
      content.includes(domain.toLowerCase())
    );

  if (allowed) return;

  await message.delete().catch(() => {});

  await sendLog(
    message.guild,
    new EmbedBuilder()
      .setTitle("🔗 ANTI-LINK")
      .setDescription(`${message.author} envió un enlace bloqueado.`)
      .setTimestamp()
  );
});

// ============================================================
// 💬 COMANDOS
// ============================================================

client.on(Events.MessageCreate, async message => {
  try {
    if (!message.guild) return;
    if (message.author.bot) return;

    if (!message.content.startsWith(PREFIX)) return;

    const parts =
      message.content
        .slice(PREFIX.length)
        .trim()
        .split(/\s+/);

    const command =
      parts.shift()?.toLowerCase();

    const args = parts;

    if (!command) return;

    const user =
      getUser(message.author.id);

    const g =
      getGuild(message.guild.id);

    // ========================================================
    // 🆘 HELP
    // ========================================================

    if (command === "help") {
      return message.reply(publicMenu());
    }

    if (command === "helpadmin") {
      if (!isAdmin(message.member)) {
        return message.reply(
          "❌ Solo los administradores pueden usar `N!helpadmin`."
        );
      }

      return message.reply(adminMenu());
    }

    // ========================================================
    // 🏓 PING
    // ========================================================

    if (command === "ping") {
      return message.reply(
        `🏓 **PONG!**\n📡 Latencia: **${client.ws.ping}ms**`
      );
    }

    // ========================================================
    // 💰 ECONOMÍA — 20
    // ========================================================

    if (["balance","money","cash","wallet","mymoney"].includes(command)) {
      return message.reply(
        `💰 **${message.author.username}**\n\n` +
        `💵 Efectivo: **$${user.money}**\n` +
        `🏦 Banco: **$${user.bank}**\n` +
        `💎 Total: **$${user.money + user.bank}**`
      );
    }

    if (command === "daily") {
      const cooldown = 86400000;
      const now = Date.now();

      if (now - user.daily < cooldown) {
        const left =
          Math.ceil(
            (cooldown - (now - user.daily)) / 3600000
          );

        return message.reply(
          `⏰ Ya reclamaste tu recompensa.\nVuelve en **${left}h**.`
        );
      }

      user.money += 500;
      user.daily = now;

      addXP(user);

      return message.reply(
        "🎁 Recibiste **$500**."
      );
    }

    if (["work","job","salary"].includes(command)) {
      const amount =
        Math.floor(Math.random() * 201) + 100;

      user.money += amount;
      user.work = Date.now();

      addXP(user);

      return message.reply(
        `🍥 Completaste una misión ninja.\n` +
        `💰 Ganaste **$${amount}**.`
      );
    }

    if (["pay","give"].includes(command)) {
      const target =
        message.mentions.users.first();

      const amount =
        parseInt(args[1]);

      if (!target || !amount || amount <= 0) {
        return message.reply(
          `❌ Usa: \`${PREFIX}pay @usuario cantidad\``
        );
      }

      if (target.id === message.author.id) {
        return message.reply(
          "❌ No puedes enviarte dinero."
        );
      }

      if (user.money < amount) {
        return message.reply(
          "❌ No tienes suficiente dinero."
        );
      }

      const targetData =
        getUser(target.id);

      user.money -= amount;
      targetData.money += amount;

      saveDB();

      return message.reply(
        `💸 Enviaste **$${amount}** a ${target}.`
      );
    }

    if (["deposit","depositall"].includes(command)) {
      const amount =
        command === "depositall"
          ? user.money
          : parseInt(args[0]);

      if (!amount || amount <= 0) {
        return message.reply(
          `❌ Usa: \`${PREFIX}deposit cantidad\``
        );
      }

      if (amount > user.money) {
        return message.reply(
          "❌ No tienes suficiente efectivo."
        );
      }

      user.money -= amount;
      user.bank += amount;

      saveDB();

      return message.reply(
        `🏦 Depositaste **$${amount}**.`
      );
    }

    if (["withdraw","withdrawall"].includes(command)) {
      const amount =
        command === "withdrawall"
          ? user.bank
          : parseInt(args[0]);

      if (!amount || amount <= 0) {
        return message.reply(
          `❌ Usa: \`${PREFIX}withdraw cantidad\``
        );
      }

      if (amount > user.bank) {
        return message.reply(
          "❌ No tienes suficiente dinero en el banco."
        );
      }

      user.bank -= amount;
      user.money += amount;

      saveDB();

      return message.reply(
        `🏦 Retiraste **$${amount}**.`
      );
    }

    if (["bank"].includes(command)) {
      return message.reply(
        `🏦 Tienes **$${user.bank}** en el banco.`
      );
    }

    if (["richest","wealth","economy"].includes(command)) {
      const top =
        Object.entries(db.users)
          .sort(
            (a,b) =>
              (b[1].money + b[1].bank) -
              (a[1].money + a[1].bank)
          )
          .slice(0,10);

      let text = "💰 **TOP ECONOMÍA**\n\n";

      top.forEach(([id,u],i) => {
        text +=
          `**${i+1}.** <@${id}> — **$${u.money + u.bank}**\n`;
      });

      return message.reply(text);
    }

    if (["coins"].includes(command)) {
      return message.reply(
        `🪙 Tienes **${user.money + user.bank} monedas**.`
      );
    }

    // ========================================================
    // 🏆 RANK — 20
    // ========================================================

    if (
      ["rank","rankcard","mylevel","rankinfo","globalrank","guildrank"]
        .includes(command)
    ) {
      return message.reply(
        `🏆 **RANK DE ${message.author.username}**\n\n` +
        `⭐ Nivel: **${user.level}**\n` +
        `✨ XP: **${user.xp}/${user.level * 100}**`
      );
    }

    if (["level","levels"].includes(command)) {
      return message.reply(
        `🏆 Tu nivel es **${user.level}**.`
      );
    }

    if (["xp","myxp","xpinfo"].includes(command)) {
      return message.reply(
        `✨ XP: **${user.xp}/${user.level * 100}**`
      );
    }

    if (["leaderboard","top","ranking","xptop","leveltop"].includes(command)) {
      const top =
        Object.entries(db.users)
          .sort(
            (a,b) =>
              b[1].level - a[1].level ||
              b[1].xp - a[1].xp
          )
          .slice(0,10);

      let text = "🏆 **TOP NINJAS**\n\n";

      top.forEach(([id,u],i) => {
        text +=
          `**${i+1}.** <@${id}> — Nivel **${u.level}**\n`;
      });

      return message.reply(text);
    }

    if (["rewards"].includes(command)) {
      return message.reply(
        "🎁 **RECOMPENSAS**\n\n" +
        "⭐ Nivel 5 → recompensa\n" +
        "⭐ Nivel 10 → recompensa\n" +
        "⭐ Nivel 25 → recompensa\n" +
        "⭐ Nivel 50 → recompensa"
      );
    }

    if (["progress","nextlevel"].includes(command)) {
      const needed = user.level * 100;

      return message.reply(
        `📊 **PROGRESO**\n\n` +
        `Nivel: **${user.level}**\n` +
        `XP: **${user.xp}/${needed}**\n` +
        `Falta: **${needed - user.xp} XP**`
      );
    }

    // ========================================================
    // 👤 SOCIAL — 20
    // ========================================================

    if (
      ["profile","userinfo","aboutme","member","account","social"]
        .includes(command)
    ) {
      return message.reply(
        `👤 **PERFIL DE ${message.author.username}**\n\n` +
        `🏆 Nivel: **${user.level}**\n` +
        `✨ XP: **${user.xp}**\n` +
        `💰 Dinero: **$${user.money + user.bank}**\n` +
        `⭐ Reputación: **${user.reps}**\n` +
        `📝 Bio: ${user.bio}`
      );
    }

    if (["avatar"].includes(command)) {
      return message.reply(
        message.author.displayAvatarURL({
          size: 1024
        })
      );
    }

    if (["banner"].includes(command)) {
      const fetched =
        await client.users.fetch(
          message.author.id,
          { force: true }
        );

      return message.reply(
        fetched.bannerURL({ size: 1024 }) ||
        "❌ No tienes banner."
      );
    }

    if (command === "bio") {
      return message.reply(
        `📝 **BIO**\n${user.bio}`
      );
    }

    if (command === "setbio") {
      const bio = args.join(" ");

      if (!bio) {
        return message.reply(
          `❌ Usa: \`${PREFIX}setbio texto\``
        );
      }

      if (bio.length > 200) {
        return message.reply(
          "❌ Máximo 200 caracteres."
        );
      }

      user.bio = bio;
      saveDB();

      return message.reply(
        "✅ Biografía actualizada."
      );
    }

    if (["rep"].includes(command)) {
      const target =
        message.mentions.users.first();

      if (!target) {
        return message.reply(
          `❌ Usa: \`${PREFIX}rep @usuario\``
        );
      }

      if (target.id === message.author.id) {
        return message.reply(
          "❌ No puedes darte reputación."
        );
      }

      getUser(target.id).reps++;
      saveDB();

      return message.reply(
        `⭐ ${target} recibió +1 reputación.`
      );
    }

    if (["reps"].includes(command)) {
      return message.reply(
        `⭐ Reputación: **${user.reps}**`
      );
    }

    if (["friends","status","joined","created","rolesme","mention","id"].includes(command)) {
      const member =
        message.member;

      if (command === "joined") {
        return message.reply(
          `📅 Entraste al servidor: <t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
        );
      }

      if (command === "created") {
        return message.reply(
          `📅 Cuenta creada: <t:${Math.floor(message.author.createdTimestamp / 1000)}:F>`
        );
      }

      if (command === "rolesme") {
        return message.reply(
          `🎭 Tus roles:\n${member.roles.cache.filter(r => r.id !== message.guild.id).map(r => r.toString()).join(" ") || "Ninguno"}`
        );
      }

      if (command === "mention") {
        return message.reply(
          `📣 ${message.author}`
        );
      }

      if (command === "id") {
        return message.reply(
          `🆔 Tu ID: **${message.author.id}**`
        );
      }

      return message.reply(
        `👤 ${message.author} está en **${message.guild.name}**.`
      );
    }

    // ========================================================
    // 🏠 SERVIDOR — 20
    // ========================================================

    if (["serverinfo","serverconfig"].includes(command)) {
      return message.reply(
        `🏠 **${message.guild.name}**\n\n` +
        `👑 Owner: <@${message.guild.ownerId}>\n` +
        `👥 Miembros: **${message.guild.memberCount}**\n` +
        `💬 Canales: **${message.guild.channels.cache.size}**\n` +
        `🎭 Roles: **${message.guild.roles.cache.size}**`
      );
    }

    if (command === "members") {
      const humans =
        message.guild.members.cache.filter(
          m => !m.user.bot
        ).size;

      const bots =
        message.guild.members.cache.filter(
          m => m.user.bot
        ).size;

      return message.reply(
        `👥 **MIEMBROS**\n\n` +
        `👤 Humanos: **${humans}**\n` +
        `🤖 Bots: **${bots}**\n` +
        `📊 Total: **${message.guild.memberCount}**`
      );
    }

    if (command === "membercount") {
      return message.reply(
        `👥 Miembros: **${message.guild.memberCount}**`
      );
    }

    if (command === "botinfo") {
      return message.reply(
        `🍥 **NARUTO UZUMAKI**\n\n` +
        `🤖 ${client.user.tag}\n` +
        `🏠 Servidores: **${client.guilds.cache.size}**\n` +
        `👥 Usuarios: **${client.users.cache.size}**\n` +
        `📡 Ping: **${client.ws.ping}ms**`
      );
    }

    if (command === "servericon") {
      return message.reply(
        message.guild.iconURL({ size: 1024 }) ||
        "❌ Este servidor no tiene icono."
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

    if (command === "rolelist" || command === "roles") {
      return message.reply(
        `🎭 **ROLES DEL SERVIDOR**\n\n` +
        message.guild.roles.cache
          .map(r => r.toString())
          .slice(0, 80)
          .join("\n")
      );
    }

    if (command === "channelinfo") {
      return message.reply(
        `💬 **${message.channel.name}**\n🆔 ${message.channel.id}`
      );
    }

    if (command === "channels") {
      return message.reply(
        `💬 Canales: **${message.guild.channels.cache.size}**`
      );
    }

    if (command === "emojis") {
      return message.reply(
        `😀 Emojis: **${message.guild.emojis.cache.size}**`
      );
    }

    if (command === "stickers") {
      return message.reply(
        `🏷️ Stickers: **${message.guild.stickers.cache.size}**`
      );
    }

    if (command === "boosts") {
      return message.reply(
        `🚀 Boosts: **${message.guild.premiumSubscriptionCount || 0}**`
      );
    }

    if (command === "owner") {
      return message.reply(
        `👑 Owner: <@${message.guild.ownerId}>`
      );
    }

    if (command === "createdserver") {
      return message.reply(
        `📅 Servidor creado: <t:${Math.floor(message.guild.createdTimestamp / 1000)}:F>`
      );
    }

    if (command === "serverid") {
      return message.reply(
        `🆔 ID: **${message.guild.id}**`
      );
    }

    if (command === "region") {
      return message.reply(
        "🌎 Discord gestiona actualmente la región automáticamente."
      );
    }

    if (command === "invite") {
      return message.reply(
        "🔗 Crea una invitación desde Discord para este servidor."
      );
    }

    // ========================================================
    // 🎮 DIVERSIÓN — 20
    // ========================================================

    if (command === "8ball") {
      const answers = [
        "Sí.",
        "No.",
        "Probablemente.",
        "Definitivamente.",
        "No estoy seguro.",
        "Pregunta otra vez."
      ];

      return message.reply(
        `🎱 ${
          answers[Math.floor(Math.random() * answers.length)]
        }`
      );
    }

    if (["dice","roll"].includes(command)) {
      const sides =
        parseInt(args[0]) > 1
          ? parseInt(args[0])
          : 6;

      return message.reply(
        `🎲 Resultado: **${Math.floor(Math.random() * sides) + 1}**`
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
          `❌ Usa piedra, papel o tijera.`
        );
      }

      const bot =
        choices[
          Math.floor(Math.random() * 3)
        ];

      let result = "🤝 Empate.";

      if (
        (player === "piedra" && bot === "tijera") ||
        (player === "papel" && bot === "piedra") ||
        (player === "tijera" && bot === "papel")
      ) {
        result = "🎉 ¡Ganaste!";
      } else if (player !== bot) {
        result = "🍥 Ganó Naruto.";
      }

      return message.reply(
        `👤 ${player}\n🍥 ${bot}\n\n${result}`
      );
    }

    if (command === "joke") {
      const jokes = [
        "🍜 Naruto fue a Ichiraku porque tenía hambre.",
        "🥷 Un ninja no llega tarde, hace una entrada sorpresa.",
        "🍥 El ramen siempre es una buena misión."
      ];

      return message.reply(
        jokes[Math.floor(Math.random() * jokes.length)]
      );
    }

    if (command === "choose") {
      if (args.length < 2) {
        return message.reply(
          `❌ Usa: \`${PREFIX}choose opción1 opción2\``
        );
      }

      return message.reply(
        `🤔 Elijo: **${args[Math.floor(Math.random() * args.length)]}**`
      );
    }

    if (command === "reverse") {
      const text = args.join(" ");

      return message.reply(
        text
          ? text.split("").reverse().join("")
          : "❌ Escribe un texto."
      );
    }

    if (command === "say") {
      if (!args.length) return;

      await message.delete().catch(() => {});

      return message.channel.send(
        args.join(" ")
      );
    }

    if (command === "random" || command === "number") {
      const max =
        parseInt(args[0]) || 100;

      return message.reply(
        `🎲 Número: **${Math.floor(Math.random() * max) + 1}**`
      );
    }

    if (command === "hug") {
      const target =
        message.mentions.users.first();

      return message.reply(
        target
          ? `🫂 ${message.author} abrazó a ${target}.`
          : "❌ Menciona a alguien."
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

      return message.reply(
        `💖 Compatibilidad: **${Math.floor(Math.random() * 101)}%**`
      );
    }

    if (command === "coinflip") {
      return message.reply(
        `🪙 Salió **${Math.random() < .5 ? "CARA" : "CRUZ"}**`
      );
    }

    if (command === "truth") {
      return message.reply(
        "❓ Verdad: ¿Cuál es tu objetivo ninja?"
      );
    }

    if (command === "dare") {
      return message.reply(
        "🔥 Reto: escribe una frase usando solo emojis."
      );
    }

    if (command === "rate") {
      return message.reply(
        `⭐ Calificación aleatoria: **${Math.floor(Math.random() * 11)}/10**`
      );
    }

    if (command === "roast") {
      const target =
        message.mentions.users.first() ||
        message.author;

      return message.reply(
        `🔥 ${target}, Naruto dice que necesitas entrenar más.`
      );
    }

    if (command === "compliment") {
      const target =
        message.mentions.users.first() ||
        message.author;

      return message.reply(
        `✨ ${target}, ¡eres un gran ninja! 🍥`
      );
    }

    if (command === "meme") {
      return message.reply(
        "😂 Meme ninja: cuando dices que vas a hacer una misión rápida y termina durando 3 horas."
      );
    }

    // ========================================================
    // 🛒 TIENDA PÚBLICA — 20
    // ========================================================

    if (
      ["tienda","shop","productos","catalogo","precios",
       "roleshop","rolshop","shoplist","shopinfo",
       "items","item","store","market"].includes(command)
    ) {
      const products =
        Object.entries(g.shop.roles);

      if (!products.length) {
        return message.reply(
          "🛒 **TIENDA DE NARUTO**\n\nNo hay productos disponibles."
        );
      }

      let text =
        "🛒 **TIENDA DE ROLES**\n" +
        `${LINE}\n\n`;

      products.forEach(([roleId,data],i) => {
        const role =
          message.guild.roles.cache.get(roleId);

        if (!role) return;

        text +=
          `**${i + 1}.** ${role}\n` +
          `💰 Precio: **$${data.price}**\n\n`;
      });

      text +=
        `💵 Tu dinero: **$${user.money}**\n` +
        `🛍️ Compra con: \`${PREFIX}comprar @rol\``;

      return message.reply(text);
    }

    if (
      ["comprar","buy","purchase"].includes(command)
    ) {
      const role =
        message.mentions.roles.first();

      if (!role) {
        return message.reply(
          `❌ Usa: \`${PREFIX}comprar @rol\``
        );
      }

      const product =
        g.shop.roles[role.id];

      if (!product) {
        return message.reply(
          "❌ Ese rol no está en la tienda."
        );
      }

      if (message.member.roles.cache.has(role.id)) {
        return message.reply(
          "❌ Ya tienes ese rol."
        );
      }

      if (user.money < product.price) {
        return message.reply(
          `❌ Dinero insuficiente.\n` +
          `💵 Tienes: **$${user.money}**\n` +
          `🏷️ Precio: **$${product.price}**`
        );
      }

      if (!role.editable) {
        return message.reply(
          "❌ El bot no puede asignar ese rol porque está por encima de su rol."
        );
      }

      user.money -= product.price;

      await message.member.roles.add(
        role,
        `Compra de tienda por ${message.author.tag}`
      );

      saveDB();

      return message.reply(
        `🛍️ **COMPRA REALIZADA**\n\n` +
        `🎭 Rol: ${role}\n` +
        `💰 Pagado: **$${product.price}**\n` +
        `💵 Restante: **$${user.money}**`
      );
    }

    if (
      ["myroles","owned","rolcomprado"].includes(command)
    ) {
      const roles =
        message.member.roles.cache
          .filter(r => r.id !== message.guild.id);

      return message.reply(
        `🎭 **TUS ROLES**\n\n` +
        (roles.map(r => r.toString()).join("\n") || "Ninguno")
      );
    }

    // ========================================================
    // 🔐 ADMIN CHECK
    // ========================================================

    const adminOnly = new Set([
      ...moderationCommands,
      "logs",
      "welcome",
      "autorole",
      "settings",
      "antilink",
      "antispam",
      "antiraid",
      "channelprotect",

      "setlogs",
      "disablelogs",
      "testlogs",
      "welcomechannel",
      "welcomeon",
      "welcomeoff",
      "autoroleset",
      "autoroleon",
      "autoroleoff",
      "security",

      "roles",
      "rolecreate",
      "roledelete",
      "roleadd",
      "roleremove",
      "rolecolor",
      "rolename",
      "rolehoist",
      "rolemention",
      "roleposition",
      "roleperm",
      "giverole",
      "takerole",
      "addrole",
      "removerole",
      "createrole",
      "deleterole",
      "editrole",

      "shopadd",
      "shopremove",
      "shopprice",
      "shopedit",
      "shoplist",
      "shopclear",
      "shopreset",
      "shoprole",
      "shoproleprice",
      "shopenable",
      "shopdisable",
      "shopreload",
      "shopconfig",
      "shopadmin",

      "addmoney",
      "removemoney",
      "addxp",
      "removexp",
      "setmoney",
      "setxp",
      "setlevel",
      "resetmoney",
      "resetxp",
      "resetuser",
      "economyreset",
      "moneyreset",
      "xpreset",
      "levelreset",
      "givecash",
      "takecash",
      "givebank",
      "takebank",
      "bankset",
      "economyconfig"
    ]);

    if (
      adminOnly.has(command) &&
      !isAdmin(message.member)
    ) {
      return message.reply(
        "❌ Solo los administradores pueden usar este comando."
      );
    }

    // ========================================================
    // 🛡️ BAN
    // ========================================================

    if (command === "ban") {
      const target =
        message.mentions.members.first();

      if (!target) {
        return message.reply(
          `❌ Usa: \`${PREFIX}ban @usuario\``
        );
      }

      if (!target.bannable) {
        return message.reply(
          "❌ No puedo banear a ese usuario."
        );
      }

      await target.ban({
        reason: `Ban por ${message.author.tag}`
      });

      return message.reply(
        `🔨 ${target.user.tag} fue baneado.`
      );
    }

    // ========================================================
    // 🔇 MUTE
    // ========================================================

    if (["mute","timeout"].includes(command)) {
      const target =
        message.mentions.members.first();

      const minutes =
        parseInt(args[1]) || 10;

      if (!target) {
        return message.reply(
          `❌ Usa: \`${PREFIX}${command} @usuario minutos\``
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
        `🔇 ${target.user.tag} fue muteado **${minutes} minutos**.`
      );
    }

    // ========================================================
    // 👢 KICK
    // ========================================================

    if (command === "kick") {
      const target =
        message.mentions.members.first();

      if (!target?.kickable) {
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

    // ========================================================
    // 🔊 UNMUTE / UNTIMEOUT
    // ========================================================

    if (
      ["unmute","untimeout"].includes(command)
    ) {
      const target =
        message.mentions.members.first();

      if (!target) {
        return message.reply(
          `❌ Usa: \`${PREFIX}${command} @usuario\``
        );
      }

      await target.timeout(null);

      return message.reply(
        `🔊 Timeout eliminado de ${target}.`
      );
    }

    // ========================================================
    // 🧹 CLEAR
    // ========================================================

    if (command === "clear") {
      const amount =
        parseInt(args[0]);

      if (!amount || amount < 1 || amount > 100) {
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
        `🧹 Eliminados **${deleted.size} mensajes**.`
      );
    }

    // ========================================================
    // ⚠️ WARN
    // ========================================================

    if (command === "warn") {
      const target =
        message.mentions.users.first();

      if (!target) {
        return message.reply(
          `❌ Usa: \`${PREFIX}warn @usuario\``
        );
      }

      const data =
        getUser(target.id);

      data.warnings++;

      saveDB();

      return message.reply(
        `⚠️ ${target} recibió un warning.\n` +
        `Warnings: **${data.warnings}**`
      );
    }

    if (command === "warnings") {
      const target =
        message.mentions.users.first() ||
        message.author;

      return message.reply(
        `⚠️ ${target} tiene **${getUser(target.id).warnings} warnings**.`
      );
    }

    // ========================================================
    // 🔒 LOCK / UNLOCK
    // ========================================================

    if (command === "lock") {
      await message.channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        { SendMessages: false }
      );

      return message.reply(
        "🔒 Canal bloqueado."
      );
    }

    if (command === "unlock") {
      await message.channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        { SendMessages: null }
      );

      return message.reply(
        "🔓 Canal desbloqueado."
      );
    }

    // ========================================================
    // 🐌 SLOWMODE
    // ========================================================

    if (command === "slowmode") {
      const seconds =
        Math.max(
          0,
          Math.min(
            parseInt(args[0]) || 0,
            21600
          )
        );

      if (!message.channel.setRateLimitPerUser) {
        return message.reply(
          "❌ Este canal no permite slowmode."
        );
      }

      await message.channel.setRateLimitPerUser(
        seconds
      );

      return message.reply(
        `🐌 Slowmode: **${seconds}s**.`
      );
    }

    // ========================================================
    // 👤 NICK
    // ========================================================

    if (command === "nick") {
      const target =
        message.mentions.members.first();

      const nick =
        args.slice(1).join(" ");

      if (!target || !nick) {
        return message.reply(
          `❌ Usa: \`${PREFIX}nick @usuario NuevoNombre\``
        );
      }

      await target.setNickname(nick);

      return message.reply(
        `✏️ Nick cambiado para ${target}.`
      );
    }

    if (command === "resetnick") {
      const target =
        message.mentions.members.first();

      if (!target) {
        return message.reply(
          `❌ Usa: \`${PREFIX}resetnick @usuario\``
        );
      }

      await target.setNickname(null);

      return message.reply(
        `✅ Nick restaurado.`
      );
    }

    // ========================================================
    // 📝 MODLOG
    // ========================================================

    if (command === "modlog") {
      return message.reply(
        `📝 Canal de logs: ${
          g.logsChannel
            ? `<#${g.logsChannel}>`
            : "No configurado"
        }`
      );
    }

    // ========================================================
    // 🔨 SOFTBAN
    // ========================================================

    if (command === "softban") {
      const target =
        message.mentions.members.first();

      if (!target?.bannable) {
        return message.reply(
          "❌ No puedo realizar el softban."
        );
      }

      await target.ban({
        deleteMessageSeconds: 86400,
        reason: `Softban por ${message.author.tag}`
      });

      return message.reply(
        `🔨 Softban realizado a ${target.user.tag}.`
      );
    }

    // ========================================================
    // 🔓 UNBAN
    // ========================================================

    if (command === "unban") {
      const id = args[0];

      if (!id) {
        return message.reply(
          `❌ Usa: \`${PREFIX}unban ID\``
        );
      }

      await message.guild.members.unban(id);

      return message.reply(
        "✅ Usuario desbaneado."
      );
    }

    // ========================================================
    // 💰 ADMIN ECONOMÍA
    // ========================================================

    if (
      ["addmoney","removemoney","setmoney",
       "givecash","takecash"].includes(command)
    ) {
      const target =
        message.mentions.users.first();

      const amount =
        parseInt(args[1]);

      if (!target || !amount || amount <= 0) {
        return message.reply(
          `❌ Usa: \`${PREFIX}${command} @usuario cantidad\``
        );
      }

      const data =
        getUser(target.id);

      if (
        ["addmoney","givecash"].includes(command)
      ) {
        data.money += amount;
      } else if (
        ["removemoney","takecash"].includes(command)
      ) {
        data.money =
          Math.max(0, data.money - amount);
      } else {
        data.money = amount;
      }

      saveDB();

      return message.reply(
        `💰 Dinero actualizado para ${target}.`
      );
    }

    if (
      ["addxp","removexp","setxp"].includes(command)
    ) {
      const target =
        message.mentions.users.first();

      const amount =
        parseInt(args[1]);

      if (!target || !amount || amount < 0) {
        return message.reply(
          `❌ Usa: \`${PREFIX}${command} @usuario cantidad\``
        );
      }

      const data =
        getUser(target.id);

      if (command === "addxp") {
        data.xp += amount;
      } else if (command === "removexp") {
        data.xp =
          Math.max(0, data.xp - amount);
      } else {
        data.xp = amount;
      }

      saveDB();

      return message.reply(
        `✨ XP actualizada para ${target}.`
      );
    }

    if (command === "setlevel") {
      const target =
        message.mentions.users.first();

      const level =
        parseInt(args[1]);

      if (!target || !level || level < 1) {
        return message.reply(
          `❌ Usa: \`${PREFIX}setlevel @usuario nivel\``
        );
      }

      getUser(target.id).level = level;

      saveDB();

      return message.reply(
        `🏆 Nivel de ${target} establecido en **${level}**.`
      );
    }

    // ========================================================
    // 🎭 ROLES ADMIN
    // ========================================================

    if (
      ["roleadd","giverole","addrole"].includes(command)
    ) {
      const member =
        message.mentions.members.first();

      const role =
        message.mentions.roles.first();

      if (!member || !role) {
        return message.reply(
          `❌ Usa: \`${PREFIX}roleadd @usuario @rol\``
        );
      }

      if (!role.editable) {
        return message.reply(
          "❌ No puedo asignar ese rol."
        );
      }

      await member.roles.add(role);

      return message.reply(
        `🎭 ${role} asignado a ${member}.`
      );
    }

    if (
      ["roleremove","takerole","removerole"].includes(command)
    ) {
      const member =
        message.mentions.members.first();

      const role =
        message.mentions.roles.first();

      if (!member || !role) {
        return message.reply(
          `❌ Usa: \`${PREFIX}roleremove @usuario @rol\``
        );
      }

      await member.roles.remove(role);

      return message.reply(
        `🎭 ${role} retirado de ${member}.`
      );
    }

    if (
      ["rolecreate","createrole"].includes(command)
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
        });

      return message.reply(
        `✅ Rol creado: ${role}`
      );
    }

    if (
      ["roledelete","deleterole"].includes(command)
    ) {
      const role =
        message.mentions.roles.first();

      if (!role) {
        return message.reply(
          `❌ Usa: \`${PREFIX}roledelete @rol\``
        );
      }

      if (!role.editable) {
        return message.reply(
          "❌ No puedo eliminar ese rol."
        );
      }

      await role.delete();

      return message.reply(
        "🗑️ Rol eliminado."
      );
    }

    // ========================================================
    // 🛒 TIENDA ADMIN
    // ========================================================

    if (
      command === "tienda" &&
      ["agregar","quitar","precio","editar","lista"]
        .includes(args[0]?.toLowerCase())
    ) {
      const action =
        args[0].toLowerCase();

      if (action === "lista") {
        const products =
          Object.entries(g.shop.roles);

        if (!products.length) {
          return message.reply(
            "🛒 La tienda está vacía."
          );
        }

        let text =
          "🛒 **PRODUCTOS**\n\n";

        products.forEach(([id,data],i) => {
          const role =
            message.guild.roles.cache.get(id);

          text +=
            `**${i+1}.** ${role || id} — **$${data.price}**\n`;
        });

        return message.reply(text);
      }

      const role =
        message.mentions.roles.first();

      if (!role) {
        return message.reply(
          `❌ Menciona un rol.`
        );
      }

      if (action === "agregar") {
        const price =
          parseInt(args.find(x => /^\d+$/.test(x)));

        if (!price || price <= 0) {
          return message.reply(
            `❌ Usa: \`${PREFIX}tienda agregar @rol 5000\``
          );
        }

        if (g.shop.roles[role.id]) {
          return message.reply(
            "❌ Ese rol ya está en la tienda."
          );
        }

        if (!role.editable) {
          return message.reply(
            "❌ El bot no puede asignar ese rol."
          );
        }

        g.shop.roles[role.id] = {
          price,
          createdAt: Date.now()
        };

        saveDB();

        return message.reply(
          `✅ ${role} añadido por **$${price}**.`
        );
      }

      if (action === "quitar") {
        if (!g.shop.roles[role.id]) {
          return message.reply(
            "❌ Ese rol no está en la tienda."
          );
        }

        delete g.shop.roles[role.id];

        saveDB();

        return message.reply(
          `🗑️ ${role} eliminado de la tienda.`
        );
      }

      if (
        action === "precio" ||
        action === "editar"
      ) {
        const price =
          parseInt(args.find(x => /^\d+$/.test(x)));

        if (!price || price <= 0) {
          return message.reply(
            `❌ Usa: \`${PREFIX}tienda ${action} @rol 5000\``
          );
        }

        if (!g.shop.roles[role.id]) {
          return message.reply(
            "❌ Ese rol no está en la tienda."
          );
        }

        g.shop.roles[role.id].price =
          price;

        saveDB();

        return message.reply(
          `💰 ${role} ahora cuesta **$${price}**.`
        );
      }
    }

    // ========================================================
    // ⚙️ CONFIGURACIÓN
    // ========================================================

    if (command === "logs" || command === "setlogs") {
      if (args[0] === "set" || command === "setlogs") {
        const channel =
          message.mentions.channels.first();

        if (!channel) {
          return message.reply(
            `❌ Usa: \`${PREFIX}logs set #canal\``
          );
        }

        g.logsChannel = channel.id;

        saveDB();

        return message.reply(
          `📝 Logs configurados en ${channel}.`
        );
      }

      if (
        args[0] === "disable" ||
        command === "disablelogs"
      ) {
        g.logsChannel = null;

        saveDB();

        return message.reply(
          "📝 Logs desactivados."
        );
      }

      if (
        args[0] === "test" ||
        command === "testlogs"
      ) {
        await sendLog(
          message.guild,
          new EmbedBuilder()
            .setTitle("📝 TEST DE LOGS")
            .setDescription("Los logs funcionan.")
            .setTimestamp()
        );

        return message.reply(
          "✅ Log enviado."
        );
      }

      return message.reply(
        `📝 Canal: ${
          g.logsChannel
            ? `<#${g.logsChannel}>`
            : "No configurado"
        }`
      );
    }

    // ========================================================
    // 👋 WELCOME
    // ========================================================

    if (
      command === "welcome" ||
      ["welcomeon","welcomeoff","welcomechannel"].includes(command)
    ) {
      if (
        command === "welcomeon" ||
        args[0] === "on"
      ) {
        g.welcome.enabled = true;
        saveDB();

        return message.reply(
          "👋 Bienvenidas activadas."
        );
      }

      if (
        command === "welcomeoff" ||
        args[0] === "off"
      ) {
        g.welcome.enabled = false;
        saveDB();

        return message.reply(
          "👋 Bienvenidas desactivadas."
        );
      }

      if (
        command === "welcomechannel" ||
        args[0] === "channel"
      ) {
        const channel =
          message.mentions.channels.first();

        if (!channel) {
          return message.reply(
            `❌ Usa: \`${PREFIX}welcome channel #canal\``
          );
        }

        g.welcome.channel = channel.id;

        saveDB();

        return message.reply(
          `👋 Canal configurado: ${channel}`
        );
      }

      return message.reply(
        `👋 Usa:\n` +
        `\`${PREFIX}welcome on\`\n` +
        `\`${PREFIX}welcome off\`\n` +
        `\`${PREFIX}welcome channel #canal\``
      );
    }

    // ========================================================
    // 🎭 AUTOROLE
    // ========================================================

    if (
      command === "autorole" ||
      ["autoroleon","autoroleoff","autoroleset"].includes(command)
    ) {
      if (
        command === "autoroleon" ||
        args[0] === "on"
      ) {
        g.autorole.enabled = true;
        saveDB();

        return message.reply(
          "🎭 Autorole activado."
        );
      }

      if (
        command === "autoroleoff" ||
        args[0] === "off"
      ) {
        g.autorole.enabled = false;
        saveDB();

        return message.reply(
          "🎭 Autorole desactivado."
        );
      }

      if (
        command === "autoroleset" ||
        args[0] === "set"
      ) {
        const role =
          message.mentions.roles.first();

        if (!role) {
          return message.reply(
            `❌ Usa: \`${PREFIX}autorole set @rol\``
          );
        }

        g.autorole.role = role.id;

        saveDB();

        return message.reply(
          `🎭 Autorole: ${role}`
        );
      }

      return message.reply(
        `🎭 Usa:\n` +
        `\`${PREFIX}autorole on\`\n` +
        `\`${PREFIX}autorole off\`\n` +
        `\`${PREFIX}autorole set @rol\``
      );
    }

    // ========================================================
    // 🔗 ANTI-LINK
    // ========================================================

    if (command === "antilink") {
      const option =
        args[0]?.toLowerCase();

      if (option === "on") {
        g.antilink.enabled = true;
        saveDB();

        return message.reply(
          "🔗 Anti-Link activado."
        );
      }

      if (option === "off") {
        g.antilink.enabled = false;
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
            `🔗 ${g.antilink.whitelist.join(", ")}`
          );
        }

        if (!g.antilink.whitelist.includes(domain)) {
          g.antilink.whitelist.push(domain);
        }

        saveDB();

        return message.reply(
          `✅ Permitido: **${domain}**`
        );
      }

      if (option === "remove") {
        const domain =
          args[1]?.toLowerCase();

        g.antilink.whitelist =
          g.antilink.whitelist.filter(
            x => x !== domain
          );

        saveDB();

        return message.reply(
          "✅ Dominio eliminado."
        );
      }

      return message.reply(
        `🔗 \`${PREFIX}antilink on/off\`\n` +
        `\`${PREFIX}antilink whitelist dominio.com\``
      );
    }

    // ========================================================
    // 💬 ANTISPAM
    // ========================================================

    if (command === "antispam") {
      const option =
        args[0]?.toLowerCase();

      if (option === "on") {
        g.antispam.enabled = true;
        saveDB();

        return message.reply(
          "💬 Anti-Spam activado."
        );
      }

      if (option === "off") {
        g.antispam.enabled = false;
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

        g.antispam.maxMessages =
          amount;

        saveDB();

        return message.reply(
          `✅ Límite: **${amount} mensajes**.`
        );
      }

      return message.reply(
        `💬 \`${PREFIX}antispam on/off\`\n` +
        `\`${PREFIX}antispam limit 5\``
      );
    }

    // ========================================================
    // 🚨 ANTIRAID
    // ========================================================

    if (command === "antiraid") {
      const option =
        args[0]?.toLowerCase();

      if (option === "on") {
        g.antiraid.enabled = true;
        saveDB();

        return message.reply(
          "🚨 Anti-Raid activado."
        );
      }

      if (option === "off") {
        g.antiraid.enabled = false;
        saveDB();

        return message.reply(
          "🚨 Anti-Raid desactivado."
        );
      }

      if (option === "limit") {
        const n =
          parseInt(args[1]);

        if (!n || n < 2) {
          return message.reply(
            `❌ Usa: \`${PREFIX}antiraid limit 5\``
          );
        }

        g.antiraid.limit = n;

        saveDB();

        return message.reply(
          `🚨 Límite: **${n} entradas**.`
        );
      }

      if (option === "time") {
        const n =
          parseInt(args[1]);

        if (!n || n < 1) {
          return message.reply(
            `❌ Usa: \`${PREFIX}antiraid time 10\``
          );
        }

        g.antiraid.seconds = n;

        saveDB();

        return message.reply(
          `⏱️ Tiempo: **${n}s**.`
        );
      }

      return message.reply(
        `🚨 \`${PREFIX}antiraid on/off\`\n` +
        `\`${PREFIX}antiraid limit 5\`\n` +
        `\`${PREFIX}antiraid time 10\``
      );
    }

    // ========================================================
    // 🔒 CHANNEL PROTECT
    // ========================================================

    if (command === "channelprotect") {
      const option =
        args[0]?.toLowerCase();

      if (option === "on") {
        g.channelProtection.enabled = true;
        saveDB();

        return message.reply(
          "🔒 Protección activada."
        );
      }

      if (option === "off") {
        g.channelProtection.enabled = false;
        saveDB();

        return message.reply(
          "🔓 Protección desactivada."
        );
      }

      if (option === "user") {
        const target =
          message.mentions.users.first();

        if (!target) {
          return message.reply(
            "❌ Menciona un usuario."
          );
        }

        if (!g.channelProtection.whitelistUsers.includes(target.id)) {
          g.channelProtection.whitelistUsers.push(target.id);
        }

        saveDB();

        return message.reply(
          `✅ ${target} añadido a la whitelist.`
        );
      }

      if (option === "role") {
        const role =
          message.mentions.roles.first();

        if (!role) {
          return message.reply(
            "❌ Menciona un rol."
          );
        }

        if (!g.channelProtection.whitelistRoles.includes(role.id)) {
          g.channelProtection.whitelistRoles.push(role.id);
        }

        saveDB();

        return message.reply(
          `✅ ${role} añadido a la whitelist.`
        );
      }

      return message.reply(
        `🔒 \`${PREFIX}channelprotect on/off\`\n` +
        `\`${PREFIX}channelprotect user @usuario\`\n` +
        `\`${PREFIX}channelprotect role @rol\``
      );
    }

    // ========================================================
    // ⚙️ SETTINGS
    // ========================================================

    if (
      ["settings","security","economyconfig","shopconfig","shopadmin"]
        .includes(command)
    ) {
      return message.reply(
        `⚙️ **CONFIGURACIÓN**\n\n` +
        `📝 Logs: ${g.logsChannel ? `<#${g.logsChannel}>` : "OFF"}\n` +
        `🚨 Anti-Raid: ${g.antiraid.enabled ? "ON" : "OFF"}\n` +
        `🔗 Anti-Link: ${g.antilink.enabled ? "ON" : "OFF"}\n` +
        `💬 Anti-Spam: ${g.antispam.enabled ? "ON" : "OFF"}\n` +
        `👋 Welcome: ${g.welcome.enabled ? "ON" : "OFF"}\n` +
        `🎭 Autorole: ${g.autorole.enabled ? "ON" : "OFF"}\n` +
        `🛒 Productos: **${Object.keys(g.shop.roles).length}**`
      );
    }

    // ========================================================
    // ❌ COMANDO DESCONOCIDO
    // ========================================================

    return message.reply(
      `❌ Comando desconocido.\n` +
      `📖 Usa \`${PREFIX}help\` para ver el menú.`
    );

  } catch (error) {
    console.error("❌ ERROR:", error);

    await message.reply(
      "❌ Ocurrió un error ejecutando el comando."
    ).catch(() => {});
  }
});

// ============================================================
// ❌ ERRORES
// ============================================================

client.on(Events.Error, error => {
  console.error("❌ Discord Error:", error);
});

client.on(Events.Warn, warning => {
  console.warn("⚠️ Discord:", warning);
});

process.on("unhandledRejection", error => {
  console.error("❌ Unhandled Rejection:", error);
});

process.on("uncaughtException", error => {
  console.error("❌ Uncaught Exception:", error);
});

// ============================================================
// 🔐 LOGIN
// ============================================================

if (!process.env.DISCORD_TOKEN) {
  console.error(
    "❌ FALTA DISCORD_TOKEN EN RENDER."
  );

  process.exit(1);
}

console.log(
  "🔄 Conectando Naruto Uzumaki..."
);

client.login(
  process.env.DISCORD_TOKEN
).then(() => {
  console.log("🍥 Naruto Uzumaki conectado.");
}).catch(error => {
  console.error(
    "❌ ERROR AL INICIAR DISCORD:",
    error
  );
});
