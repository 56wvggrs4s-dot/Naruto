// ============================================================
// 🍥 NARUTO — DISCORD BOT
// discord.js v14
// Prefix: N!
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
const PORT = process.env.PORT || 3000;

// ============================================================
// 🌐 SERVIDOR PARA RENDER
// ============================================================

http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end("🍥 Naruto está conectado correctamente.");
}).listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Web server iniciado en puerto ${PORT}`);
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

function embed(title, description, color = 0xff6b00) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp()
    .setFooter({
      text: "🍥 Naruto • N!"
    });
}

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

    const data = fs.readFileSync(
      DATA_FILE,
      "utf8"
    );

    if (!data.trim()) {
      saveDB();
      return;
    }

    const parsed = JSON.parse(data);

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
      bio: "Sin biografía.",
      lastDaily: 0,
      lastWork: 0
    };
  }

  const user = db.users[id];

  user.money = Number(user.money) || 0;
  user.bank = Number(user.bank) || 0;
  user.xp = Number(user.xp) || 0;
  user.level = Number(user.level) || 1;
  user.reps = Number(user.reps) || 0;
  user.warnings = Number(user.warnings) || 0;
  user.lastDaily = Number(user.lastDaily) || 0;
  user.lastWork = Number(user.lastWork) || 0;

  if (typeof user.bio !== "string") {
    user.bio = "Sin biografía.";
  }

  return user;
}

// ============================================================
// 🏠 SERVIDOR
// ============================================================

function defaultGuild() {
  return {
    logsChannel: null,

    // 🔗 ANTILINK
    antilink: {
      enabled: false,
      timeout: 2 * 60 * 60 * 1000,
      whitelist: []
    },

    // 🤖 ANTIRAID
    antiraid: {
      enabled: false,
      botWhitelist: []
    },

    // 🛡️ ANTI-NUKE
    antinuke: {
      enabled: false,

      protectChannels: true,
      protectRoles: true,

      whitelistUsers: [],
      whitelistRoles: [],

      action: "kick"
    },

    // 👋 BIENVENIDA
    welcome: {
      enabled: false,
      channel: null
    },

    // 🎭 AUTOROL
    autorole: {
      enabled: false,
      role: null
    },

    // 🏆 RANK
    rank: {
      text:
        "🍥 {user}, eres ninja al nivel **{level}**.\n⭐ XP: **{xp}/{needed}**"
    },

    // 🛒 TIENDA
    shop: {
      roles: {}
    }
  };
}

function getGuild(id) {
  if (!db.guilds[id]) {
    db.guilds[id] = defaultGuild();
  }

  const g = db.guilds[id];

  const defaults = defaultGuild();

  if (!g.antilink) {
    g.antilink = defaults.antilink;
  }

  if (!Array.isArray(g.antilink.whitelist)) {
    g.antilink.whitelist = [];
  }

  if (!g.antiraid) {
    g.antiraid = defaults.antiraid;
  }

  if (!Array.isArray(g.antiraid.botWhitelist)) {
    g.antiraid.botWhitelist = [];
  }

  if (!g.antinuke) {
    g.antinuke = defaults.antinuke;
  }

  if (!Array.isArray(g.antinuke.whitelistUsers)) {
    g.antinuke.whitelistUsers = [];
  }

  if (!Array.isArray(g.antinuke.whitelistRoles)) {
    g.antinuke.whitelistRoles = [];
  }

  if (!g.welcome) {
    g.welcome = defaults.welcome;
  }

  if (!g.autorole) {
    g.autorole = defaults.autorole;
  }

  if (!g.rank) {
    g.rank = defaults.rank;
  }

  if (!g.rank.text) {
    g.rank.text = defaults.rank.text;
  }

  if (!g.shop) {
    g.shop = {
      roles: {}
    };
  }

  if (!g.shop.roles) {
    g.shop.roles = {};
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

// ============================================================
// 📩 MENSAJES LARGOS
// ============================================================

async function replyLong(message, text) {
  text = String(text);

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
// 📝 LOGS
// ============================================================

async function sendLog(guild, logEmbed) {
  try {
    const g = getGuild(guild.id);

    if (!g.logsChannel) return;

    const channel =
      guild.channels.cache.get(
        g.logsChannel
      );

    if (
      channel &&
      channel.isTextBased()
    ) {
      await channel.send({
        embeds: [logEmbed]
      }).catch(() => {});
    }
  } catch {}
}

// ============================================================
// ⭐ XP
// ============================================================

function addXP(user, amount = 5) {
  user.xp += amount;

  let levelUp = false;

  while (
    user.xp >= user.level * 100
  ) {
    user.xp -= user.level * 100;
    user.level++;
    levelUp = true;
  }

  saveDB();

  return levelUp;
}

// ============================================================
// 🏆 RANK PERSONALIZADO
// ============================================================

function getRankText(
  guildSettings,
  user,
  discordUser
) {
  const needed =
    user.level * 100;

  return guildSettings.rank.text
    .replace(
      /\{user\}/gi,
      discordUser.toString()
    )
    .replace(
      /\{username\}/gi,
      discordUser.username
    )
    .replace(
      /\{level\}/gi,
      String(user.level)
    )
    .replace(
      /\{xp\}/gi,
      String(user.xp)
    )
    .replace(
      /\{needed\}/gi,
      String(needed)
    );
}

// ============================================================
// 🔐 WHITELIST ANTI-NUKE
// ============================================================

function isAntiNukeWhitelisted(
  member,
  settings
) {
  if (!member) return false;

  if (
    settings.whitelistUsers.includes(
      member.id
    )
  ) {
    return true;
  }

  return member.roles.cache.some(
    role =>
      settings.whitelistRoles.includes(
        role.id
      )
  );
}

// ============================================================
// 🔎 AUDIT LOG
// ============================================================

function wait(ms) {
  return new Promise(
    resolve => setTimeout(resolve, ms)
  );
}

async function findExecutor(
  guild,
  action,
  targetId
) {
  for (
    let attempt = 0;
    attempt < 3;
    attempt++
  ) {
    try {
      const logs =
        await guild.fetchAuditLogs({
          type: action,
          limit: 10
        });

      const entry =
        logs.entries.find(
          entry =>
            entry.target?.id === targetId &&
            Date.now() -
              entry.createdTimestamp <
              15000
        );

      if (entry) {
        return entry.executor;
      }
    } catch (error) {
      console.error(
        "❌ Error Audit Log:",
        error
      );
    }

    await wait(700);
  }

  return null;
}

// ============================================================
// 🛡️ ANTI-NUKE — CANALES
// ============================================================

async function protectChannel(
  channel,
  action
) {
  try {
    if (!channel.guild) return;

    const g =
      getGuild(channel.guild.id);

    if (
      !g.antinuke.enabled ||
      !g.antinuke.protectChannels
    ) {
      return;
    }

    const executor =
      await findExecutor(
        channel.guild,
        action === "create"
          ? AuditLogEvent.ChannelCreate
          : AuditLogEvent.ChannelDelete,
        channel.id
      );

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

    // El dueño nunca queda atrapado
    if (
      member.id ===
      channel.guild.ownerId
    ) {
      return;
    }

    if (
      isAntiNukeWhitelisted(
        member,
        g.antinuke
      )
    ) {
      return;
    }

    if (
      !member.kickable
    ) {
      await sendLog(
        channel.guild,
        embed(
          "🚨 ANTI-NUKE",
          `👤 Usuario: ${member.user.tag}\n` +
          `📁 Acción: ${
            action === "create"
              ? "Creó"
              : "Eliminó"
          } un canal\n\n` +
          `❌ Naruto no pudo expulsarlo.`,
          0xff0000
        )
      );

      return;
    }

    await member.kick(
      `Naruto Anti-Nuke — ${
        action === "create"
          ? "creó"
          : "eliminó"
      } un canal sin whitelist`
    ).catch(() => {});

    await sendLog(
      channel.guild,
      embed(
        "🛡️ ANTI-NUKE ACTIVADO",
        `👤 **Usuario:** ${member.user.tag}\n` +
        `📁 **Acción:** ${
          action === "create"
            ? "Creó"
            : "Eliminó"
        } un canal\n` +
        `🔨 **Sanción:** Kick\n` +
        `❌ **Whitelist:** No`,
        0xff0000
      )
    );
  } catch (error) {
    console.error(
      "❌ Anti-Nuke canal:",
      error
    );
  }
}

// ============================================================
// 🛡️ ANTI-NUKE — ROLES
// ============================================================

async function protectRole(
  role,
  action
) {
  try {
    const g =
      getGuild(role.guild.id);

    if (
      !g.antinuke.enabled ||
      !g.antinuke.protectRoles
    ) {
      return;
    }

    const executor =
      await findExecutor(
        role.guild,
        action === "create"
          ? AuditLogEvent.RoleCreate
          : AuditLogEvent.RoleDelete,
        role.id
      );

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
      member.id === role.guild.ownerId
    ) {
      return;
    }

    if (
      isAntiNukeWhitelisted(
        member,
        g.antinuke
      )
    ) {
      return;
    }

    if (!member.kickable) {
      return;
    }

    await member.kick(
      `Naruto Anti-Nuke — ${
        action === "create"
          ? "creó"
          : "eliminó"
      } un rol sin whitelist`
    ).catch(() => {});

    await sendLog(
      role.guild,
      embed(
        "🎭 ANTI-NUKE ACTIVADO",
        `👤 **Usuario:** ${member.user.tag}\n` +
        `🎭 **Acción:** ${
          action === "create"
            ? "Creó"
            : "Eliminó"
        } un rol\n` +
        `🔨 **Sanción:** Kick\n` +
        `❌ **Whitelist:** No`,
        0xff0000
      )
    );
  } catch (error) {
    console.error(
      "❌ Anti-Nuke rol:",
      error
    );
  }
}

// ============================================================
// 📁 EVENTOS ANTI-NUKE
// ============================================================

client.on(
  Events.ChannelCreate,
  channel => {
    protectChannel(
      channel,
      "create"
    );
  }
);

client.on(
  Events.ChannelDelete,
  channel => {
    protectChannel(
      channel,
      "delete"
    );
  }
);

client.on(
  Events.GuildRoleCreate,
  role => {
    protectRole(
      role,
      "create"
    );
  }
);

client.on(
  Events.GuildRoleDelete,
  role => {
    protectRole(
      role,
      "delete"
    );
  }
);

// ============================================================
// 🤖 ANTIRAID
// ============================================================

client.on(
  Events.GuildMemberAdd,
  async member => {
    try {
      const g =
        getGuild(member.guild.id);

      // ========================================================
      // 🤖 BOT NO AUTORIZADO
      // ========================================================

      if (
        member.user.bot &&
        g.antiraid.enabled
      ) {
        const allowed =
          g.antiraid.botWhitelist.includes(
            member.user.id
          );

        if (!allowed) {
          console.log(
            `🚨 ANTIRAID: ${member.user.tag}`
          );

          await member.ban({
            reason:
              "Naruto AntiRaid — Bot no autorizado"
          }).catch(error => {
            console.error(
              "❌ No pude banear bot:",
              error
            );
          });

          await sendLog(
            member.guild,
            embed(
              "🚨 ANTIRAID — BOT BLOQUEADO",
              `🤖 **Bot:** ${member.user.tag}\n` +
              `🆔 **ID:** \`${member.user.id}\`\n` +
              `🔨 **Acción:** BAN PERMANENTE\n\n` +
              `❌ El bot no estaba en la whitelist.`,
              0xff0000
            )
          );
        }

        return;
      }

      // ========================================================
      // 👋 BIENVENIDA
      // ========================================================

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
            `╔══════════════════════════╗\n` +
            `║ 🍥 **NUEVO NINJA** 🍥\n` +
            `╚══════════════════════════╝\n\n` +
            `👋 ¡Bienvenido/a ${member}!\n` +
            `🏠 ${member.guild.name}\n\n` +
            `🥷 ¡Tu camino ninja comienza ahora!`
          ).catch(() => {});
        }
      }

      // ========================================================
      // 🎭 AUTOROLE
      // ========================================================

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
          await member.roles.add(
            role,
            "Naruto Autorole"
          ).catch(() => {});
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
// 🔗 DETECTOR DE LINKS
// ============================================================

