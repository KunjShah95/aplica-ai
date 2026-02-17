import { authService } from '../service.js';

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.API_BASE_URL
  ? `${process.env.API_BASE_URL}/api/auth/callback/discord`
  : 'http://localhost:3000/api/auth/callback/discord';

export const discordOAuth = {
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID!,
      redirect_uri: DISCORD_REDIRECT_URI,
      response_type: 'code',
      scope: 'identify email',
    });
    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  },

  async getTokens(code: string) {
    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID!,
        client_secret: DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error_description || 'Failed to get Discord tokens');
    }
    return data;
  },

  async getUserInfo(accessToken: string) {
    const response = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const user = await response.json();

    return {
      provider: 'discord',
      providerAccountId: String(user.id),
      email: user.email,
      name: user.global_name || user.username,
      avatar: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : undefined,
    };
  },
};

export async function handleDiscordOAuth(code: string) {
  const tokens = await discordOAuth.getTokens(code);

  if (!tokens.access_token) {
    throw new Error('Failed to get Discord access token');
  }

  const profile = await discordOAuth.getUserInfo(tokens.access_token);
  return authService.oauthLogin(profile);
}
