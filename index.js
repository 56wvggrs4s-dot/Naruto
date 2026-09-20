const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  EmbedBuilder,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const http = require("http");

// ============================================================
// 🍥 JOSHUA — NARUTO UZUMAKI
// ============================================================
// PREFIX: N!
// DISCORD.JS: 14
// ============================================================

const PREFIX = "N!";
const DATA_FILE = path.join(__dirname, "data.json");

// ============================================================
// 🌐 RENDER
// ============================================================

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end("🍥 Joshua Naruto Uzumaki está conectado.");
}).listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Servidor HTTP iniciado en ${PORT}`);
});

// ============================================================
// 🤖 CLIENT
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
// 🎨 DECORACIÓN
// ============================================================

const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
const SHORT_LINE = "━━━━━━━━━━━━━━━━━━━━";

// ============================================================
// 💾 DATABASE
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
    console.error("❌ Error guardando DB:", error);
  }
}

function loadDB() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      saveDB();
      return;
    }

    const raw = fs.readFileSync(
      DATA_FILE,
      "utf8"
    );

    if (!raw.trim()) {
      saveDB();
      return;
    }

    const parsed = JSON.parse(raw);

    db.users = parsed.users || {};
    db.guilds = parsed.guilds || {};
  } catch (error) {
    console.error("❌ Error cargando DB:", error);

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
      work: 0,
      messages: 0,
      commands: 0,
      lastDaily: 0,
      lastWork: 0
    };
  }

  const u = db.users[id];

  if (typeof u.money !== "number") u.money = 100;
  if (typeof u.bank !== "number") u.bank = 0;
  if (typeof u.xp !== "number") u.xp = 0;
  if (typeof u.level !== "number") u.level = 1;
  if (typeof u.reps !== "number") u.reps = 0;
  if (typeof u.warnings !== "number") u.warnings = 0;
  if (typeof u.daily !== "number") u.daily = 0;
  if (typeof u.work !== "number") u.work = 0;
  if (typeof u.messages !== "number") u.messages = 0;
  if (typeof u.commands !== "number") u.commands = 0;
  if (typeof u.lastDaily !== "number") u.lastDaily = 0;
  if (typeof u.lastWork !== "number") u.lastWork = 0;

  if (typeof u.bio !== "string") {
    u.bio = "Sin biografía.";
  }

  return u;
}

// ============================================================
// 🏠 SERVIDORES
// ============================================================

function defaultGuild() {
  return {
    logsChannel: null,

    // 🔗 ANTILINK
    antilink: {
      enabled: false,
      timeout: 2 * 60 * 60 * 1000,
      whitelist: [
        "discord.com",
        "discord.gg"
      ]
    },

    // 🤖 ANTIRAID
    antiraid: {
      enabled: false,

      // IDs de bots permitidos
      botWhitelist: [],

      // Usuarios que pueden saltarse ciertas protecciones
      userWhitelist: [],

      // Roles que pueden saltarse ciertas protecciones
      roleWhitelist: []
    },

    // 🛡️ ANTICANALES / ANTIROLES
    protection: {
      enabled: false,

      userWhitelist: [],
      roleWhitelist: [],

      protectChannels: true,
      protectRoles: true,

      kickReason:
        "Joshua Anti-Protection"
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

  if (!g.antilink) {
    g.antilink = defaultGuild().antilink;
  }

  if (!Array.isArray(g.antilink.whitelist)) {
    g.antilink.whitelist = [
      "discord.com",
      "discord.gg"
    ];
  }

  if (!g.antiraid) {
    g.antiraid = defaultGuild().antiraid;
  }

  if (!Array.isArray(g.antiraid.botWhitelist)) {
    g.antiraid.botWhitelist = [];
  }

  if (!Array.isArray(g.antiraid.userWhitelist)) {
    g.antiraid.userWhitelist = [];
  }

  if (!Array.isArray(g.antiraid.roleWhitelist)) {
    g.antiraid.roleWhitelist = [];
  }

  if (!g.protection) {
    g.protection = defaultGuild().protection;
  }

  if (!Array.isArray(g.protection.userWhitelist)) {
    g.protection.userWhitelist = [];
  }

  if (!Array.isArray(g.protection.roleWhitelist)) {
    g.protection.roleWhitelist = [];
  }

  if (!g.welcome) {
    g.welcome = defaultGuild().welcome;
  }

  if (!g.autorole) {
    g.autorole = defaultGuild().autorole;
  }

  if (!g.shop) {
    g.shop = {
      roles: {}
    };
  }

  if (!g.shop.roles) {
    g.shop.roles = {};
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
  return member?.guild?.ownerId === member?.id;
}

// ============================================================
// 🛡️ WHITELIST
// ============================================================

function isWhitelisted(member, settings) {
  if (!member) return false;

  if (
    settings.userWhitelist.includes(
      member.id
    )
  ) {
    return true;
  }

  return member.roles.cache.some(role =>
    settings.roleWhitelist.includes(role.id)
  );
}

function isProtectionWhitelisted(
  member,
  settings
) {
  if (!member) return false;

  if (
    settings.userWhitelist.includes(
      member.id
    )
  ) {
    return true;
  }

  return member.roles.cache.some(role =>
    settings.roleWhitelist.includes(role.id)
  );
}

// ============================================================
// 📝 LOGS
// ============================================================

async function sendLog(guild, embed) {
  try {
    const settings =
      getGuild(guild.id);

    if (!settings.logsChannel) return;

    const channel =
      guild.channels.cache.get(
        settings.logsChannel
      );

    if (
      channel &&
      channel.isTextBased()
    ) {
      await channel.send({
        embeds: [embed]
      }).catch(() => {});
    }
  } catch {}
}

// ============================================================
// 📩 MENSAJES LARGOS
// ============================================================

async function sendLongMessage(
  channel,
  content
) {
  const text = String(content);

  if (text.length <= 2000) {
    return channel.send(text);
  }

  for (
    let i = 0;
    i < text.length;
    i += 1900
  ) {
    await channel.send(
      text.slice(i, i + 1900)
    );
  }
}

async function replyLong(
  message,
  content
) {
  const text = String(content);

  if (text.length <= 2000) {
    return message.reply(text);
  }

  await message.reply(
    text.slice(0, 1900)
  );

  for (
    let i = 1900;
    i < text.length;
    i += 1900
  ) {
    await message.channel.send(
      text.slice(i, i + 1900)
    );
  }
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

  while (
    user.xp >= user.level * 100
  ) {
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
// 📚 CATEGORÍAS
// ============================================================

const categories = {
  economia: {
    name: "💰 Economía",
    description:
      "💵 Administra tu dinero, banco y recompensas.",
    commands: [
      ["balance", "Ver tu dinero"],
      ["daily", "Recompensa diaria"],
      ["work", "Trabajar y ganar dinero"],
      ["pay", "Pagar a otro usuario"],
      ["deposit", "Depositar dinero"],
      ["withdraw", "Retirar dinero"],
      ["bank", "Ver tu banco"],
      ["richest", "Ver los más ricos"],
      ["money", "Ver tu dinero"],
      ["economy", "Ver información económica"],
      ["cash", "Ver efectivo"],
      ["wallet", "Ver cartera"],
      ["coins", "Ver monedas"],
      ["salary", "Cobrar salario"],
      ["job", "Trabajar"],
      ["depositall", "Depositar todo"],
      ["withdrawall", "Retirar todo"],
      ["mymoney", "Ver tu dinero"],
      ["wealth", "Ver tu patrimonio"],
      ["payall", "Enviar dinero"]
    ]
  },

  rank: {
    name: "🏆 Rangos",
    description:
      "⭐ Mira tu nivel, XP y posiciones.",
    commands: [
      ["rank", "Ver tu rango"],
      ["level", "Ver tu nivel"],
      ["xp", "Ver tu XP"],
      ["leaderboard", "Tabla de posiciones"],
      ["top", "Top de usuarios"],
      ["rankcard", "Tarjeta de rango"],
      ["rewards", "Ver recompensas"],
      ["levels", "Información de niveles"],
      ["mylevel", "Ver mi nivel"],
      ["myxp", "Ver mi XP"],
      ["xptop", "Top de XP"],
      ["leveltop", "Top de niveles"],
      ["progress", "Ver progreso"],
      ["nextlevel", "Ver siguiente nivel"],
      ["globalrank", "Ver ranking"],
      ["guildrank", "Ranking del servidor"],
      ["xpinfo", "Información de XP"],
      ["ranking", "Ranking general"],
      ["stats", "Ver estadísticas"],
      ["progressbar", "Ver barra de progreso"]
    ]
  },

  social: {
    name: "👤 Social",
    description:
      "✨ Mira información y perfiles.",
    commands: [
      ["profile", "Ver perfil"],
      ["avatar", "Ver avatar"],
      ["banner", "Ver banner"],
      ["bio", "Ver biografía"],
      ["setbio", "Cambiar biografía"],
      ["rep", "Dar reputación"],
      ["reps", "Ver reputación"],
      ["userinfo", "Información del usuario"],
      ["aboutme", "Ver información personal"],
      ["member", "Información del miembro"],
      ["joined", "Ver cuándo entró"],
      ["created", "Ver creación de cuenta"],
      ["rolesme", "Ver tus roles"],
      ["mention", "Mencionar usuario"],
      ["id", "Ver ID"],
      ["account", "Información de cuenta"],
      ["social", "Ver perfil social"],
      ["whois", "Información de usuario"],
      ["user", "Buscar usuario"],
      ["me", "Ver mi perfil"]
    ]
  },

  servidor: {
    name: "🏠 Servidor",
    description:
      "🏠 Información de este servidor.",
    commands: [
      ["serverinfo", "Información del servidor"],
      ["botinfo", "Información de Joshua"],
      ["servericon", "Icono del servidor"],
      ["roleinfo", "Información de un rol"],
      ["channelinfo", "Información de canal"],
      ["rolelist", "Lista de roles"],
      ["membercount", "Cantidad de miembros"],
      ["members", "Ver miembros"],
      ["channels", "Ver canales"],
      ["roles", "Ver roles"],
      ["emojis", "Ver emojis"],
      ["stickers", "Ver stickers"],
      ["boosts", "Ver boosts"],
      ["owner", "Ver propietario"],
      ["createdserver", "Fecha de creación"],
      ["serverid", "ID del servidor"],
      ["invite", "Información de invitaciones"],
      ["ping", "Ver ping"],
      ["stats", "Estadísticas"]
    ]
  },

  diversion: {
    name: "🎮 Diversión",
    description:
      "🎉 Comandos para pasarla bien.",
    commands: [
      ["8ball", "Pregunta al 8ball"],
      ["dice", "Tirar dados"],
      ["rps", "Piedra, papel o tijera"],
      ["joke", "Contar un chiste"],
      ["choose", "Elegir una opción"],
      ["reverse", "Invertir texto"],
      ["say", "Repetir texto"],
      ["random", "Número aleatorio"],
      ["coinflip", "Lanzar moneda"],
      ["roll", "Tirar dado"],
      ["number", "Número aleatorio"],
      ["truth", "Pregunta de verdad"],
      ["dare", "Reto divertido"],
      ["rate", "Puntuar algo"],
      ["roast", "Broma ligera"],
      ["compliment", "Cumplido"],
      ["meme", "Meme aleatorio"],
      ["cat", "Dato de gato"],
      ["ninja", "Modo ninja"],
      ["luck", "Tu suerte"]
    ]
  },

  tienda: {
    name: "🛒 Tienda",
    description:
      "🛍️ Compra roles y objetos del servidor.",
    commands: [
      ["tienda", "Abrir tienda"],
      ["shop", "Abrir tienda"],
      ["comprar", "Comprar producto"],
      ["buy", "Comprar producto"],
      ["productos", "Ver productos"],
      ["catalogo", "Ver catálogo"],
      ["precios", "Ver precios"],
      ["roleshop", "Roles de la tienda"],
      ["rolshop", "Roles disponibles"],
      ["shoplist", "Lista de tienda"],
      ["shopinfo", "Información de tienda"],
      ["items", "Ver objetos"],
      ["item", "Ver objeto"],
      ["purchase", "Comprar"],
      ["myroles", "Ver roles comprados"],
      ["owned", "Ver tus objetos"],
      ["store", "Abrir tienda"],
      ["market", "Mercado"],
      ["inventory", "Inventario"],
      ["inv", "Inventario"]
    ]
  }
};

// ============================================================
// 🔐 CATEGORÍAS ADMIN
// ============================================================

const adminCategories = {
  moderacion: {
    name: "🛡️ Moderación",
    commands: [
      ["ban", "Banear usuario"],
      ["kick", "Expulsar usuario"],
      ["timeout", "Silenciar temporalmente"],
      ["untimeout", "Quitar timeout"],
      ["warn", "Advertir"],
      ["warnings", "Ver advertencias"],
      ["clear", "Borrar mensajes"],
      ["lock", "Bloquear canal"],
      ["unlock", "Desbloquear canal"],
      ["slowmode", "Configurar slowmode"],
      ["nick", "Cambiar apodo"],
      ["resetnick", "Restablecer apodo"],
      ["unban", "Desbanear"],
      ["softban", "Softban"],
      ["modlog", "Ver configuración"]
    ]
  },

  seguridad: {
    name: "🔒 Seguridad",
    commands: [
      ["antilink", "Configurar AntiLink"],
      ["antiraid", "Configurar AntiRaid"],
      ["antiprotect", "Configurar protección"],
      ["whitelist", "Administrar whitelist"],
      ["security", "Ver seguridad"],
      ["settings", "Ver configuración"],
      ["logs", "Ver logs"],
      ["setlogs", "Configurar logs"],
      ["disablelogs", "Desactivar logs"],
      ["testlogs", "Probar logs"],
      ["welcome", "Configurar bienvenida"],
      ["welcomeon", "Activar bienvenida"],
      ["welcomeoff", "Desactivar bienvenida"],
      ["autorole", "Configurar autorole"],
      ["autoroleon", "Activar autorole"],
      ["autoroleoff", "Desactivar autorole"]
    ]
  },

  roles: {
    name: "🎭 Roles",
    commands: [
      ["rolecreate", "Crear rol"],
      ["roledelete", "Eliminar rol"],
      ["roleadd", "Dar rol"],
      ["roleremove", "Quitar rol"],
      ["giverole", "Dar rol"],
      ["takerole", "Quitar rol"],
      ["addrole", "Añadir rol"],
      ["removerole", "Remover rol"],
      ["createrole", "Crear rol"],
      ["deleterole", "Eliminar rol"],
      ["editrole", "Editar rol"],
      ["rolecolor", "Cambiar color"],
      ["rolename", "Cambiar nombre"],
      ["rolehoist", "Cambiar hoist"],
      ["rolemention", "Cambiar mentionable"]
    ]
  },

  economia: {
    name: "💰 Economía Admin",
    commands: [
      ["addmoney", "Dar dinero"],
      ["removemoney", "Quitar dinero"],
      ["setmoney", "Establecer dinero"],
      ["givecash", "Dar efectivo"],
      ["takecash", "Quitar efectivo"],
      ["addxp", "Dar XP"],
      ["removexp", "Quitar XP"],
      ["setxp", "Establecer XP"],
      ["setlevel", "Establecer nivel"],
      ["resetmoney", "Resetear dinero"],
      ["resetxp", "Resetear XP"],
      ["resetuser", "Resetear usuario"],
      ["givebank", "Dar dinero bancario"],
      ["takebank", "Quitar dinero bancario"],
      ["bankset", "Establecer banco"]
    ]
  },

  tienda: {
    name: "🛒 Tienda Admin",
    commands: [
      ["shopadd", "Añadir producto"],
      ["shopremove", "Eliminar producto"],
      ["shopprice", "Cambiar precio"],
      ["shopedit", "Editar producto"],
      ["shoplist", "Ver tienda"],
      ["shopclear", "Vaciar tienda"],
      ["shopreset", "Resetear tienda"],
      ["shopconfig", "Configurar tienda"]
    ]
  }
};

// ============================================================
// 📖 HELP EMBED PRINCIPAL
// ============================================================

function publicHelpEmbed() {
  return new EmbedBuilder()
    .setColor(0xff6b00)
    .setTitle("🍥 JOSHUA — CENTRO DE AYUDA")
    .setDescription(
      "╭────────────────────────────╮\n" +
      "│ 🥷 **¡Bienvenido al centro de ayuda!**\n" +
      "╰────────────────────────────╯\n\n" +
      "Selecciona una categoría en el menú de abajo para ver sus comandos.\n\n" +
      `⚡ **Prefix:** \`${PREFIX}\`\n` +
      "📚 Cada categoría contiene **20 comandos**.\n" +
      "🔐 Los comandos administrativos requieren permisos."
    )
    .addFields(
      {
        name: "💰 Economía",
        value: "Dinero, banco, recompensas y pagos.",
        inline: true
      },
      {
        name: "🏆 Rangos",
        value: "XP, niveles y rankings.",
        inline: true
      },
      {
        name: "👤 Social",
        value: "Perfiles, usuarios y reputación.",
        inline: true
      },
      {
        name: "🏠 Servidor",
        value: "Información del servidor.",
        inline: true
      },
      {
        name: "🎮 Diversión",
        value: "Juegos y comandos divertidos.",
        inline: true
      },
      {
        name: "🛒 Tienda",
        value: "Roles y productos.",
        inline: true
      }
    )
    .setFooter({
      text:
        `🍥 Joshua • ${client.guilds.cache.size} servidores`
    });
}