function containsLink(text) {
  const regex =
    /(https?:\/\/[^\s]+|www\.[^\s]+|(?:[a-z0-9-]+\.)+(?:com|net|org|gg|io|xyz|me|co|es|dev|site|online)(?:\/[^\s]*)?)/i;

  return regex.test(text);
}

// ============================================================
// 📚 30 COMANDOS
// ============================================================

const categories = {
  economia: {
    name: "💰 Economía",
    commands: [
      ["balance", "Ver tu dinero"],
      ["daily", "Recompensa diaria"],
      ["work", "Trabajar"],
      ["pay", "Pagar a otro usuario"],
      ["deposit", "Depositar dinero"],
      ["withdraw", "Retirar dinero"]
    ]
  },

  rank: {
    name: "🏆 Rank",
    commands: [
      ["rank", "Ver tu rank"],
      ["xp", "Ver tu XP"],
      ["level", "Ver tu nivel"],
      ["leaderboard", "Ver ranking"],
      ["levels", "Información de niveles"]
    ]
  },

  social: {
    name: "👤 Social",
    commands: [
      ["profile", "Ver perfil"],
      ["avatar", "Ver avatar"],
      ["userinfo", "Información de usuario"],
      ["bio", "Ver biografía"],
      ["setbio", "Cambiar biografía"]
    ]
  },

  servidor: {
    name: "🏠 Servidor",
    commands: [
      ["serverinfo", "Información del servidor"],
      ["servericon", "Icono del servidor"],
      ["roles", "Lista de roles"],
      ["channels", "Lista de canales"],
      ["ping", "Ver ping"]
    ]
  },

  diversion: {
    name: "🎮 Diversión",
    commands: [
      ["8ball", "Pregúntale al 8ball"],
      ["dice", "Tirar dado"],
      ["coinflip", "Lanzar moneda"],
      ["rps", "Piedra, papel o tijera"],
      ["choose", "Elegir entre opciones"]
    ]
  },

  tienda: {
    name: "🛒 Tienda",
    commands: [
      ["shop", "Abrir tienda"],
      ["comprar", "Comprar un producto"],
      ["productos", "Ver productos"],
      ["inventory", "Ver tus roles"],
      ["owned", "Ver tus compras"]
    ]
  }
};

