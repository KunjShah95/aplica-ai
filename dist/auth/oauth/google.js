import { OAuth2Client } from 'google-auth-library';
import { authService } from '../service.js';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.API_BASE_URL
    ? `${process.env.API_BASE_URL}/api/auth/callback/google`
    : 'http://localhost:3000/api/auth/callback/google';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
export const googleOAuth = {
    getAuthUrl() {
        return googleClient.generateAuthUrl({
            access_type: 'offline',
            scope: [
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile',
            ],
            prompt: 'consent',
        });
    },
    async getTokens(code) {
        const { tokens } = await googleClient.getToken(code);
        return tokens;
    },
    async getUserInfo(accessToken) {
        const ticket = await googleClient.verifyIdToken({
            idToken: accessToken,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload) {
            throw new Error('Invalid Google token');
        }
        return {
            provider: 'google',
            providerAccountId: payload.sub,
            email: payload.email,
            name: payload.name,
            avatar: payload.picture,
        };
    },
};
export async function handleGoogleOAuth(code) {
    const tokens = await googleOAuth.getTokens(code);
    if (!tokens.id_token) {
        throw new Error('Failed to get Google ID token');
    }
    const profile = await googleOAuth.getUserInfo(tokens.id_token);
    return authService.oauthLogin(profile);
}
//# sourceMappingURL=google.js.map