// ============================================================
// 📋 SELECT PÚBLICO
// ============================================================

function publicHelpComponents(
  userId,
  admin = false
) {
  const menu =
    new StringSelectMenuBuilder()
      .setCustomId(
        `help_public_${userId}`
      )
      .setPlaceholder(
        "📚 Selecciona una categoría..."
      )
      .addOptions(
        Object.entries(categories)
          .map(([value, category]) => ({
            label: category.name
              .replace(/[^\p{L}\p{N}\s]/gu, "")
              .trim(),

            description:
              category.description
                .slice(0, 100),

            value,
            emoji:
              category.name
                .match(/^\p{Emoji}/u)?.[0] ||
              "📚"
          }))
      );

  const row =
    new ActionRowBuilder()
      .addComponents(menu);

  const rows = [row];

  if (admin) {
    rows.push(
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              `help_open_admin_${userId}`
            )
            .setLabel("🔐 Panel Administrativo")
            .setStyle(ButtonStyle.Danger)
        )
    );
  }

  return rows;
}

// ============================================================
// 🔐 ADMIN HELP
// ============================================================

function adminHelpEmbed() {
  return new EmbedBuilder()
    .setColor(0x8b0000)
    .setTitle("🔐 JOSHUA — PANEL ADMIN")
    .setDescription(
      "╭────────────────────────────╮\n" +
      "│ 🛡️ **Panel administrativo**\n" +
      "╰────────────────────────────╯\n\n" +
      "Selecciona una categoría para ver los comandos.\n\n" +
      "⚠️ Estos comandos requieren permisos de administración."
    )
    .addFields(
      {
        name: "🛡️ Moderación",
        value: "Ban, kick, timeout, warn, clear...",
        inline: true
      },
      {
        name: "🔒 Seguridad",
        value: "AntiLink, AntiRaid y protección.",
        inline: true
      },
      {
        name: "🎭 Roles",
        value: "Crear y administrar roles.",
        inline: true
      },
      {
        name: "💰 Economía",
        value: "Administrar dinero y XP.",
        inline: true
      },
      {
        name: "🛒 Tienda",
        value: "Administrar productos.",
        inline: true
      }
    )
    .setFooter({
      text: "🔐 Joshua Administration"
    });
}

