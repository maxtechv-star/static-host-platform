const AuthService = require('../../../lib/auth');
const emailService = require('../../../lib/email');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, name, acceptTerms } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Email, password, and name are required' 
      });
    }

    // Validate email format
    if (!AuthService.validateEmail(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    // Validate password strength
    const passwordValidation = AuthService.validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        error: passwordValidation.message 
      });
    }

    // Check terms acceptance
    if (!acceptTerms) {
      return res.status(400).json({ 
        error: 'You must accept the terms and conditions' 
      });
    }

    // Create new user
    const userData = {
      email: email.toLowerCase(),
      password,
      name: name.trim()
    };

    const authResult = await AuthService.createUser(userData);

    // Send verification email
    try {
      await emailService.sendVerificationEmail(
        authResult.user.email,
        authResult.user.name,
        authResult.verificationToken
      );
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue even if email fails
    }

    // Create session token
    const token = AuthService.generateToken(authResult.user);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        _id: authResult.user._id,
        email: authResult.user.email,
        name: authResult.user.name,
        roles: authResult.user.roles,
        emailVerified: authResult.user.emailVerified
      },
      token,
      requiresVerification: !authResult.user.emailVerified
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific error types
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    
    if (error.message.includes('Invalid') || error.message.includes('must be')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ 
      error: 'Failed to create account. Please try again.' 
    });
  }
}