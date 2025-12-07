const AuthService = require('../../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Attempt login
    const authResult = await AuthService.login(email, password);

    // Check if email is verified
    if (!authResult.user.emailVerified) {
      return res.status(403).json({
        success: false,
        error: 'Email not verified',
        message: 'Please verify your email before logging in.',
        requiresVerification: true,
        email: authResult.user.email
      });
    }

    // Create session token
    const token = AuthService.generateToken(authResult.user);

    // Set HTTP-only cookie for additional security
    res.setHeader('Set-Cookie', [
      `token=${token}; Path=/; HttpOnly; Secure=${process.env.NODE_ENV === 'production'}; SameSite=Strict; Max-Age=604800`,
      `user=${encodeURIComponent(JSON.stringify(authResult.user))}; Path=/; Secure=${process.env.NODE_ENV === 'production'}; SameSite=Strict; Max-Age=604800`
    ]);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: authResult.user,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    
    // Provide specific error messages
    if (error.message.includes('Invalid email or password')) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    if (error.message.includes('not verified')) {
      return res.status(403).json({
        error: 'Email not verified',
        requiresVerification: true
      });
    }

    res.status(500).json({ 
      error: 'Login failed. Please try again.' 
    });
  }
}