function adminHelpComponents(userId) {
  const menu =
    new StringSelectMenuBuilder()
      .setCustomId(
        `help_admin_${userId}`
      )
      .setPlaceholder(
        "🔐 Selecciona una categoría..."
      )
      .addOptions(
        Object.entries(adminCategories)
          .map(([value, category]) => ({
            label:
              category.name
                .replace(/[^\p{L}\p{N}\s]/gu, "")
                .trim(),

            description:
              `Ver comandos de ${category.name}`
                .slice(0, 100),

            value,
            emoji:
              category.name
                .match(/^\p{Emoji}/u)?.[0] ||
              "🔐"
          }))
      );

  return [
    new ActionRowBuilder()
      .addComponents(menu),

    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `help_admin_back_${userId}`
          )
          .setLabel("◀️ Menú público")
          .setStyle(ButtonStyle.Secondary)
      )
  ];
}

// ============================================================
// 📚 CATEGORY EMBED
// ============================================================

function categoryEmbed(categoryKey) {
  const category =
    categories[categoryKey];

  if (!category) {
    return publicHelpEmbed();
  }

  const list =
    category.commands
      .map(
        ([command, description], index) =>
          `**${String(index + 1).padStart(2, "0")}.** \`${PREFIX}${command}\` — ${description}`
      )
      .join("\n");

  return new EmbedBuilder()
    .setColor(0xff6b00)
    .setTitle(
      `${category.name} — COMANDOS`
    )
    .setDescription(
      `${category.description}\n\n` +
      `${SHORT_LINE}\n` +
      `${list}`
    )
    .setFooter({
      text:
        `Selecciona otra categoría • Prefix: ${PREFIX}`
    });
}

function adminCategoryEmbed(categoryKey) {
  const category =
    adminCategories[categoryKey];

  if (!category) {
    return adminHelpEmbed();
  }

  const list =
    category.commands
      .map(
        ([command, description], index) =>
          `**${String(index + 1).padStart(2, "0")}.** \`${PREFIX}${command}\` — ${description}`
      )
      .join("\n");

  return new EmbedBuilder()
    .setColor(0x8b0000)
    .setTitle(
      `${category.name} — ADMIN`
    )
    .setDescription(
      `🔐 Comandos administrativos\n\n` +
      `${SHORT_LINE}\n` +
      `${list}`
    )
    .setFooter({
      text:
        "⚠️ Solo administradores"
    });
}

// ============================================================
// 🚀 READY
// ============================================================

client.once(
  Events.ClientReady,
  ready => {
    console.log("");
    console.log("======================================");
    console.log("🍥 JOSHUA — NARUTO UZUMAKI");
    console.log("======================================");
    console.log(`🤖 ${ready.user.tag}`);
    console.log(
      `🏠 Servidores: ${ready.guilds.cache.size}`
    );
    console.log(`⚡ Prefix: ${PREFIX}`);
    console.log(
      `📡 Ping: ${ready.ws.ping}ms`
    );
    console.log("🟢 CONECTADO");
    console.log("======================================");

    ready.user.setActivity(
      `${PREFIX}help | Naruto Uzumaki`
    );
  }
);

// ============================================================
// 🤖 ANTIRAID — BOTS
// ============================================================

client.on(
  Events.GuildMemberAdd,
  async member => {
    try {
      const g =
        getGuild(member.guild.id);

      // AUTOROLE
      if (
        !member.user.bot &&
        g.autorole.enabled &&
        g.autorole.role
      ) {
        const role =
          member.guild.roles.cache.get(
            g.autorole.role
          );

        if (
          role &&
          role.editable
        ) {
          await member.roles
            .add(
              role,
              "Joshua Autorole"
            )
            .catch(() => {});
        }
      }

      // BIENVENIDA
      if (
        !member.user.bot &&
        g.welcome.enabled &&
        g.welcome.channel
      ) {
        const channel =
          member.guild.channels.cache.get(
            g.welcome.channel
          );

        if (
          channel &&
          channel.isTextBased()
        ) {
          await channel.send(
            `╔════════════════════════════╗\n` +
            `║ 🍥 **NUEVO NINJA** 🍥 ║\n` +
            `╚════════════════════════════╝\n\n` +
            `👋 ¡Bienvenido/a ${member}!\n` +
            `🏠 **${member.guild.name}**\n\n` +
            `🥷 ¡Comienza tu camino ninja!`
          ).catch(() => {});
        }
      }

      // ========================================================
      // 🤖 ANTIRAID
      // ========================================================

      if (
        member.user.bot &&
        g.antiraid.enabled
      ) {
        const allowed =
          g.antiraid.botWhitelist
            .includes(
              member.user.id
            );

        if (!allowed) {
          console.log(
            `🚨 ANTIRAID: bot no autorizado ${member.user.tag}`
          );

          await member.ban({
            deleteMessageSeconds: 0,
            reason:
              "Joshua AntiRaid — Bot no autorizado"
          }).catch(() => {});

          await sendLog(
            member.guild,
            new EmbedBuilder()
              .setColor(0xff0000)
              .setTitle(
                "🚨 ANTIRAID — BOT BLOQUEADO"
              )
              .setDescription(
                `🤖 **Bot:** ${member.user.tag}\n` +
                `🆔 **ID:** ${member.user.id}\n\n` +
                `🔨 Acción: **BAN PERMANENTE**\n` +
                `📋 Motivo: Bot no incluido en la whitelist.`
              )
              .setTimestamp()
          );
        }
      }
    } catch (error) {
      console.error(
        "❌ GuildMemberAdd:",
        error
      );
    }
  }
);

// ============================================================
// 🔎 AUDIT LOG HELPER
// ============================================================

async function findAuditExecutor(
  guild,
  action,
  targetId
) {
  try {
    const logs =
      await guild.fetchAuditLogs({
        type: action,
        limit: 5
      });

    const entry =
      logs.entries.find(
        e =>
          e.target?.id === targetId &&
          Date.now() - e.createdTimestamp < 15000
      );

    return entry || null;
  } catch (error) {
    console.error(
      "❌ Error leyendo Audit Logs:",
      error
    );

    return null;
  }
}

// ============================================================
// 🛡️ PROTECCIÓN DE CANALES
// ============================================================

async function punishChannelExecutor(
  channel,
  actionText
) {
  try {
    const g =
      getGuild(
        channel.guild.id
      );

    if (
      !g.protection.enabled ||
      !g.protection.protectChannels
    ) {
      return;
    }

    const action =
      await findAuditExecutor(
        channel.guild,
        actionText === "creó"
          ? 10
          : 12,
        channel.id
      );

    if (!action) return;

    const executor =
      action.executor;

    if (!executor) return;

    if (
      executor.id === client.user.id
    ) {
      return;
    }

    const member =
      await channel.guild.members
        .fetch(executor.id)
        .catch(() => null);

    if (!member) return;

    if (
      isProtectionWhitelisted(
        member,
        g.protection
      )
    ) {
      return;
    }

    if (
      member.id === channel.guild.ownerId
    ) {
      return;
    }

    if (
      !member.kickable
    ) {
      await sendLog(
        channel.guild,
        new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle(
            "🚨 PROTECCIÓN — NO SE PUDO EXPULSAR"
          )
          .setDescription(
            `👤 Usuario: ${member.user.tag}\n` +
            `📋 Acción detectada: ${actionText} un canal\n` +
            `❌ Joshua no pudo expulsarlo.`
          )
          .setTimestamp()
      );

      return;
    }

    await member.kick(
      `${g.protection.kickReason} — ${actionText} un canal sin whitelist`
    ).catch(() => {});

    await sendLog(
      channel.guild,
      new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(
          "🛡️ ANTI-CANALES ACTIVADO"
        )
        .setDescription(
          `👤 **Usuario:** ${member.user.tag}\n` +
          `📋 **Acción:** ${actionText} un canal\n` +
          `🔨 **Sanción:** Kick\n` +
          `📝 **Canal:** ${channel.name}\n\n` +
          `❌ Usuario no estaba en la whitelist.`
        )
        .setTimestamp()
    );
  } catch (error) {
    console.error(
      "❌ Protección canales:",
      error
    );
  }
}

// ============================================================
// 🛡️ CANAL CREADO
// ============================================================

client.on(
  Events.ChannelCreate,
  async channel => {
    if (!channel.guild) return;

    await punishChannelExecutor(
      channel,
      "creó"
    );
  }
);

// ============================================================
// 🛡️ CANAL ELIMINADO
// ============================================================

client.on(
  Events.ChannelDelete,
  async channel => {
    if (!channel.guild) return;

    await punishChannelExecutor(
      channel,
      "eliminó"
    );
  }
);