// ============================================================
// 🔐 COMANDOS ADMIN
// ============================================================

const adminCategories = {
  moderacion: {
    name: "🛡️ Moderación",
    commands: [
      ["ban", "Ban permanente"],
      ["kick", "Expulsar usuario"],
      ["timeout", "Timeout"],
      ["untimeout", "Quitar timeout"],
      ["warn", "Advertir usuario"],
      ["clear", "Borrar mensajes"]
    ]
  },

  seguridad: {
    name: "🔒 Seguridad",
    commands: [
      ["antilink", "Configurar AntiLink"],
      ["antiraid", "Configurar AntiRaid"],
      ["antinuke", "Configurar Anti-Nuke"],
      ["whitelist", "Administrar whitelist"],
      ["setlogs", "Configurar logs"],
      ["security", "Ver seguridad"]
    ]
  },

  configuracion: {
    name: "⚙️ Configuración",
    commands: [
      ["welcome", "Configurar bienvenida"],
      ["autorole", "Configurar autorol"],
      ["setranktext", "Personalizar Rank"],
      ["settings", "Ver configuración"],
      ["testlogs", "Probar logs"],
      ["disablelogs", "Desactivar logs"]
    ]
  }
};

// ============================================================
// 📖 HELP PRINCIPAL
// ============================================================

function mainHelp(member) {
  const description =
    `╭────────────────────────────╮\n` +
    `│ 🍥 **BIENVENIDO AL PANEL DE NARUTO**\n` +
    `╰────────────────────────────╯\n\n` +
    `Selecciona una categoría abajo para ver los comandos.\n\n` +
    `⚡ Prefix: \`${PREFIX}\`\n` +
    `📚 **30 comandos públicos**\n` +
    `🔐 Panel administrativo disponible para administradores.`;

  const e =
    new EmbedBuilder()
      .setColor(0xff6b00)
      .setTitle("🍥 NARUTO — CENTRO DE AYUDA")
      .setDescription(description)
      .addFields(
        {
          name: "💰 Economía",
          value: "Dinero y recompensas.",
          inline: true
        },
        {
          name: "🏆 Rank",
          value: "XP y niveles.",
          inline: true
        },
        {
          name: "👤 Social",
          value: "Perfiles.",
          inline: true
        },
        {
          name: "🏠 Servidor",
          value: "Información.",
          inline: true
        },
        {
          name: "🎮 Diversión",
          value: "Juegos.",
          inline: true
        },
        {
          name: "🛒 Tienda",
          value: "Compra roles.",
          inline: true
        }
      )
      .setFooter({
        text: "🍥 Naruto • 30 comandos"
      });

  return e;
}

// ============================================================
// 📋 MENÚ HELP
// ============================================================

function publicMenu(userId, member) {
  const menu =
    new StringSelectMenuBuilder()
      .setCustomId(
        `public_help_${userId}`
      )
      .setPlaceholder(
        "📚 Selecciona una categoría..."
      )
      .addOptions(
        Object.entries(categories)
          .map(([key, category]) => ({
            label:
              category.name
                .replace(/[^\p{L}\p{N}\s]/gu, "")
                .trim(),

            description:
              `Ver comandos de ${category.name}`
                .slice(0, 100),

            value: key
          }))
      );

  const rows = [
    new ActionRowBuilder()
      .addComponents(menu)
  ];

  if (isAdmin(member)) {
    rows.push(
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              `admin_help_${userId}`
            )
            .setLabel(
              "🔐 Panel Administrativo"
            )
            .setStyle(
              ButtonStyle.Danger
            )
        )
    );
  }

  return rows;
}

// ============================================================
// 📚 CATEGORÍA
// ============================================================

function categoryEmbed(key) {
  const category =
    categories[key];

  const commands =
    category.commands
      .map(
        ([command, description], index) =>
          `**${index + 1}.** \`${PREFIX}${command}\` — ${description}`
      )
      .join("\n");

  return new EmbedBuilder()
    .setColor(0xff6b00)
    .setTitle(
      `${category.name} — COMANDOS`
    )
    .setDescription(
      `🍥 **Naruto**\n\n` +
      `${LINE}\n` +
      commands
    )
    .setFooter({
      text:
        "Usa el menú para cambiar de categoría."
    });
}

// ============================================================
// 🔐 ADMIN HELP
// ============================================================

function adminHelp() {
  return new EmbedBuilder()
    .setColor(0xb00000)
    .setTitle(
      "🔐 NARUTO — PANEL ADMINISTRATIVO"
    )
    .setDescription(
      `╭────────────────────────────╮\n` +
      `│ 🛡️ **PANEL DE ADMINISTRACIÓN**\n` +
      `╰────────────────────────────╯\n\n` +
      `Selecciona una categoría.\n\n` +
      `⚠️ Estos comandos requieren permisos de Administrador.`
    );
}

function adminMenu(userId) {
  const menu =
    new StringSelectMenuBuilder()
      .setCustomId(
        `admin_category_${userId}`
      )
      .setPlaceholder(
        "🔐 Selecciona una categoría..."
      )
      .addOptions(
        Object.entries(
          adminCategories
        ).map(
          ([key, category]) => ({
            label:
              category.name
                .replace(/[^\p{L}\p{N}\s]/gu, "")
                .trim(),

            description:
              `Comandos de ${category.name}`
                .slice(0, 100),

            value: key
          })
        )
      );

  return [
    new ActionRowBuilder()
      .addComponents(menu),

    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `public_from_admin_${userId}`
          )
          .setLabel(
            "◀️ Menú público"
          )
          .setStyle(
            ButtonStyle.Secondary
          )
      )
  ];
}

function adminCategoryEmbed(key) {
  const category =
    adminCategories[key];

  const commands =
    category.commands
      .map(
        ([command, description], index) =>
          `**${index + 1}.** \`${PREFIX}${command}\` — ${description}`
      )
      .join("\n");

  return new EmbedBuilder()
    .setColor(0xb00000)
    .setTitle(
      `${category.name} — ADMIN`
    )
    .setDescription(
      `🔐 **Naruto Administración**\n\n` +
      `${LINE}\n` +
      commands
    );
}

