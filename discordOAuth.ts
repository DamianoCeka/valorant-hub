// Discord OAuth2 Implementation for user authentication
// This allows each visitor to login with their own Discord account

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

const DISCORD_API_BASE = "https://discord.com/api/v10";
const DISCORD_OAUTH_URL = "https://discord.com/api/oauth2";

export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface DiscordUserProfile {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string;
  avatar?: string;
  email?: string;
}

// Build redirect URI from the request (uses X-Forwarded-Host for custom domains behind proxy)
export function buildRedirectUri(req: { get: (name: string) => string | undefined, hostname: string }): string {
  // Prefer X-Forwarded-Host for custom domains behind Replit proxy
  const host = req.get("x-forwarded-host") || req.get("host") || req.hostname;
  // Ensure https for production domains
  const protocol = host.includes("localhost") ? "http" : "https";
  console.log("[OAuth] Building redirect URI with host:", host);
  return `${protocol}://${host}/api/auth/callback`;
}

export function getAuthorizationUrl(state: string, redirectUri: string): string {
  if (!DISCORD_CLIENT_ID) {
    throw new Error("DISCORD_CLIENT_ID not configured");
  }

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify email",
    state,
  });

  return `${DISCORD_OAUTH_URL}/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<DiscordTokenResponse> {
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    throw new Error("Discord OAuth credentials not configured");
  }

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(`${DISCORD_OAUTH_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Discord OAuth] Token exchange failed:", error);
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return response.json();
}

export async function getUserProfile(accessToken: string): Promise<DiscordUserProfile> {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.status}`);
  }

  return response.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<DiscordTokenResponse> {
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    throw new Error("Discord OAuth credentials not configured");
  }

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(`${DISCORD_OAUTH_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json();
}

export function getDiscordAvatarUrl(userId: string, avatar: string | null): string {
  if (!avatar) {
    return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
  }
  return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
}

export function isConfigured(): boolean {
  return !!(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET);
}
