// Discord OAuth Integration for ITSME Tournament Hub
// Uses Replit Discord connector for authentication

let connectionSettings: any;

export async function getAccessToken(): Promise<string> {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=discord',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Discord not connected');
  }
  return accessToken;
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string;
  avatar?: string;
  email?: string;
}

export async function getDiscordUser(): Promise<DiscordUser> {
  const token = await getAccessToken();
  
  const response = await fetch('https://discord.com/api/users/@me', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Discord user');
  }

  return response.json();
}

export function getDiscordAvatarUrl(userId: string, avatar: string | null): string {
  if (!avatar) {
    return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
  }
  return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
}

// Discord Webhook Integration for Tournament Announcements
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  thumbnail?: { url: string };
  footer?: { text: string };
  timestamp?: string;
}

interface WebhookPayload {
  username?: string;
  avatar_url?: string;
  content?: string;
  embeds?: DiscordEmbed[];
}

export async function sendDiscordWebhook(payload: WebhookPayload): Promise<boolean> {
  if (!DISCORD_WEBHOOK_URL) {
    console.log("[Discord Webhook] No webhook URL configured, skipping...");
    return false;
  }

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "ITSME Tournament Bot",
        avatar_url: "https://i.imgur.com/your-logo.png",
        ...payload,
      }),
    });

    if (!response.ok) {
      console.error("[Discord Webhook] Failed to send:", response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[Discord Webhook] Error:", error);
    return false;
  }
}

// ITSME Branding colors
const ITSME_RED = 0xff4655;
const ITSME_GOLD = 0xffd700;
const ITSME_GREEN = 0x22c55e;

export async function announceTournamentCreated(tournament: {
  id: string;
  name: string;
  description?: string;
  date: Date | string;
  prizePool?: string;
  maxTeams?: number;
}): Promise<boolean> {
  const date = new Date(tournament.date);
  const formattedDate = date.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return sendDiscordWebhook({
    content: "@everyone **NUOVO TORNEO!**",
    embeds: [{
      title: `🎮 ${tournament.name}`,
      description: tournament.description || "Un nuovo torneo è stato creato! Registrati ora!",
      color: ITSME_RED,
      fields: [
        { name: "📅 Data", value: formattedDate, inline: true },
        { name: "💰 Montepremi", value: tournament.prizePool || "TBA", inline: true },
        { name: "👥 Max Teams", value: String(tournament.maxTeams || 16), inline: true },
      ],
      footer: { text: "ITSME Tournament Hub | Registrati sul sito!" },
      timestamp: new Date().toISOString(),
    }],
  });
}

export async function announceRegistrationOpen(tournament: {
  id: string;
  name: string;
  currentTeams: number;
  maxTeams: number;
}): Promise<boolean> {
  return sendDiscordWebhook({
    content: "**📢 Iscrizioni Aperte!**",
    embeds: [{
      title: `Registrazione aperta per ${tournament.name}`,
      description: `Affrettati! I posti sono limitati.`,
      color: ITSME_GOLD,
      fields: [
        { name: "Posti disponibili", value: `${tournament.maxTeams - tournament.currentTeams}/${tournament.maxTeams}`, inline: true },
      ],
      footer: { text: "ITSME Tournament Hub" },
    }],
  });
}

export async function announceTeamRegistered(tournament: {
  name: string;
  teamName: string;
  currentTeams: number;
  maxTeams: number;
}): Promise<boolean> {
  return sendDiscordWebhook({
    embeds: [{
      title: `✅ Nuovo team iscritto!`,
      description: `**${tournament.teamName}** si è iscritto a **${tournament.name}**`,
      color: ITSME_GREEN,
      fields: [
        { name: "Posti rimanenti", value: `${tournament.maxTeams - tournament.currentTeams}/${tournament.maxTeams}`, inline: true },
      ],
      footer: { text: "ITSME Tournament Hub" },
    }],
  });
}

export async function announceTournamentStarting(tournament: {
  name: string;
  teamsCount: number;
}): Promise<boolean> {
  return sendDiscordWebhook({
    content: "@everyone **🚀 IL TORNEO STA PER INIZIARE!**",
    embeds: [{
      title: `${tournament.name} - INIZIA ORA!`,
      description: `${tournament.teamsCount} team pronti a sfidarsi! Good luck!`,
      color: ITSME_RED,
      footer: { text: "ITSME Tournament Hub | Che vinca il migliore!" },
      timestamp: new Date().toISOString(),
    }],
  });
}

export async function announceTournamentWinner(tournament: {
  name: string;
  winnerTeam: string;
  prizePool?: string;
}): Promise<boolean> {
  return sendDiscordWebhook({
    content: "@everyone **🏆 VINCITORE ANNUNCIATO!**",
    embeds: [{
      title: `🏆 ${tournament.winnerTeam} VINCE!`,
      description: `Congratulazioni a **${tournament.winnerTeam}** per aver vinto **${tournament.name}**!`,
      color: ITSME_GOLD,
      fields: tournament.prizePool ? [
        { name: "💰 Premio", value: tournament.prizePool, inline: true },
      ] : [],
      footer: { text: "ITSME Tournament Hub | GG WP!" },
      timestamp: new Date().toISOString(),
    }],
  });
}