// ============================================================
// 🚀 READY
// ============================================================

client.once(
  Events.ClientReady,
  ready => {
    console.log("");
    console.log("======================================");
    console.log("🍥 NARUTO BOT");
    console.log("======================================");
    console.log(
      `🤖 ${ready.user.tag}`
    );
    console.log(
      `🏠 Servidores: ${ready.guilds.cache.size}`
    );
    console.log(
      `📡 Ping: ${ready.ws.ping}ms`
    );
    console.log(
      `⚡ Prefix: ${PREFIX}`
    );
    console.log("🟢 CONECTADO");
    console.log("======================================");

    ready.user.setActivity(
      `${PREFIX}help • Naruto`
    );
  }
);

// ============================================================
// 💬 MENSAJES
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

      // ========================================================
      // 🔗 ANTILINK
      // ========================================================

      if (
        g.antilink.enabled &&
        !isAdmin(message.member) &&
        containsLink(message.content)
      ) {
        const lower =
          message.content.toLowerCase();

        const allowed =
          g.antilink.whitelist.some(
            domain =>
              lower.includes(
                domain.toLowerCase()
              )
          );

        if (!allowed) {
          await message.delete()
            .catch(() => {});

          if (
            message.member &&
            message.member.moderatable
          ) {
            await message.member
              .timeout(
                2 * 60 * 60 * 1000,
                "Naruto AntiLink"
              )
              .catch(error => {
                console.error(
                  "❌ Timeout AntiLink:",
                  error
                );
              });
          }

          await sendLog(
            message.guild,
            embed(
              "🔗 ANTILINK ACTIVADO",
              `👤 **Usuario:** ${message.author.tag}\n` +
              `🗑️ **Mensaje:** Eliminado\n` +
              `🔇 **Timeout:** 2 horas\n` +
              `📋 **Motivo:** Enlace no permitido.`,
              0xff0000
            )
          );

          return;
        }
      }

      // ========================================================
      // 📌 SI NO ES COMANDO
      // ========================================================

      if (
        !message.content.startsWith(
          PREFIX
        )
      ) {
        return;
      }

      const raw =
        message.content.slice(
          PREFIX.length
        ).trim();

      if (!raw) return;

      const args =
        raw.split(/\s+/);

      const command =
        args.shift().toLowerCase();

      const user =
        getUser(
          message.author.id
        );

      // ========================================================
      // ⭐ XP
      // ========================================================

      const levelUp =
        addXP(user, 5);

      if (
        levelUp &&
        command !== "rank"
      ) {
        await message.channel.send(
          `🎉 ${message.author} **subiste al nivel ${user.level}!** 🏆`
        ).catch(() => {});
      }

      // ========================================================
      // 🆘 HELP
      // ========================================================

      if (
        command === "help" ||
        command === "ayuda"
      ) {
        return message.reply({
          embeds: [
            mainHelp(
              message.member
            )
          ],
          components:
            publicMenu(
              message.author.id,
              message.member
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
            "❌ Necesitas permisos de Administrador."
          );
        }

        return message.reply({
          embeds: [
            adminHelp()
          ],
          components:
            adminMenu(
              message.author.id
            )
        });
      }

      // ========================================================
      // 💰 BALANCE
      // ========================================================

      if (
        command === "balance"
      ) {
        return message.reply({
          embeds: [
            embed(
              "💰 TU ECONOMÍA",
              `👤 ${message.author}\n\n` +
              `💵 Efectivo: **$${user.money}**\n` +
              `🏦 Banco: **$${user.bank}**\n` +
              `💎 Total: **$${user.money + user.bank}**`
            )
          ]
        });
      }

      // ========================================================
      // 🎁 DAILY
      // ========================================================

      if (
        command === "daily"
      ) {
        const now =
          Date.now();

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
              3600000
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
          `🎁 **DAILY**\n\n` +
          `💰 Recibiste **$${reward}**.`
        );
      }

      // ========================================================
      // 💼 WORK
      // ========================================================

      if (
        command === "work"
      ) {
        const now =
          Date.now();

        if (
          now - user.lastWork <
          60 * 60 * 1000
        ) {
          return message.reply(
            "⏳ Debes esperar una hora antes de volver a trabajar."
          );
        }

        const reward =
          Math.floor(
            Math.random() * 201
          ) + 100;

        user.money += reward;
        user.lastWork = now;

        saveDB();

        return message.reply(
          `💼 Trabajaste y ganaste **$${reward}**.`
        );
      }

      // ========================================================
      // 💸 PAY
      // ========================================================

      if (
        command === "pay"
      ) {
        const target =
          message.mentions.users.first();

        const amount =
          Number(args[1] || args[0]);

        if (
          !target ||
          !Number.isFinite(amount) ||
          amount <= 0
        ) {
          return message.reply(
            `❌ Usa: \`${PREFIX}pay @usuario cantidad\``
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
          amount > user.money
        ) {
          return message.reply(
            "❌ No tienes suficiente dinero."
          );
        }

        const targetUser =
          getUser(target.id);

        user.money -=
          Math.floor(amount);

        targetUser.money +=
          Math.floor(amount);

        saveDB();

        return message.reply(
          `💸 Enviaste **$${amount}** a ${target}.`
        );
      }

      // ========================================================
      // 🏦 DEPOSIT
      // ========================================================

      if (
        command === "deposit"
      ) {
        const amount =
          Number(args[0]);

        if (
          !Number.isFinite(amount) ||
          amount <= 0 ||
          amount > user.money
        ) {
          return message.reply(
            `❌ Usa una cantidad válida.\nEjemplo: \`${PREFIX}deposit 500\``
          );
        }

        user.money -=
          Math.floor(amount);

        user.bank +=
          Math.floor(amount);

        saveDB();

        return message.reply(
          `🏦 Depositaste **$${amount}**.`
        );
      }

      // ========================================================
      // 💵 WITHDRAW
      // ========================================================

      if (
        command === "withdraw"
      ) {
        const amount =
          Number(args[0]);

        if (
          !Number.isFinite(amount) ||
          amount <= 0 ||
          amount > user.bank
        ) {
          return message.reply(
            `❌ Usa una cantidad válida.\nEjemplo: \`${PREFIX}withdraw 500\``
          );
        }

        user.bank -=
          Math.floor(amount);

        user.money +=
          Math.floor(amount);

        saveDB();

        return message.reply(
          `💵 Retiraste **$${amount}**.`
        );
      }

      // ========================================================
      // 🏆 RANK
      // ========================================================

      if (
        [
          "rank",
          "level"
        ].includes(command)
      ) {
        const needed =
          user.level * 100;

        const text =
          getRankText(
            g,
            user,
            message.author
          );

        const percentage =
          Math.min(
            100,
            Math.floor(
              user.xp /
              needed *
              100
            )
          );

        const blocks =
          Math.floor(
            percentage / 10
          );

        const bar =
          "🟧".repeat(blocks) +
          "⬛".repeat(
            10 - blocks
          );

        return message.reply({
          embeds: [
            embed(
              `🏆 RANK — NIVEL ${user.level}`,
              `${text}\n\n` +
              `${bar} **${percentage}%**`
            )
          ]
        });
      }

      // ========================================================
      // ⭐ XP
      // ========================================================

      if (
        command === "xp"
      ) {
        return message.reply(
          `⭐ ${message.author} tiene **${user.xp}/${user.level * 100} XP**.`
        );
      }

      // ========================================================
      // 📊 LEADERBOARD
      // ========================================================

      if (
        command === "leaderboard"
      ) {
        const users =
          Object.entries(db.users)
            .sort(
              (a, b) =>
                (b[1].level * 100 + b[1].xp) -
                (a[1].level * 100 + a[1].xp)
            )
            .slice(0, 10);

        let text =
          "🏆 **TOP 10 NINJAS**\n\n";

        users.forEach(
          ([id, data], index) => {
            text +=
              `**${index + 1}.** <@${id}> — ` +
              `Nivel **${data.level}** — ` +
              `⭐ ${data.xp} XP\n`;
          }
        );

        return replyLong(
          message,
          text
        );
      }

      // ========================================================
      // 📈 LEVELS
      // ========================================================

      if (
        command === "levels"
      ) {
        return message.reply(
          `🏆 **SISTEMA DE NIVELES**\n\n` +
          `⭐ Cada mensaje/comando puede darte XP.\n` +
          `📈 Cada nivel necesita más XP.\n\n` +
          `Tu nivel actual: **${user.level}**`
        );
      }

      // ========================================================
      // 👤 PROFILE
      // ========================================================

      if (
        command === "profile"
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
                `💰 Dinero: **$${targetUser.money}**\n` +
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
      // ℹ️ USERINFO
      // ========================================================

      if (
        command === "userinfo"
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
            embed(
              `👤 ${target.tag}`,
              `🆔 ID: \`${target.id}\`\n` +
              `🤖 Bot: **${target.bot ? "Sí" : "No"}**\n` +
              `📅 Cuenta: <t:${Math.floor(target.createdTimestamp / 1000)}:F>\n` +
              `📥 Entrada: ${
                member?.joinedTimestamp
                  ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
                  : "Desconocida"
              }`
            )
          ]
        });
      }

      // ========================================================
      // 📝 BIO
      // ========================================================

      if (
        command === "bio"
      ) {
        return message.reply(
          `📝 **Biografía de ${message.author.username}:**\n${user.bio}`
        );
      }

      // ========================================================
      // ✏️ SETBIO
      // ========================================================

      if (
        command === "setbio"
      ) {
        const text =
          args.join(" ");

        if (!text) {
          return message.reply(
            `❌ Usa: \`${PREFIX}setbio <texto>\``
          );
        }

        if (
          text.length > 300
        ) {
          return message.reply(
            "❌ Máximo 300 caracteres."
          );
        }

        user.bio = text;

        saveDB();

        return message.reply(
          "✅ Biografía actualizada."
        );
      }

      // ========================================================
      // 🏠 SERVERINFO
      // ========================================================

      if (
        command === "serverinfo"
      ) {
        return message.reply({
          embeds: [
            embed(
              `🏠 ${message.guild.name}`,
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
      // 🖼️ SERVER ICON
      // ========================================================

      if (
        command === "servericon"
      ) {
        const icon =
          message.guild.iconURL({
            size: 2048
          });

        return message.reply(
          icon ||
          "❌ Este servidor no tiene icono."
        );
      }

      // ========================================================
      // 🎭 ROLES
      // ========================================================

      if (
        command === "roles"
      ) {
        const roles =
          message.guild.roles.cache
            .filter(
              role =>
                role.id !==
                message.guild.id
            )
            .map(
              role =>
                `${role} — ${role.members.size} miembros`
            );

        return replyLong(
          message,
          `🎭 **ROLES DEL SERVIDOR**\n\n` +
          roles.join("\n")
        );
      }

      // ========================================================
      // 💬 CHANNELS
      // ========================================================

      if (
        command === "channels"
      ) {
        const channels =
          message.guild.channels.cache
            .map(
              channel =>
                `💬 ${channel.name}`
            );

        return replyLong(
          message,
          `💬 **CANALES**\n\n` +
          channels.join("\n")
        );
      }

      // ========================================================
      // 🏓 PING
      // ========================================================

      if (
        command === "ping"
      ) {
        return message.reply(
          `🏓 **PONG!**\n📡 Ping: **${client.ws.ping}ms**`
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
          "🟣 No estoy seguro."
        ];

        return message.reply(
          `🎱 ${answers[Math.floor(Math.random() * answers.length)]}`
        );
      }

      // ========================================================
      // 🎲 DICE
      // ========================================================

      if (
        command === "dice"
      ) {
        return message.reply(
          `🎲 Salió **${
            Math.floor(
              Math.random() * 6
            ) + 1
          }**`
        );
      }

      // ========================================================
      // 🪙 COINFLIP
      // ========================================================

      if (
        command === "coinflip"
      ) {
        return message.reply(
          Math.random() < 0.5
            ? "🪙 **Cara**"
            : "🪙 **Cruz**"
        );
      }

      // ========================================================
      // ✂️ RPS
      // ========================================================

      if (
        command === "rps"
      ) {
        const options = [
          "🪨 Piedra",
          "📄 Papel",
          "✂️ Tijera"
        ];

        return message.reply(
          `✂️ Naruto eligió **${
            options[
              Math.floor(
                Math.random() *
                options.length
              )
            ]
          }**`
        );
      }

      // ========================================================
      // 🎯 CHOOSE
      // ========================================================

      if (
        command === "choose"
      ) {
        const choices =
          args.join(" ")
            .split("|")
            .map(
              x => x.trim()
            )
            .filter(Boolean);

        if (
          choices.length < 2
        ) {
          return message.reply(
            `❌ Usa: \`${PREFIX}choose opción 1 | opción 2\``
          );
        }

        return message.reply(
          `🎯 Naruto eligió: **${
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
      // 🛒 SHOP
      // ========================================================

      if (
        [
          "shop",
          "productos"
        ].includes(command)
      ) {
        const products =
          Object.entries(
            g.shop.roles
          );

        if (!products.length) {
          return message.reply(
            "🛒 La tienda está vacía."
          );
        }

        const rows = [];

        for (
          const [roleId, product]
          of products
        ) {
          const role =
            message.guild.roles.cache.get(
              roleId
            );

          if (!role) continue;

          const shopEmbed =
            new EmbedBuilder()
              .setColor(
                role.color || 0xff6b00
              )
              .setTitle(
                `🛒 ${role.name}`
              )
              .setDescription(
                `🎭 **Rol:** ${role}\n` +
                `💰 **Precio:** $${product.price}\n\n` +
                `Pulsa el botón para comprarlo.`
              );

          const button =
            new ButtonBuilder()
              .setCustomId(
                `shop_buy_${role.id}`
              )
              .setLabel(
                "🛒 Comprar"
              )
              .setStyle(
                ButtonStyle.Success
              );

          rows.push({
            embeds: [shopEmbed],
            components: [
              new ActionRowBuilder()
                .addComponents(
                  button
                )
            ]
          });
        }

        // Discord no permite enviar múltiples mensajes
        // con reply en un solo objeto, por eso se envían uno por uno.

        await message.reply(
          `╔══════════════════════════╗\n` +
          `║ 🛒 **TIENDA DE NARUTO**\n` +
          `╚══════════════════════════╝\n\n` +
          `👇 Selecciona el producto que quieras comprar.`
        );

        for (
          const row of rows
        ) {
          await message.channel.send(
            row
          );
        }

        return;
      }

      // ========================================================
      // 🛒 COMPRAR DIRECTAMENTE
      // ========================================================

      if (
        command === "comprar"
      ) {
        const role =
          message.mentions.roles.first();

        if (!role) {
          return message.reply(
            `❌ Usa el botón 🛒 Comprar de \`${PREFIX}shop\` o menciona un rol.`
          );
        }

        return buyRole(
          message.member,
          role,
          g,
          message
        );
      }

      // ========================================================
      // 🎒 INVENTORY
      // ========================================================

      if (
        [
          "inventory",
          "owned"
        ].includes(command)
      ) {
        const owned =
          Object.keys(
            g.shop.roles
          )
            .map(
              id =>
                message.guild.roles.cache.get(id)
            )
            .filter(
              role =>
                role &&
                message.member.roles.cache.has(
                  role.id
                )
            );

        if (!owned.length) {
          return message.reply(
            "🎒 No tienes roles comprados."
          );
        }

        return message.reply(
          `🎒 **TU INVENTARIO**\n\n` +
          owned.join("\n")
        );
      }

      // ========================================================
      // 🔐 COMANDOS ADMIN
      // ========================================================

      const adminCommands = [
        "ban",
        "kick",
        "timeout",
        "untimeout",
        "warn",
        "clear",
        "antilink",
        "antiraid",
        "antinuke",
        "whitelist",
        "setlogs",
        "security",
        "welcome",
        "autorole",
        "setranktext",
        "settings",
        "testlogs",
        "disablelogs"
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
          "❌ Necesitas permisos de **Administrador**."
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
            `🔗 **ANTILINK ACTIVADO**\n\n` +
            `🗑️ Link enviado → mensaje eliminado\n` +
            `🔇 Usuario → timeout de **2 horas**`
          );
        }

        if (
          option === "off"
        ) {
          g.antilink.enabled =
            false;

          saveDB();

          return message.reply(
            "🔗 **ANTILINK DESACTIVADO**."
          );
        }

        if (
          option === "add"
        ) {
          const domain =
            args[1];

          if (!domain) {
            return message.reply(
              `❌ Usa: \`${PREFIX}antilink add discord.com\``
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
            `✅ **${domain}** añadido a la whitelist de links.`
          );
        }

        if (
          option === "remove"
        ) {
          const domain =
            args[1];

          g.antilink.whitelist =
            g.antilink.whitelist.filter(
              x =>
                x !== domain
            );

          saveDB();

          return message.reply(
            `✅ **${domain}** eliminado de la whitelist.`
          );
        }

        return message.reply(
          `🔗 **ANTILINK**\n\n` +
          `Estado: **${g.antilink.enabled ? "🟢 ON" : "🔴 OFF"}**\n` +
          `⏱️ Timeout: **2 horas**\n\n` +
          `\`${PREFIX}antilink on\`\n` +
          `\`${PREFIX}antilink off\`\n` +
          `\`${PREFIX}antilink add <dominio>\`\n` +
          `\`${PREFIX}antilink remove <dominio>\``
        );
      }

      // ========================================================
      // 🤖 ANTIRAID
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
            `🤖 **ANTIRAID ACTIVADO**\n\n` +
            `🚨 Bot no autorizado → **BAN PERMANENTE**`
          );
        }

        if (
          option === "off"
        ) {
          g.antiraid.enabled =
            false;

          saveDB();

          return message.reply(
            "🤖 **ANTIRAID DESACTIVADO**."
          );
        }

        if (
          option === "add"
        ) {
          const bot =
            message.mentions.users.first();

          const id =
            bot?.id ||
            args[1];

          if (!id) {
            return message.reply(
              `❌ Usa: \`${PREFIX}antiraid add @bot\``
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
          option === "remove"
        ) {
          const bot =
            message.mentions.users.first();

          const id =
            bot?.id ||
            args[1];

          g.antiraid.botWhitelist =
            g.antiraid.botWhitelist.filter(
              x => x !== id
            );

          saveDB();

          return message.reply(
            `✅ Bot \`${id}\` eliminado de la whitelist.`
          );
        }

        return message.reply(
          `🤖 **ANTIRAID**\n\n` +
          `Estado: **${g.antiraid.enabled ? "🟢 ON" : "🔴 OFF"}**\n` +
          `🤖 Bots permitidos: **${g.antiraid.botWhitelist.length}**\n\n` +
          `\`${PREFIX}antiraid on\`\n` +
          `\`${PREFIX}antiraid off\`\n` +
          `\`${PREFIX}antiraid add @bot\`\n` +
          `\`${PREFIX}antiraid remove @bot\``
        );
      }

      // ========================================================
      // 🛡️ ANTI-NUKE
      // ========================================================

      if (
        command === "antinuke"
      ) {
        const option =
          args[0]?.toLowerCase();

        if (
          option === "on"
        ) {
          g.antinuke.enabled =
            true;

          saveDB();

          return message.reply(
            `🛡️ **ANTI-NUKE ACTIVADO**\n\n` +
            `📁 Crear/eliminar canales sin whitelist → **KICK**\n` +
            `🎭 Crear/eliminar roles sin whitelist → **KICK**`
          );
        }

        if (
          option === "off"
        ) {
          g.antinuke.enabled =
            false;

          saveDB();

          return message.reply(
            "🛡️ **ANTI-NUKE DESACTIVADO**."
          );
        }

        return message.reply(
          `🛡️ **ANTI-NUKE**\n\n` +
          `Estado: **${g.antinuke.enabled ? "🟢 ON" : "🔴 OFF"}**\n` +
          `📁 Canales: **${g.antinuke.protectChannels ? "🟢" : "🔴"}**\n` +
          `🎭 Roles: **${g.antinuke.protectRoles ? "🟢" : "🔴"}**\n\n` +
          `Whitelist de usuarios: **${g.antinuke.whitelistUsers.length}**\n` +
          `Whitelist de roles: **${g.antinuke.whitelistRoles.length}**`
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
              `❌ Usa: \`${PREFIX}whitelist user @usuario\``
            );
          }

          if (
            !g.antinuke.whitelistUsers.includes(
              member.id
            )
          ) {
            g.antinuke.whitelistUsers.push(
              member.id
            );
          }

          saveDB();

          return message.reply(
            `✅ ${member} añadido a la whitelist Anti-Nuke.`
          );
        }

        if (
          type === "role"
        ) {
          const role =
            message.mentions.roles.first();

          if (!role) {
            return message.reply(
              `❌ Usa: \`${PREFIX}whitelist role @rol\``
            );
          }

          if (
            !g.antinuke.whitelistRoles.includes(
              role.id
            )
          ) {
            g.antinuke.whitelistRoles.push(
              role.id
            );
          }

          saveDB();

          return message.reply(
            `✅ ${role} añadido a la whitelist Anti-Nuke.`
          );
        }

        return message.reply(
          `🔐 **WHITELIST**\n\n` +
          `👤 Usuarios: **${g.antinuke.whitelistUsers.length}**\n` +
          `🎭 Roles: **${g.antinuke.whitelistRoles.length}**\n` +
          `🤖 Bots: **${g.antiraid.botWhitelist.length}**`
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

        if (!member.bannable) {
          return message.reply(
            "❌ No puedo banear a ese usuario."
          );
        }

        await member.ban({
          reason:
            args.slice(1).join(" ") ||
            "Naruto Ban"
        });

        return message.reply(
          `🔨 ${member.user.tag} fue baneado permanentemente.`
        );
      }

      // ========================================================
      // 👢 KICK
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

        if (!member.kickable) {
          return message.reply(
            "❌ No puedo expulsar a ese usuario."
          );
        }

        await member.kick(
          args.slice(1).join(" ") ||
          "Naruto Kick"
        );

        return message.reply(
          `👢 ${member.user.tag} fue expulsado.`
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
            `❌ Usa: \`${PREFIX}timeout @usuario minutos\``
          );
        }

        if (!member.moderatable) {
          return message.reply(
            "❌ No puedo aplicar timeout."
          );
        }

        await member.timeout(
          Math.min(
            minutes * 60000,
            28 * 24 * 60 * 60000
          ),
          "Naruto Timeout"
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
            "❌ Menciona un usuario."
          );
        }

        await member.timeout(
          null,
          "Naruto UnTimeout"
        );

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
            "❌ Menciona un usuario."
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
          await message.channel
            .bulkDelete(
              amount,
              true
            )
            .catch(() => null);

        return message.channel.send(
          `🧹 Eliminados **${deleted?.size || 0} mensajes**.`
        );
      }

      // ========================================================
      // 📝 SETLOGS
      // ========================================================

      if (
        command === "setlogs"
      ) {
        const channel =
          message.mentions.channels.first();

        if (!channel) {
          return message.reply(
            `❌ Usa: \`${PREFIX}setlogs #canal\``
          );
        }

        g.logsChannel =
          channel.id;

        saveDB();

        return message.reply(
          `📝 Logs configurados en ${channel}.`
        );
      }

      // ========================================================
      // ❌ DISABLE LOGS
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
          embed(
            "🧪 TEST DE LOGS",
            "✅ Los logs funcionan correctamente.",
            0x00ff00
          )
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
          `👋 Estado: **${g.welcome.enabled ? "🟢 ON" : "🔴 OFF"}**\n` +
          `📢 Canal: ${
            g.welcome.channel
              ? `<#${g.welcome.channel}>`
              : "No configurado"
          }`
        );
      }

      // ========================================================
      // 🎭 AUTOROLE
      // ========================================================

      if (
        command === "autorole"
      ) {
        const option =
          args[0]?.toLowerCase();

        if (
          option === "on"
        ) {
          g.autorole.enabled =
            true;

          saveDB();

          return message.reply(
            "🎭 Autorole activado."
          );
        }

        if (
          option === "off"
        ) {
          g.autorole.enabled =
            false;

          saveDB();

          return message.reply(
            "🎭 Autorole desactivado."
          );
        }

        if (
          option === "set"
        ) {
          const role =
            message.mentions.roles.first();

          if (!role) {
            return message.reply(
              `❌ Usa: \`${PREFIX}autorole set @rol\``
            );
          }

          g.autorole.role =
            role.id;

          saveDB();

          return message.reply(
            `🎭 Autorole configurado: ${role}`
          );
        }

        return message.reply(
          `🎭 **AUTOROLE**\n\n` +
          `Estado: **${g.autorole.enabled ? "🟢 ON" : "🔴 OFF"}**\n` +
          `Rol: ${
            g.autorole.role
              ? `<@&${g.autorole.role}>`
              : "No configurado"
          }`
        );
      }

      // ========================================================
      // 🏆 SET RANK TEXT
      // ========================================================

      if (
        command === "setranktext"
      ) {
        const text =
          args.join(" ");

        if (!text) {
          return message.reply(
            `❌ Usa:\n\`${PREFIX}setranktext 🍥 {user}, eres ninja al nivel {level}\``
          );
        }

        if (
          text.length > 1000
        ) {
          return message.reply(
            "❌ El texto no puede superar 1000 caracteres."
          );
        }

        g.rank.text =
          text;

        saveDB();

        return message.reply(
          `✅ **Texto del Rank cambiado.**\n\n` +
          `${getRankText(
            g,
            user,
            message.author
          )}\n\n` +
          `Variables disponibles:\n` +
          `\`{user}\` → usuario\n` +
          `\`{username}\` → nombre\n` +
          `\`{level}\` → nivel\n` +
          `\`{xp}\` → XP actual\n` +
          `\`{needed}\` → XP necesaria`
        );
      }

      // ========================================================
      // ⚙️ SETTINGS / SECURITY
      // ========================================================

      if (
        [
          "settings",
          "security"
        ].includes(command)
      ) {
        return message.reply({
          embeds: [
            embed(
              "⚙️ CONFIGURACIÓN DE NARUTO",
              `🔗 AntiLink: **${g.antilink.enabled ? "🟢 ON" : "🔴 OFF"}**\n` +
              `🤖 AntiRaid: **${g.antiraid.enabled ? "🟢 ON" : "🔴 OFF"}**\n` +
              `🛡️ Anti-Nuke: **${g.antinuke.enabled ? "🟢 ON" : "🔴 OFF"}**\n` +
              `👋 Welcome: **${g.welcome.enabled ? "🟢 ON" : "🔴 OFF"}**\n` +
              `🎭 Autorole: **${g.autorole.enabled ? "🟢 ON" : "🔴 OFF"}**\n` +
              `📝 Logs: **${g.logsChannel ? "🟢 ON" : "🔴 OFF"}**\n\n` +
              `🔐 Usuarios whitelist: **${g.antinuke.whitelistUsers.length}**\n` +
              `🎭 Roles whitelist: **${g.antinuke.whitelistRoles.length}**\n` +
              `🤖 Bots whitelist: **${g.antiraid.botWhitelist.length}**`
            )
          ]
        });
      }

      // ========================================================
      // ❓ COMANDO DESCONOCIDO
      // ========================================================

      return message.reply(
        `❌ No existe \`${PREFIX}${command}\`.\n\n` +
        `📚 Usa \`${PREFIX}help\` para abrir el menú.`
      );

    } catch (error) {
      console.error(
        "❌ ERROR:",
        error
      );

      await message.reply(
        "❌ Ocurrió un error ejecutando el comando."
      ).catch(() => {});
    }
  }
);