// ============================================================
// 🎭 PROTECCIÓN DE ROLES
// ============================================================

async function punishRoleExecutor(
  role,
  actionText
) {
  try {
    const g =
      getGuild(role.guild.id);

    if (
      !g.protection.enabled ||
      !g.protection.protectRoles
    ) {
      return;
    }

    const action =
      await findAuditExecutor(
        role.guild,
        actionText === "creó"
          ? 30
          : 32,
        role.id
      );

    if (!action) return;

    const executor =
      action.executor;

    if (!executor) return;

    if (
      executor.id === client.user.id
    ) {
      return;
    }

    const member =
      await role.guild.members
        .fetch(executor.id)
        .catch(() => null);

    if (!member) return;

    if (
      isProtectionWhitelisted(
        member,
        g.protection
      )
    ) {
      return;
    }

    if (
      member.id === role.guild.ownerId
    ) {
      return;
    }

    if (!member.kickable) {
      await sendLog(
        role.guild,
        new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle(
            "🚨 PROTECCIÓN — NO SE PUDO EXPULSAR"
          )
          .setDescription(
            `👤 ${member.user.tag}\n` +
            `📋 Acción: ${actionText} un rol\n` +
            `❌ Joshua no pudo expulsarlo.`
          )
          .setTimestamp()
      );

      return;
    }

    await member.kick(
      `${g.protection.kickReason} — ${actionText} un rol sin whitelist`
    ).catch(() => {});

    await sendLog(
      role.guild,
      new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(
          "🎭 ANTI-ROLES ACTIVADO"
        )
        .setDescription(
          `👤 **Usuario:** ${member.user.tag}\n` +
          `📋 **Acción:** ${actionText} un rol\n` +
          `🔨 **Sanción:** Kick\n` +
          `🎭 **Rol:** ${role.name}\n\n` +
          `❌ Usuario no estaba en la whitelist.`
        )
        .setTimestamp()
    );
  } catch (error) {
    console.error(
      "❌ Protección roles:",
      error
    );
  }
}

// ============================================================
// 🎭 ROL CREADO
// ============================================================

client.on(
  Events.GuildRoleCreate,
  async role => {
    await punishRoleExecutor(
      role,
      "creó"
    );
  }
);

// ============================================================
// 🎭 ROL ELIMINADO
// ============================================================

client.on(
  Events.GuildRoleDelete,
  async role => {
    await punishRoleExecutor(
      role,
      "eliminó"
    );
  }
);

// ============================================================
// 🔗 ANTILINK
// ============================================================

client.on(
  Events.MessageCreate,
  async message => {
    try {
      if (
        !message.guild ||
        message.author.bot
      ) {
        return;
      }

      const g =
        getGuild(
          message.guild.id
        );

      if (!g.antilink.enabled) {
        return;
      }

      if (
        isAdmin(message.member)
      ) {
        return;
      }

      const hasLink =
        /(https?:\/\/|www\.|discord\.gg\/|discord\.com\/invite\/)/i
          .test(
            message.content
          );

      if (!hasLink) {
        return;
      }

      const text =
        message.content.toLowerCase();

      const allowed =
        g.antilink.whitelist.some(
          domain =>
            text.includes(
              domain.toLowerCase()
            )
        );

      if (allowed) {
        return;
      }

      await message.delete()
        .catch(() => {});

      if (
        message.member &&
        message.member.moderatable
      ) {
        await message.member.timeout(
          2 * 60 * 60 * 1000,
          "Joshua AntiLink — Envío de enlace"
        ).catch(() => {});
      }

      await sendLog(
        message.guild,
        new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle(
            "🔗 ANTILINK ACTIVADO"
          )
          .setDescription(
            `👤 **Usuario:** ${message.author.tag}\n` +
            `🗑️ **Mensaje:** Eliminado\n` +
            `🔇 **Sanción:** Timeout de 2 horas\n` +
            `📋 **Motivo:** Envío de enlace no permitido.`
          )
          .setTimestamp()
      );
    } catch (error) {
      console.error(
        "❌ AntiLink:",
        error
      );
    }
  }
);

// ============================================================
// 🎮 COMANDOS
// ============================================================

