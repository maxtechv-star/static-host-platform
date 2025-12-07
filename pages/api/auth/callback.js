const { OAuth2Client } = require('google-auth-library');
const AuthService = require('../../../lib/auth');

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/api/auth/callback`
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'No authorization code provided' });
    }

    // Exchange code for tokens
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Get user info from Google
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    
    // Extract user information
    const googleUser = {
      googleId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified,
      name: payload.name,
      picture: payload.picture
    };

    // Handle Google authentication
    const authResult = await AuthService.handleGoogleAuth(googleUser);

    // Create session token
    const token = AuthService.generateToken(authResult.user);

    // Store token in HTTP-only cookie for security
    res.setHeader('Set-Cookie', [
      `token=${token}; Path=/; HttpOnly; Secure=${process.env.NODE_ENV === 'production'}; SameSite=Strict; Max-Age=604800`,
      `user=${encodeURIComponent(JSON.stringify(authResult.user))}; Path=/; Secure=${process.env.NODE_ENV === 'production'}; SameSite=Strict; Max-Age=604800`
    ]);

    // Redirect to dashboard or original state
    const redirectUrl = state || '/dashboard';
    res.redirect(302, redirectUrl);

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    
    // Redirect to login page with error
    const errorMessage = encodeURIComponent(
      error.message.includes('invalid_grant') 
        ? 'Google login session expired. Please try again.'
        : 'Google login failed. Please try again.'
    );
    
    res.redirect(302, `/auth/login?error=${errorMessage}`);
  }
}