// ============================================================
// 🛒 FUNCIÓN COMPRA
// ============================================================

async function buyRole(
  member,
  role,
  guildSettings,
  message
) {
  const product =
    guildSettings.shop.roles[
      role.id
    ];

  if (!product) {
    return message.reply(
      "❌ Ese rol no está en la tienda."
    );
  }

  const user =
    getUser(member.id);

  if (
    member.roles.cache.has(
      role.id
    )
  ) {
    return message.reply(
      "❌ Ya tienes ese rol."
    );
  }

  if (
    user.money <
    product.price
  ) {
    return message.reply(
      `❌ Necesitas **$${product.price}** y tienes **$${user.money}**.`
    );
  }

  if (!role.editable) {
    return message.reply(
      "❌ Naruto no puede entregar ese rol. Coloca el rol de Naruto por encima del rol de la tienda."
    );
  }

  user.money -=
    product.price;

  await member.roles.add(
    role,
    "Naruto Shop Purchase"
  );

  saveDB();

  return message.reply(
    `🎉 **COMPRA REALIZADA**\n\n` +
    `🛒 Producto: ${role}\n` +
    `💰 Precio: **$${product.price}**\n` +
    `💵 Dinero restante: **$${user.money}**`
  );
}

// ============================================================
// 🖱️ INTERACCIONES
// ============================================================

