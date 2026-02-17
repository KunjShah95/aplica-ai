import { authService } from '../service.js';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_REDIRECT_URI = process.env.API_BASE_URL
  ? `${process.env.API_BASE_URL}/api/auth/callback/github`
  : 'http://localhost:3000/api/auth/callback/github';

export const githubOAuth = {
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID!,
      redirect_uri: GITHUB_REDIRECT_URI,
      scope: 'read:user user:email',
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  },

  async getTokens(code: string) {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error_description || 'Failed to get GitHub tokens');
    }
    return data;
  },

  async getUserInfo(accessToken: string) {
    const [userResponse, emailsResponse] = await Promise.all([
      fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
      fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    ]);

    const user = await userResponse.json();
    const emails = await emailsResponse.json();

    const primaryEmail = emails.find((e: any) => e.primary)?.email || emails[0]?.email;

    return {
      provider: 'github',
      providerAccountId: String(user.id),
      email: primaryEmail || user.email,
      name: user.name || user.login,
      avatar: user.avatar_url,
    };
  },
};

export async function handleGitHubOAuth(code: string) {
  const tokens = await githubOAuth.getTokens(code);

  if (!tokens.access_token) {
    throw new Error('Failed to get GitHub access token');
  }

  const profile = await githubOAuth.getUserInfo(tokens.access_token);
  return authService.oauthLogin(profile);
}