client.on(
  Events.MessageCreate,
  async message => {
    try {
      if (
        !message.guild ||
        message.author.bot
      ) {
        return;
      }

      if (
        !message.content.startsWith(
          PREFIX
        )
      ) {
        return;
      }

      const parts =
        message.content
          .slice(PREFIX.length)
          .trim()
          .split(/\s+/);

      const command =
        parts.shift()?.toLowerCase();

      const args =
        parts;

      if (!command) return;

      const user =
        getUser(
          message.author.id
        );

      const g =
        getGuild(
          message.guild.id
        );

      user.messages++;
      user.commands++;

      const xpResult =
        addXP(user);

      if (
        xpResult.levelUp &&
        ![
          "help",
          "helpadmin"
        ].includes(command)
      ) {
        message.channel.send(
          `🎉 ${message.author} ¡subiste al **nivel ${user.level}**! 🏆`
        ).catch(() => {});
      }

      // ========================================================
      // 🆘 HELP
      // ========================================================

      if (command === "help") {
        return message.reply({
          embeds: [
            publicHelpEmbed()
          ],
          components:
            publicHelpComponents(
              message.author.id,
              isAdmin(
                message.member
              )
            )
        });
      }

      // ========================================================
      // 🔐 HELP ADMIN
      // ========================================================

      if (
        command === "helpadmin"
      ) {
        if (
          !isAdmin(
            message.member
          )
        ) {
          return message.reply(
            "❌ Necesitas permisos de **Administrador**."
          );
        }

        return message.reply({
          embeds: [
            adminHelpEmbed()
          ],
          components:
            adminHelpComponents(
              message.author.id
            )
        });
      }

      // ========================================================
      // 🏓 PING
      // ========================================================

      if (command === "ping") {
        return message.reply(
          `╔══════════════════════╗\n` +
          `║ 🏓 **PONG!**\n` +
          `╚══════════════════════╝\n\n` +
          `📡 Ping: **${client.ws.ping}ms**`
        );
      }

      // ========================================================
      // 💰 ECONOMÍA
      // ========================================================

      if (
        [
          "balance",
          "money",
          "cash",
          "wallet",
          "coins",
          "mymoney",
          "wealth",
          "economy"
        ].includes(command)
      ) {
        return message.reply(
          `╔══════════════════════╗\n` +
          `║ 💰 **TU ECONOMÍA**\n` +
          `╚══════════════════════╝\n\n` +
          `💵 Efectivo: **$${user.money}**\n` +
          `🏦 Banco: **$${user.bank}**\n` +
          `💎 Total: **$${user.money + user.bank}**`
        );
      }

      // ========================================================
      // 🎁 DAILY
      // ========================================================

      if (
        command === "daily"
      ) {
        const now = Date.now();
        const cooldown =
          24 * 60 * 60 * 1000;

        if (
          now - user.lastDaily <
          cooldown
        ) {
          const remaining =
            cooldown -
            (now - user.lastDaily);

          const hours =
            Math.ceil(
              remaining /
              (60 * 60 * 1000)
            );

          return message.reply(
            `⏳ Ya reclamaste tu recompensa.\n` +
            `🕐 Vuelve en aproximadamente **${hours}h**.`
          );
        }

        const reward =
          Math.floor(
            Math.random() * 251
          ) + 250;

        user.money += reward;
        user.lastDaily = now;

        saveDB();

        return message.reply(
          `🎁 **RECOMPENSA DIARIA**\n\n` +
          `💰 Recibiste **$${reward}**.\n` +
          `💵 Ahora tienes **$${user.money}**.`
        );
      }

      // ========================================================
      // 💼 WORK
      // ========================================================

      if (
        [
          "work",
          "job",
          "salary"
        ].includes(command)
      ) {
        const now = Date.now();
        const cooldown =
          60 * 60 * 1000;

        if (
          now - user.lastWork <
          cooldown
        ) {
          const remaining =
            cooldown -
            (now - user.lastWork);

          const minutes =
            Math.ceil(
              remaining /
              60000
            );

          return message.reply(
            `⏳ Ya trabajaste recientemente.\n` +
            `🕐 Vuelve en **${minutes} minutos**.`
          );
        }

        const reward =
          Math.floor(
            Math.random() * 151
          ) + 100;

        user.money += reward;
        user.lastWork = now;

        saveDB();

        return message.reply(
          `💼 **TRABAJO COMPLETADO**\n\n` +
          `💵 Ganaste **$${reward}**.`
        );
      }

      // ========================================================
      // 🏦 BANK
      // ========================================================

      if (
        command === "bank"
      ) {
        return message.reply(
          `🏦 **BANCO**\n\n` +
          `💵 Dinero en banco: **$${user.bank}**`
        );
      }

      // ========================================================
      // ➕ DEPOSIT
      // ========================================================

      if (
        [
          "deposit",
          "depositall"
        ].includes(command)
      ) {
        let amount =
          command === "depositall"
            ? user.money
            : Number(args[0]);

        if (
          !Number.isFinite(amount) ||
          amount <= 0
        ) {
          return message.reply(
            `❌ Usa: \`${PREFIX}deposit <cantidad>\``
          );
        }

        amount =
          Math.floor(amount);

        if (
          amount > user.money
        ) {
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

      // ========================================================
      // ➖ WITHDRAW
      // ========================================================

      if (
        [
          "withdraw",
          "withdrawall"
        ].includes(command)
      ) {
        let amount =
          command === "withdrawall"
            ? user.bank
            : Number(args[0]);

        if (
          !Number.isFinite(amount) ||
          amount <= 0
        ) {
          return message.reply(
            `❌ Usa: \`${PREFIX}withdraw <cantidad>\``
          );
        }

        amount =
          Math.floor(amount);

        if (
          amount > user.bank
        ) {
          return message.reply(
            "❌ No tienes suficiente dinero en el banco."
          );
        }

        user.bank -= amount;
        user.money += amount;

        saveDB();

        return message.reply(
          `💵 Retiraste **$${amount}**.`
        );
      }

      // ========================================================
      // 💸 PAY
      // ========================================================

      if (
        [
          "pay",
          "payall"
        ].includes(command)
      ) {
        const target =
          message.mentions.users.first();

        const amount =
          Number(args[1] || args[0]);

        if (!target) {
          return message.reply(
            `❌ Menciona a alguien.\nEjemplo: \`${PREFIX}pay @usuario 100\``
          );
        }

        if (
          target.id ===
          message.author.id
        ) {
          return message.reply(
            "❌ No puedes pagarte a ti mismo."
          );
        }

        if (
          !Number.isFinite(amount) ||
          amount <= 0
        ) {
          return message.reply(
            "❌ Cantidad inválida."
          );
        }

        if (
          amount > user.money
        ) {
          return message.reply(
            "❌ No tienes suficiente dinero."
          );
        }

        const targetUser =
          getUser(target.id);

        user.money -= amount;
        targetUser.money += amount;

        saveDB();

        return message.reply(
          `💸 Enviaste **$${amount}** a ${target}.`
        );
      }

      // ========================================================
      // 🏆 RANK
      // ========================================================

      if (
        [
          "rank",
          "level",
          "mylevel",
          "progress",
          "progressbar"
        ].includes(command)
      ) {
        const needed =
          user.level * 100;

        const percentage =
          Math.min(
            100,
            Math.floor(
              (user.xp / needed) *
              100
            )
          );

        const filled =
          Math.floor(
            percentage / 10
          );

        const bar =
          "🟧".repeat(filled) +
          "⬛".repeat(
            10 - filled
          );

        return message.reply(
          `╔══════════════════════╗\n` +
          `║ 🏆 **TU RANGO**\n` +
          `╚══════════════════════╝\n\n` +
          `👤 ${message.author}\n` +
          `🏆 Nivel: **${user.level}**\n` +
          `⭐ XP: **${user.xp}/${needed}**\n\n` +
          `${bar} **${percentage}%**`
        );
      }

      // ========================================================
      // ⭐ XP
      // ========================================================

      if (
        [
          "xp",
          "myxp",
          "xpinfo"
        ].includes(command)
      ) {
        return message.reply(
          `⭐ **XP**\n\n` +
          `🏆 Nivel: **${user.level}**\n` +
          `✨ XP: **${user.xp}/${user.level * 100}**`
        );
      }

      // ========================================================
      // 👤 PROFILE
      // ========================================================

      if (
        [
          "profile",
          "me",
          "aboutme",
          "social"
        ].includes(command)
      ) {
        const target =
          message.mentions.users.first() ||
          message.author;

        const targetUser =
          getUser(target.id);

        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xff6b00)
              .setTitle(
                `👤 Perfil de ${target.username}`
              )
              .setThumbnail(
                target.displayAvatarURL({
                  size: 512
                })
              )
              .setDescription(
                `💵 Dinero: **$${targetUser.money}**\n` +
                `🏦 Banco: **$${targetUser.bank}**\n` +
                `🏆 Nivel: **${targetUser.level}**\n` +
                `⭐ XP: **${targetUser.xp}**\n` +
                `❤️ Reputación: **${targetUser.reps}**\n\n` +
                `📝 ${targetUser.bio}`
              )
          ]
        });
      }

      // ========================================================
      // 🖼️ AVATAR
      // ========================================================

      if (
        command === "avatar"
      ) {
        const target =
          message.mentions.users.first() ||
          message.author;

        return message.reply(
          target.displayAvatarURL({
            size: 1024,
            extension: "png"
          })
        );
      }

      // ========================================================
      // 📝 BIO
      // ========================================================

      if (
        command === "bio"
      ) {
        return message.reply(
          `📝 **Biografía:**\n${user.bio}`
        );
      }

      if (
        command === "setbio"
      ) {
        const bio =
          args.join(" ");

        if (!bio) {
          return message.reply(
            `❌ Usa: \`${PREFIX}setbio <texto>\``
          );
        }

        if (
          bio.length > 300
        ) {
          return message.reply(
            "❌ La biografía no puede superar 300 caracteres."
          );
        }

        user.bio = bio;

        saveDB();

        return message.reply(
          "✅ Biografía actualizada."
        );
      }

      // ========================================================
      // ❤️ REP
      // ========================================================

      if (
        command === "rep"
      ) {
        const target =
          message.mentions.users.first();

        if (!target) {
          return message.reply(
            `❌ Usa: \`${PREFIX}rep @usuario\``
          );
        }

        if (
          target.id ===
          message.author.id
        ) {
          return message.reply(
            "❌ No puedes darte reputación."
          );
        }

        const targetUser =
          getUser(target.id);

        targetUser.reps++;

        saveDB();

        return message.reply(
          `❤️ ${target} recibió **+1 reputación**.`
        );
      }

      // ========================================================
      // 👥 USERINFO
      // ========================================================

      if (
        [
          "userinfo",
          "user",
          "whois",
          "member"
        ].includes(command)
      ) {
        const target =
          message.mentions.users.first() ||
          message.author;

        const member =
          message.guild.members.cache.get(
            target.id
          );

        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xff6b00)
              .setTitle(
                `👤 ${target.tag}`
              )
              .setDescription(
                `🆔 ID: \`${target.id}\`\n` +
                `🤖 Bot: **${target.bot ? "Sí" : "No"}**\n` +
                `📅 Cuenta creada: <t:${Math.floor(target.createdTimestamp / 1000)}:F>\n` +
                `📥 Entró al servidor: ${
                  member?.joinedTimestamp
                    ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
                    : "Desconocido"
                }`
              )
          ]
        });
      }

      // ========================================================
      // 🏠 SERVERINFO
      // ========================================================

      if (
        [
          "serverinfo",
          "serverid",
          "createdserver"
        ].includes(command)
      ) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xff6b00)
              .setTitle(
                `🏠 ${message.guild.name}`
              )
              .setThumbnail(
                message.guild.iconURL({
                  size: 512
                })
              )
              .setDescription(
                `🆔 ID: \`${message.guild.id}\`\n` +
                `👥 Miembros: **${message.guild.memberCount}**\n` +
                `🎭 Roles: **${message.guild.roles.cache.size}**\n` +
                `💬 Canales: **${message.guild.channels.cache.size}**\n` +
                `🚀 Boosts: **${message.guild.premiumSubscriptionCount || 0}**\n` +
                `👑 Owner: <@${message.guild.ownerId}>`
              )
          ]
        });
      }

      // ========================================================
      // 🤖 BOTINFO
      // ========================================================

      if (
        command === "botinfo"
      ) {
        return message.reply(
          `🍥 **JOSHUA — NARUTO UZUMAKI**\n\n` +
          `🤖 ${client.user.tag}\n` +
          `🏠 Servidores: **${client.guilds.cache.size}**\n` +
          `👥 Usuarios: **${client.users.cache.size}**\n` +
          `📡 Ping: **${client.ws.ping}ms**\n` +
          `⚡ Prefix: \`${PREFIX}\``
        );
      }

      // ========================================================
      // 🎲 DICE / ROLL
      // ========================================================

      if (
        [
          "dice",
          "roll"
        ].includes(command)
      ) {
        const number =
          Math.floor(
            Math.random() * 6
          ) + 1;

        return message.reply(
          `🎲 Salió **${number}**.`
        );
      }

      // ========================================================
      // 🪙 COINFLIP
      // ========================================================

      if (
        command === "coinflip"
      ) {
        const result =
          Math.random() < 0.5
            ? "🪙 Cara"
            : "🪙 Cruz";

        return message.reply(
          `**${result}**`
        );
      }

      // ========================================================
      // 🎱 8BALL
      // ========================================================

      if (
        command === "8ball"
      ) {
        const answers = [
          "🟢 Sí.",
          "🔴 No.",
          "🟡 Tal vez.",
          "🔵 Probablemente.",
          "🟣 No estoy seguro.",
          "🟢 Parece que sí."
        ];

        return message.reply(
          `🎱 **8BALL:** ${
            answers[
              Math.floor(
                Math.random() *
                answers.length
              )
            ]
          }`
        );
      }

      // ========================================================
      // ✂️ RPS
      // ========================================================

      if (
        command === "rps"
      ) {
        const choices = [
          "🪨 Piedra",
          "📄 Papel",
          "✂️ Tijera"
        ];

        return message.reply(
          `✂️ Joshua eligió: **${
            choices[
              Math.floor(
                Math.random() *
                choices.length
              )
            ]
          }**`
        );
      }

      // ========================================================
      // 🔄 REVERSE
      // ========================================================

      if (
        command === "reverse"
      ) {
        const text =
          args.join(" ");

        if (!text) {
          return message.reply(
            `❌ Usa: \`${PREFIX}reverse <texto>\``
          );
        }

        return replyLong(
          message,
          text
            .split("")
            .reverse()
            .join("")
        );
      }

      // ========================================================
      // 📢 SAY
      // ========================================================

      if (
        command === "say"
      ) {
        const text =
          args.join(" ");

        if (!text) {
          return message.reply(
            `❌ Usa: \`${PREFIX}say <texto>\``
          );
        }

        await message.delete()
          .catch(() => {});

        return sendLongMessage(
          message.channel,
          text
        );
      }

      // ========================================================
      // 🎯 RANDOM
      // ========================================================

      if (
        [
          "random",
          "number"
        ].includes(command)
      ) {
        const max =
          Number(args[0]) || 100;

        const number =
          Math.floor(
            Math.random() *
            max
          ) + 1;

        return message.reply(
          `🎯 Número aleatorio: **${number}**`
        );
      }

      // ========================================================
      // 🛒 TIENDA
      // ========================================================

      if (
        [
          "tienda",
          "shop",
          "productos",
          "catalogo",
          "precios",
          "roleshop",
          "rolshop",
          "shoplist",
          "store",
          "market"
        ].includes(command)
      ) {
        const roles =
          Object.entries(
            g.shop.roles
          );

        if (!roles.length) {
          return message.reply(
            `🛒 **TIENDA VACÍA**\n\n` +
            `Un administrador todavía no ha añadido productos.`
          );
        }

        const list =
          roles.map(
            ([roleId, data], index) => {
              const role =
                message.guild.roles.cache.get(
                  roleId
                );

              return (
                `**${index + 1}.** ${role || "Rol eliminado"} — 💰 **$${data.price}**`
              );
            }
          ).join("\n");

        return replyLong(
          message,
          `╔══════════════════════╗\n` +
          `║ 🛒 **TIENDA**\n` +
          `╚══════════════════════╝\n\n` +
          list
        );
      }

      // ========================================================
      // 🛍️ COMPRAR
      // ========================================================

      if (
        [
          "comprar",
          "buy",
          "purchase"
        ].includes(command)
      ) {
        const role =
          message.mentions.roles.first();

        if (!role) {
          return message.reply(
            `❌ Menciona el rol que quieres comprar.\n` +
            `Ejemplo: \`${PREFIX}comprar @VIP\``
          );
        }

        const product =
          g.shop.roles[role.id];

        if (!product) {
          return message.reply(
            "❌ Ese rol no está en la tienda."
          );
        }

        if (
          user.money <
          product.price
        ) {
          return message.reply(
            `❌ Necesitas **$${product.price}**.`
          );
        }

        if (
          message.member.roles.cache.has(
            role.id
          )
        ) {
          return message.reply(
            "❌ Ya tienes ese rol."
          );
        }

        if (!role.editable) {
          return message.reply(
            "❌ Joshua no puede entregar ese rol."
          );
        }

        user.money -=
          product.price;

        await message.member.roles
          .add(
            role,
            "Joshua Shop"
          )
          .catch(() => {});

        saveDB();

        return message.reply(
          `🛒 Compraste ${role} por **$${product.price}**.`
        );
      }

      // ========================================================
      // 🛡️ ADMIN CHECK
      // ========================================================

      const adminCommands = [
        "ban",
        "kick",
        "timeout",
        "untimeout",
        "warn",
        "warnings",
        "clear",
        "lock",
        "unlock",
        "antilink",
        "antiraid",
        "antiprotect",
        "whitelist",
        "security",
        "settings",
        "logs",
        "setlogs",
        "disablelogs",
        "testlogs",
        "welcome",
        "welcomeon",
        "welcomeoff",
        "autorole",
        "autoroleon",
        "autoroleoff",
        "rolecreate",
        "roledelete",
        "roleadd",
        "roleremove",
        "giverole",
        "takerole",
        "addrole",
        "removerole",
        "createrole",
        "deleterole",
        "addmoney",
        "removemoney",
        "setmoney",
        "givecash",
        "takecash",
        "addxp",
        "removexp",
        "setxp",
        "setlevel",
        "resetmoney",
        "resetxp",
        "resetuser",
        "givebank",
        "takebank",
        "bankset",
        "shopadd",
        "shopremove",
        "shopprice",
        "shopclear",
        "shopreset"
      ];

      if (
        adminCommands.includes(
          command
        ) &&
        !isAdmin(
          message.member
        )
      ) {
        return message.reply(
          "❌ Este comando requiere permisos de **Administrador**."
        );
      }

      // ========================================================
      // 🔗 ANTILINK CONFIG
      // ========================================================

      if (
        command === "antilink"
      ) {
        const option =
          args[0]?.toLowerCase();

        if (
          option === "on"
        ) {
          g.antilink.enabled =
            true;

          saveDB();

          return message.reply(
            "🔗 **AntiLink ACTIVADO**\n\n" +
            "🗑️ Los enlaces serán eliminados.\n" +
            "🔇 El usuario recibirá **2 horas de timeout**."
          );
        }

        if (
          option === "off"
        ) {
          g.antilink.enabled =
            false;

          saveDB();

          return message.reply(
            "🔗 **AntiLink DESACTIVADO**."
          );
        }

        if (
          option === "whitelist"
        ) {
          const domain =
            args[1];

          if (!domain) {
            return message.reply(
              `❌ Usa: \`${PREFIX}antilink whitelist discord.com\``
            );
          }

          if (
            !g.antilink.whitelist.includes(
              domain
            )
          ) {
            g.antilink.whitelist.push(
              domain
            );
          }

          saveDB();

          return message.reply(
            `✅ Dominio añadido a la whitelist: **${domain}**`
          );
        }

        return message.reply(
          `🔗 **ANTILINK**\n\n` +
          `Estado: **${g.antilink.enabled ? "ACTIVO 🟢" : "INACTIVO 🔴"}**\n` +
          `⏱️ Timeout: **2 horas**\n\n` +
          `\`${PREFIX}antilink on\`\n` +
          `\`${PREFIX}antilink off\`\n` +
          `\`${PREFIX}antilink whitelist <dominio>\``
        );
      }

      // ========================================================
      // 🤖 ANTIRAID CONFIG
      // ========================================================

      if (
        command === "antiraid"
      ) {
        const option =
          args[0]?.toLowerCase();

        if (
          option === "on"
        ) {
          g.antiraid.enabled =
            true;

          saveDB();

          return message.reply(
            "🤖 **AntiRaid ACTIVADO**\n\n" +
            "🚨 Los bots que no estén en la whitelist serán **baneados permanentemente**."
          );
        }

        if (
          option === "off"
        ) {
          g.antiraid.enabled =
            false;

          saveDB();

          return message.reply(
            "🤖 **AntiRaid DESACTIVADO**."
          );
        }

        if (
          option === "addbot"
        ) {
          const id =
            args[1];

          if (!id) {
            return message.reply(
              `❌ Usa: \`${PREFIX}antiraid addbot ID_DEL_BOT\``
            );
          }

          if (
            !g.antiraid.botWhitelist.includes(
              id
            )
          ) {
            g.antiraid.botWhitelist.push(
              id
            );
          }

          saveDB();

          return message.reply(
            `✅ Bot \`${id}\` añadido a la whitelist.`
          );
        }

        if (
          option === "removebot"
        ) {
          const id =
            args[1];

          g.antiraid.botWhitelist =
            g.antiraid.botWhitelist
              .filter(
                botId =>
                  botId !== id
              );

          saveDB();

          return message.reply(
            `✅ Bot \`${id}\` eliminado de la whitelist.`
          );
        }

        return message.reply(
          `🤖 **ANTIRAID**\n\n` +
          `Estado: **${g.antiraid.enabled ? "ACTIVO 🟢" : "INACTIVO 🔴"}**\n` +
          `🔨 Acción: **BAN PERMANENTE**\n` +
          `🤖 Bots permitidos: **${g.antiraid.botWhitelist.length}**\n\n` +
          `\`${PREFIX}antiraid on\`\n` +
          `\`${PREFIX}antiraid off\`\n` +
          `\`${PREFIX}antiraid addbot <ID>\`\n` +
          `\`${PREFIX}antiraid removebot <ID>\``
        );
      }

      // ========================================================
      // 🛡️ ANTI PROTECTION
      // ========================================================

      if (
        command === "antiprotect"
      ) {
        const option =
          args[0]?.toLowerCase();

        if (
          option === "on"
        ) {
          g.protection.enabled =
            true;

          saveDB();

          return message.reply(
            "🛡️ **Protección ACTIVADA**\n\n" +
            "📁 Crear/eliminar canales sin whitelist → **Kick**\n" +
            "🎭 Crear/eliminar roles sin whitelist → **Kick**"
          );
        }

        if (
          option === "off"
        ) {
          g.protection.enabled =
            false;

          saveDB();

          return message.reply(
            "🛡️ **Protección DESACTIVADA**."
          );
        }

        if (
          option === "adduser"
        ) {
          const member =
            message.mentions.members.first();

          if (!member) {
            return message.reply(
              `❌ Menciona un usuario.\n\`${PREFIX}antiprotect adduser @usuario\``
            );
          }

          if (
            !g.protection.userWhitelist.includes(
              member.id
            )
          ) {
            g.protection.userWhitelist.push(
              member.id
            );
          }

          saveDB();

          return message.reply(
            `✅ ${member} añadido a la whitelist de protección.`
          );
        }

        if (
          option === "removeuser"
        ) {
          const member =
            message.mentions.members.first();

          if (!member) {
            return message.reply(
              "❌ Menciona un usuario."
            );
          }

          g.protection.userWhitelist =
            g.protection.userWhitelist
              .filter(
                id =>
                  id !== member.id
              );

          saveDB();

          return message.reply(
            `✅ ${member} eliminado de la whitelist.`
          );
        }

        if (
          option === "addrole"
        ) {
          const role =
            message.mentions.roles.first();

          if (!role) {
            return message.reply(
              "❌ Menciona un rol."
            );
          }

          if (
            !g.protection.roleWhitelist.includes(
              role.id
            )
          ) {
            g.protection.roleWhitelist.push(
              role.id
            );
          }

          saveDB();

          return message.reply(
            `✅ ${role} añadido a la whitelist.`
          );
        }

        return message.reply(
          `🛡️ **ANTI-CANALES / ANTI-ROLES**\n\n` +
          `Estado: **${g.protection.enabled ? "ACTIVO 🟢" : "INACTIVO 🔴"}**\n` +
          `📁 Canales protegidos: **${g.protection.protectChannels ? "Sí" : "No"}**\n` +
          `🎭 Roles protegidos: **${g.protection.protectRoles ? "Sí" : "No"}**\n` +
          `🔨 Sanción: **Kick**\n\n` +
          `\`${PREFIX}antiprotect on\`\n` +
          `\`${PREFIX}antiprotect off\`\n` +
          `\`${PREFIX}antiprotect adduser @usuario\`\n` +
          `\`${PREFIX}antiprotect removeuser @usuario\`\n` +
          `\`${PREFIX}antiprotect addrole @rol\``
        );
      }

      // ========================================================
      // 🔐 WHITELIST
      // ========================================================

      if (
        command === "whitelist"
      ) {
        const type =
          args[0]?.toLowerCase();

        if (
          type === "user"
        ) {
          const member =
            message.mentions.members.first();

          if (!member) {
            return message.reply(
              "❌ Menciona un usuario."
            );
          }

          if (
            !g.protection.userWhitelist.includes(
              member.id
            )
          ) {
            g.protection.userWhitelist.push(
              member.id
            );
          }

          saveDB();

          return message.reply(
            `✅ ${member} está ahora en la whitelist.`
          );
        }

        if (
          type === "role"
        ) {
          const role =
            message.mentions.roles.first();

          if (!role) {
            return message.reply(
              "❌ Menciona un rol."
            );
          }

          if (
            !g.protection.roleWhitelist.includes(
              role.id
            )
          ) {
            g.protection.roleWhitelist.push(
              role.id
            );
          }

          saveDB();

          return message.reply(
            `✅ ${role} está ahora en la whitelist.`
          );
        }

        return message.reply(
          `🔐 **WHITELIST**\n\n` +
          `👤 Usuarios: **${g.protection.userWhitelist.length}**\n` +
          `🎭 Roles: **${g.protection.roleWhitelist.length}**\n` +
          `🤖 Bots: **${g.antiraid.botWhitelist.length}**`
        );
      }

      // ========================================================
      // 🔨 KICK
      // ========================================================

      if (
        command === "kick"
      ) {
        const member =
          message.mentions.members.first();

        if (!member) {
          return message.reply(
            `❌ Usa: \`${PREFIX}kick @usuario\``
          );
        }

        if (
          !member.kickable
        ) {
          return message.reply(
            "❌ No puedo expulsar a ese usuario."
          );
        }

        await member.kick(
          args.slice(1).join(" ") ||
          "Joshua Kick"
        );

        return message.reply(
          `👢 ${member.user.tag} fue expulsado.`
        );
      }

      // ========================================================
      // 🔨 BAN
      // ========================================================

      if (
        command === "ban"
      ) {
        const member =
          message.mentions.members.first();

        if (!member) {
          return message.reply(
            `❌ Usa: \`${PREFIX}ban @usuario\``
          );
        }

        if (
          !member.bannable
        ) {
          return message.reply(
            "❌ No puedo banear a ese usuario."
          );
        }

        await member.ban({
          reason:
            args.slice(1).join(" ") ||
            "Joshua Ban"
        });

        return message.reply(
          `🔨 ${member.user.tag} fue baneado permanentemente.`
        );
      }

      // ========================================================
      // 🔇 TIMEOUT
      // ========================================================

      if (
        command === "timeout"
      ) {
        const member =
          message.mentions.members.first();

        const minutes =
          Number(args[1]) || 10;

        if (!member) {
          return message.reply(
            `❌ Usa: \`${PREFIX}timeout @usuario 10\``
          );
        }

        if (
          !member.moderatable
        ) {
          return message.reply(
            "❌ No puedo aplicar timeout a ese usuario."
          );
        }

        await member.timeout(
          Math.min(
            minutes * 60 * 1000,
            28 * 24 * 60 * 60 * 1000
          ),
          "Joshua Timeout"
        );

        return message.reply(
          `🔇 ${member.user.tag} recibió **${minutes} minutos** de timeout.`
        );
      }

      // ========================================================
      // 🔊 UNTIMEOUT
      // ========================================================

      if (
        command === "untimeout"
      ) {
        const member =
          message.mentions.members.first();

        if (!member) {
          return message.reply(
            `❌ Usa: \`${PREFIX}untimeout @usuario\``
          );
        }

        await member.timeout(
          null,
          "Joshua Remove Timeout"
        ).catch(() => {});

        return message.reply(
          `🔊 Timeout retirado a ${member.user.tag}.`
        );
      }

      // ========================================================
      // ⚠️ WARN
      // ========================================================

      if (
        command === "warn"
      ) {
        const member =
          message.mentions.members.first();

        if (!member) {
          return message.reply(
            `❌ Usa: \`${PREFIX}warn @usuario razón\``
          );
        }

        const target =
          getUser(member.id);

        target.warnings++;

        saveDB();

        return message.reply(
          `⚠️ ${member} recibió una advertencia.\n` +
          `📊 Total: **${target.warnings}**`
        );
      }

      // ========================================================
      // ⚠️ WARNINGS
      // ========================================================

      if (
        command === "warnings"
      ) {
        const member =
          message.mentions.members.first() ||
          message.member;

        const target =
          getUser(member.id);

        return message.reply(
          `⚠️ ${member} tiene **${target.warnings} advertencias**.`
        );
      }

      // ========================================================
      // 🧹 CLEAR
      // ========================================================

      if (
        command === "clear"
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

        return message.channel.send(
          `🧹 Se eliminaron **${deleted?.size || 0} mensajes**.`
        );
      }

      // ========================================================
      // 🔒 LOCK
      // ========================================================

      if (
        command === "lock"
      ) {
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

      // ========================================================
      // 🔓 UNLOCK
      // ========================================================

      if (
        command === "unlock"
      ) {
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
      // 📝 SETLOGS
      // ========================================================

      if (
        command === "setlogs"
      ) {
        const channel =
          message.mentions.channels.first() ||
          message.channel;

        g.logsChannel =
          channel.id;

        saveDB();

        return message.reply(
          `📝 Canal de logs configurado: ${channel}`
        );
      }

      // ========================================================
      // 📝 DISABLE LOGS
      // ========================================================

      if (
        command === "disablelogs"
      ) {
        g.logsChannel = null;

        saveDB();

        return message.reply(
          "📝 Logs desactivados."
        );
      }

      // ========================================================
      // 🧪 TEST LOGS
      // ========================================================

      if (
        command === "testlogs"
      ) {
        await sendLog(
          message.guild,
          new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle(
              "🧪 TEST DE LOGS"
            )
            .setDescription(
              "✅ Los logs funcionan correctamente."
            )
            .setTimestamp()
        );

        return message.reply(
          "🧪 Log de prueba enviado."
        );
      }

      // ========================================================
      // 👋 WELCOME
      // ========================================================

      if (
        command === "welcome"
      ) {
        const option =
          args[0]?.toLowerCase();

        if (
          option === "on"
        ) {
          g.welcome.enabled =
            true;

          saveDB();

          return message.reply(
            "👋 Bienvenida activada."
          );
        }

        if (
          option === "off"
        ) {
          g.welcome.enabled =
            false;

          saveDB();

          return message.reply(
            "👋 Bienvenida desactivada."
          );
        }

        if (
          option === "channel"
        ) {
          const channel =
            message.mentions.channels.first();

          if (!channel) {
            return message.reply(
              "❌ Menciona un canal."
            );
          }

          g.welcome.channel =
            channel.id;

          saveDB();

          return message.reply(
            `👋 Canal de bienvenida: ${channel}`
          );
        }

        return message.reply(
          `👋 Estado: **${g.welcome.enabled ? "ACTIVO 🟢" : "INACTIVO 🔴"}**\n` +
          `📢 Canal: ${
            g.welcome.channel
              ? `<#${g.welcome.channel}>`
              : "No configurado"
          }`
        );
      }

      // ========================================================
      // 🎭 ROLE ADD
      // ========================================================

      if (
        [
          "roleadd",
          "giverole",
          "addrole"
        ].includes(command)
      ) {
        const member =
          message.mentions.members.first();

        const role =
          message.mentions.roles.first();

        if (!member || !role) {
          return message.reply(
            `❌ Usa: \`${PREFIX}giverole @usuario @rol\``
          );
        }

        if (!role.editable) {
          return message.reply(
            "❌ No puedo administrar ese rol."
          );
        }

        await member.roles.add(
          role,
          "Joshua Role Add"
        );

        return message.reply(
          `🎭 ${role} añadido a ${member}.`
        );
      }

      // ========================================================
      // 🎭 ROLE REMOVE
      // ========================================================

      if (
        [
          "roleremove",
          "takerole",
          "removerole"
        ].includes(command)
      ) {
        const member =
          message.mentions.members.first();

        const role =
          message.mentions.roles.first();

        if (!member || !role) {
          return message.reply(
            `❌ Usa: \`${PREFIX}takerole @usuario @rol\``
          );
        }

        await member.roles.remove(
          role,
          "Joshua Role Remove"
        ).catch(() => {});

        return message.reply(
          `🎭 ${role} retirado de ${member}.`
        );
      }

      // ========================================================
      // 💰 ADMIN MONEY
      // ========================================================

      if (
        [
          "addmoney",
          "givecash"
        ].includes(command)
      ) {
        const target =
          message.mentions.users.first();

        const amount =
          Number(args[1] || args[0]);

        if (
          !target ||
          !Number.isFinite(amount)
        ) {
          return message.reply(
            `❌ Usa: \`${PREFIX}addmoney @usuario 100\``
          );
        }

        const targetUser =
          getUser(target.id);

        targetUser.money +=
          Math.floor(amount);

        saveDB();

        return message.reply(
          `💰 Añadidos **$${amount}** a ${target}.`
        );
      }

      // ========================================================
      // 💰 SET MONEY
      // ========================================================

      if (
        command === "setmoney"
      ) {
        const target =
          message.mentions.users.first();

        const amount =
          Number(args[1] || args[0]);

        if (
          !target ||
          !Number.isFinite(amount)
        ) {
          return message.reply(
            `❌ Usa: \`${PREFIX}setmoney @usuario 100\``
          );
        }

        const targetUser =
          getUser(target.id);

        targetUser.money =
          Math.max(
            0,
            Math.floor(amount)
          );

        saveDB();

        return message.reply(
          `💰 Dinero de ${target} establecido en **$${targetUser.money}**.`
        );
      }

      // ========================================================
      // ⭐ ADD XP
      // ========================================================

      if (
        command === "addxp"
      ) {
        const target =
          message.mentions.users.first();

        const amount =
          Number(args[1] || args[0]);

        if (
          !target ||
          !Number.isFinite(amount)
        ) {
          return message.reply(
            `❌ Usa: \`${PREFIX}addxp @usuario 100\``
          );
        }

        const targetUser =
          getUser(target.id);

        targetUser.xp +=
          Math.floor(amount);

        saveDB();

        return message.reply(
          `⭐ Añadidos **${amount} XP** a ${target}.`
        );
      }

      // ========================================================
      // 🏆 SET LEVEL
      // ========================================================

      if (
        command === "setlevel"
      ) {
        const target =
          message.mentions.users.first();

        const level =
          Number(args[1] || args[0]);

        if (
          !target ||
          !Number.isFinite(level)
        ) {
          return message.reply(
            `❌ Usa: \`${PREFIX}setlevel @usuario 10\``
          );
        }

        const targetUser =
          getUser(target.id);

        targetUser.level =
          Math.max(
            1,
            Math.floor(level)
          );

        saveDB();

        return message.reply(
          `🏆 Nivel de ${target} establecido en **${targetUser.level}**.`
        );
      }

      // ========================================================
      // 🛒 SHOP ADD
      // ========================================================

      if (
        command === "shopadd"
      ) {
        const role =
          message.mentions.roles.first();

        const price =
          Number(args[1] || args[0]);

        if (
          !role ||
          !Number.isFinite(price)
        ) {
          return message.reply(
            `❌ Usa: \`${PREFIX}shopadd @rol 1000\``
          );
        }

        g.shop.roles[role.id] = {
          price:
            Math.floor(price)
        };

        saveDB();

        return message.reply(
          `🛒 ${role} añadido por **$${price}**.`
        );
      }

      // ========================================================
      // 🛒 SHOP REMOVE
      // ========================================================

      if (
        command === "shopremove"
      ) {
        const role =
          message.mentions.roles.first();

        if (!role) {
          return message.reply(
            "❌ Menciona el rol."
          );
        }

        delete g.shop.roles[
          role.id
        ];

        saveDB();

        return message.reply(
          `🛒 ${role} eliminado de la tienda.`
        );
      }

      // ========================================================
      // 🛒 SHOP CLEAR
      // ========================================================

      if (
        command === "shopclear"
      ) {
        g.shop.roles = {};

        saveDB();

        return message.reply(
          "🛒 Tienda vaciada."
        );
      }

      // ========================================================
      // ⚙️ SETTINGS
      // ========================================================

      if (
        command === "settings" ||
        command === "security"
      ) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x8b0000)
              .setTitle(
                "⚙️ CONFIGURACIÓN DE JOSHUA"
              )
              .setDescription(
                `🔗 AntiLink: **${g.antilink.enabled ? "🟢 ON" : "🔴 OFF"}**\n` +
                `🤖 AntiRaid: **${g.antiraid.enabled ? "🟢 ON" : "🔴 OFF"}**\n` +
                `🛡️ Anti-Canales/Roles: **${g.protection.enabled ? "🟢 ON" : "🔴 OFF"}**\n` +
                `📝 Logs: **${g.logsChannel ? "🟢 ON" : "🔴 OFF"}**\n` +
                `👋 Welcome: **${g.welcome.enabled ? "🟢 ON" : "🔴 OFF"}**\n\n` +
                `🔐 Usuarios whitelist: **${g.protection.userWhitelist.length}**\n` +
                `🎭 Roles whitelist: **${g.protection.roleWhitelist.length}**\n` +
                `🤖 Bots whitelist: **${g.antiraid.botWhitelist.length}**`
              )
          ]
        });
      }

      // ========================================================
      // ❓ UNKNOWN
      // ========================================================

      return message.reply(
        `❌ No conozco el comando \`${PREFIX}${command}\`.\n\n` +
        `📚 Usa \`${PREFIX}help\` para ver todos los comandos.`
      );

    } catch (error) {
      console.error(
        "❌ Error en comando:",
        error
      );

      if (
        !message.replied &&
        !message.deferred
      ) {
        await message.reply(
          "❌ Ocurrió un error ejecutando el comando."
        ).catch(() => {});
      }
    }
  }
);