client.on(
  Events.InteractionCreate,
  async interaction => {
    try {

      // ========================================================
      // 📚 SELECT MENÚ
      // ========================================================

      if (
        interaction.isStringSelectMenu()
      ) {

        // PUBLIC
        if (
          interaction.customId.startsWith(
            "public_help_"
          )
        ) {
          const userId =
            interaction.customId.replace(
              "public_help_",
              ""
            );

          if (
            interaction.user.id !==
            userId
          ) {
            return interaction.reply({
              content:
                "❌ Este menú pertenece a otra persona.",
              ephemeral: true
            });
          }

          const key =
            interaction.values[0];

          if (
            !categories[key]
          ) {
            return;
          }

          const member =
            interaction.guild.members.cache.get(
              interaction.user.id
            );

          return interaction.update({
            embeds: [
              categoryEmbed(key)
            ],
            components:
              publicMenu(
                interaction.user.id,
                member
              )
          });
        }

        // ADMIN
        if (
          interaction.customId.startsWith(
            "admin_category_"
          )
        ) {
          const userId =
            interaction.customId.replace(
              "admin_category_",
              ""
            );

          if (
            interaction.user.id !==
            userId
          ) {
            return interaction.reply({
              content:
                "❌ Este menú pertenece a otra persona.",
              ephemeral: true
            });
          }

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

          const key =
            interaction.values[0];

          return interaction.update({
            embeds: [
              adminCategoryEmbed(key)
            ],
            components:
              adminMenu(
                interaction.user.id
              )
          });
        }
      }

      // ========================================================
      // 🛒 BOTÓN COMPRAR
      // ========================================================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "shop_buy_"
        )
      ) {
        const roleId =
          interaction.customId.replace(
            "shop_buy_",
            ""
          );

        const role =
          interaction.guild.roles.cache.get(
            roleId
          );

        if (!role) {
          return interaction.reply({
            content:
              "❌ Ese rol ya no existe.",
            ephemeral: true
          });
        }

        const g =
          getGuild(
            interaction.guild.id
          );

        const product =
          g.shop.roles[
            roleId
          ];

        if (!product) {
          return interaction.reply({
            content:
              "❌ Ese producto ya no está disponible.",
            ephemeral: true
          });
        }

        const user =
          getUser(
            interaction.user.id
          );

        if (
          interaction.member.roles.cache.has(
            roleId
          )
        ) {
          return interaction.reply({
            content:
              "❌ Ya tienes este rol.",
            ephemeral: true
          });
        }

        if (
          user.money <
          product.price
        ) {
          return interaction.reply({
            content:
              `❌ Necesitas **$${product.price}** y tienes **$${user.money}**.`,
            ephemeral: true
          });
        }

        if (
          !role.editable
        ) {
          return interaction.reply({
            content:
              "❌ Naruto no puede darte este rol. Sube el rol de Naruto por encima del rol de la tienda.",
            ephemeral: true
          });
        }

        user.money -=
          product.price;

        await interaction.member.roles
          .add(
            role,
            "Naruto Shop Purchase"
          )
          .catch(() => {});

        saveDB();

        return interaction.reply({
          content:
            `🎉 **COMPRA REALIZADA**\n\n` +
            `🛒 ${role}\n` +
            `💰 Precio: **$${product.price}**\n` +
            `💵 Dinero restante: **$${user.money}**`,
          ephemeral: true
        });
      }

      // ========================================================
      // 🔐 ABRIR PANEL ADMIN
      // ========================================================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "admin_help_"
        )
      ) {
        const userId =
          interaction.customId.replace(
            "admin_help_",
            ""
          );

        if (
          interaction.user.id !==
          userId
        ) {
          return interaction.reply({
            content:
              "❌ Este menú pertenece a otra persona.",
            ephemeral: true
          });
        }

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
            adminHelp()
          ],
          components:
            adminMenu(
              interaction.user.id
            )
        });
      }

      // ========================================================
      // ◀️ ADMIN → PÚBLICO
      // ========================================================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "public_from_admin_"
        )
      ) {
        const userId =
          interaction.customId.replace(
            "public_from_admin_",
            ""
          );

        if (
          interaction.user.id !==
          userId
        ) {
          return interaction.reply({
            content:
              "❌ Este menú pertenece a otra persona.",
            ephemeral: true
          });
        }

        const member =
          interaction.guild.members.cache.get(
            interaction.user.id
          );

        return interaction.update({
          embeds: [
            mainHelp(member)
          ],
          components:
            publicMenu(
              interaction.user.id,
              member
            )
        });
      }

    } catch (error) {
      console.error(
        "❌ INTERACTION ERROR:",
        error
      );
    }
  }
);

// ============================================================
// 🚨 ERRORES
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

if (
  !process.env.DISCORD_TOKEN
) {
  console.error(
    "❌ No existe DISCORD_TOKEN en Render."
  );

  process.exit(1);
}

client.login(
  process.env.DISCORD_TOKEN
);