// ============================================================
// 🖱️ MENÚS INTERACTIVOS
// ============================================================

client.on(
  Events.InteractionCreate,
  async interaction => {
    try {
      if (
        !interaction.isStringSelectMenu() &&
        !interaction.isButton()
      ) {
        return;
      }

      const customId =
        interaction.customId;

      const parts =
        customId.split("_");

      const ownerId =
        parts[parts.length - 1];

      // ========================================================
      // 🔒 SOLO EL CREADOR DEL MENÚ
      // ========================================================

      if (
        interaction.user.id !==
        ownerId
      ) {
        return interaction.reply({
          content:
            "❌ Este menú pertenece a otra persona.",
          ephemeral: true
        });
      }

      // ========================================================
      // 📚 MENÚ PÚBLICO
      // ========================================================

      if (
        interaction.isStringSelectMenu() &&
        customId.startsWith(
          "help_public_"
        )
      ) {
        const category =
          interaction.values[0];

        if (!categories[category]) {
          return;
        }

        const member =
          interaction.guild.members.cache.get(
            interaction.user.id
          );

        return interaction.update({
          embeds: [
            categoryEmbed(
              category
            )
          ],
          components:
            publicHelpComponents(
              interaction.user.id,
              isAdmin(member)
            )
        });
      }

      // ========================================================
      // 🔐 MENÚ ADMIN
      // ========================================================

      if (
        interaction.isStringSelectMenu() &&
        customId.startsWith(
          "help_admin_"
        )
      ) {
        const category =
          interaction.values[0];

        if (
          !adminCategories[category]
        ) {
          return;
        }

        return interaction.update({
          embeds: [
            adminCategoryEmbed(
              category
            )
          ],
          components:
            adminHelpComponents(
              interaction.user.id
            )
        });
      }

      // ========================================================
      // 🔐 ABRIR ADMIN
      // ========================================================

      if (
        interaction.isButton() &&
        customId.startsWith(
          "help_open_admin_"
        )
      ) {
        const member =
          interaction.guild.members.cache.get(
            interaction.user.id
          );

        if (
          !isAdmin(member)
        ) {
          return interaction.reply({
            content:
              "❌ Necesitas permisos de Administrador.",
            ephemeral: true
          });
        }

        return interaction.update({
          embeds: [
            adminHelpEmbed()
          ],
          components:
            adminHelpComponents(
              interaction.user.id
            )
        });
      }

      // ========================================================
      // ◀️ ADMIN → PÚBLICO
      // ========================================================

      if (
        interaction.isButton() &&
        customId.startsWith(
          "help_admin_back_"
        )
      ) {
        const member =
          interaction.guild.members.cache.get(
            interaction.user.id
          );

        return interaction.update({
          embeds: [
            publicHelpEmbed()
          ],
          components:
            publicHelpComponents(
              interaction.user.id,
              isAdmin(member)
            )
        });
      }

    } catch (error) {
      console.error(
        "❌ Interaction:",
        error
      );
    }
  }
);

// ============================================================
// 🚨 ERRORES DISCORD
// ============================================================

client.on(
  Events.Error,
  error => {
    console.error(
      "❌ Discord Error:",
      error
    );
  }
);

client.on(
  Events.Warn,
  warning => {
    console.warn(
      "⚠️ Discord Warning:",
      warning
    );
  }
);

// ============================================================
// 🔑 LOGIN
// ============================================================

if (!process.env.DISCORD_TOKEN) {
  console.error(
    "❌ FALTA DISCORD_TOKEN EN LAS VARIABLES DE RENDER."
  );

  process.exit(1);
}

client.login(
  process.env.DISCORD_TOKEN
);
