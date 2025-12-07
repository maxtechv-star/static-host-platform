const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

class AuthService {
    // Generate JWT token
    static generateToken(user) {
        const payload = {
            userId: user._id.toString(),
            email: user.email,
            roles: user.roles || ['user'],
            name: user.name
        };
        
        return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    }
    
    // Verify JWT token
    static verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            return null;
        }
    }
    
    // Hash password
    static async hashPassword(password) {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    }
    
    // Verify password
    static async verifyPassword(password, hashedPassword) {
        return bcrypt.compare(password, hashedPassword);
    }
    
    // Validate email
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Validate password strength
    static validatePassword(password) {
        if (password.length < 8) {
            return { valid: false, message: 'Password must be at least 8 characters long' };
        }
        
        if (!/[A-Z]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one uppercase letter' };
        }
        
        if (!/[a-z]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one lowercase letter' };
        }
        
        if (!/[0-9]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one number' };
        }
        
        return { valid: true };
    }
    
    // Create new user
    static async createUser(userData) {
        const { email, password, name } = userData;
        
        // Validate email
        if (!this.validateEmail(email)) {
            throw new Error('Invalid email address');
        }
        
        // Validate password
        const passwordValidation = this.validatePassword(password);
        if (!passwordValidation.valid) {
            throw new Error(passwordValidation.message);
        }
        
        // Check if user already exists
        const existingUser = await db.getCollection('users').findOne({ email });
        if (existingUser) {
            throw new Error('User with this email already exists');
        }
        
        // Hash password
        const passwordHash = await this.hashPassword(password);
        
        // Check if first user should be admin
        const userCount = await db.getCollection('users').countDocuments();
        const roles = userCount === 0 || process.env.ADMIN_EMAILS?.includes(email) 
            ? ['user', 'admin'] 
            : ['user'];
        
        // Create user
        const user = {
            email,
            passwordHash,
            name: name || email.split('@')[0],
            roles,
            emailVerified: false,
            createdAt: new Date(),
            lastLogin: null,
            settings: {
                emailNotifications: true,
                twoFactorEnabled: false
            },
            quota: {
                maxSites: parseInt(process.env.MAX_SITES_PER_USER) || 10,
                maxStorage: parseInt(process.env.MAX_STORAGE_PER_USER) || 100 * 1024 * 1024, // 100MB
                usedStorage: 0,
                usedSites: 0
            }
        };
        
        // Insert into database
        const result = await db.getCollection('users').insertOne(user);
        user._id = result.insertedId;
        
        // Create verification token
        const verificationToken = jwt.sign(
            { userId: user._id.toString(), email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        return {
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                roles: user.roles,
                emailVerified: user.emailVerified
            },
            token: this.generateToken(user),
            verificationToken
        };
    }
    
    // Login user
    static async login(email, password) {
        // Find user
        const user = await db.getCollection('users').findOne({ email });
        if (!user) {
            throw new Error('Invalid email or password');
        }
        
        // Check password
        const isValidPassword = await this.verifyPassword(password, user.passwordHash);
        if (!isValidPassword) {
            throw new Error('Invalid email or password');
        }
        
        // Update last login
        await db.getCollection('users').updateOne(
            { _id: user._id },
            { $set: { lastLogin: new Date() } }
        );
        
        // Generate token
        const token = this.generateToken(user);
        
        return {
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                roles: user.roles,
                emailVerified: user.emailVerified
            },
            token
        };
    }
    
    // Google OAuth login/signup
    static async handleGoogleAuth(googleUser) {
        const { email, name, picture, googleId } = googleUser;
        
        // Find existing user by email or googleId
        let user = await db.getCollection('users').findOne({
            $or: [
                { email },
                { googleId }
            ]
        });
        
        if (user) {
            // Update user with Google info if missing
            const updateData = {};
            if (!user.googleId) updateData.googleId = googleId;
            if (!user.picture && picture) updateData.picture = picture;
            
            if (Object.keys(updateData).length > 0) {
                await db.getCollection('users').updateOne(
                    { _id: user._id },
                    { $set: updateData }
                );
            }
            
            // Mark email as verified if from Google
            if (!user.emailVerified) {
                await db.getCollection('users').updateOne(
                    { _id: user._id },
                    { $set: { emailVerified: true } }
                );
                user.emailVerified = true;
            }
        } else {
            // Create new user
            const userCount = await db.getCollection('users').countDocuments();
            const roles = userCount === 0 || process.env.ADMIN_EMAILS?.includes(email)
                ? ['user', 'admin']
                : ['user'];
            
            user = {
                email,
                name,
                googleId,
                picture,
                roles,
                emailVerified: true,
                createdAt: new Date(),
                lastLogin: new Date(),
                settings: {
                    emailNotifications: true,
                    twoFactorEnabled: false
                },
                quota: {
                    maxSites: parseInt(process.env.MAX_SITES_PER_USER) || 10,
                    maxStorage: parseInt(process.env.MAX_STORAGE_PER_USER) || 100 * 1024 * 1024,
                    usedStorage: 0,
                    usedSites: 0
                }
            };
            
            const result = await db.getCollection('users').insertOne(user);
            user._id = result.insertedId;
        }
        
        // Update last login
        await db.getCollection('users').updateOne(
            { _id: user._id },
            { $set: { lastLogin: new Date() } }
        );
        
        // Generate token
        const token = this.generateToken(user);
        
        return {
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                roles: user.roles,
                picture: user.picture,
                emailVerified: user.emailVerified
            },
            token
        };
    }
    
    // Verify email
    static async verifyEmail(token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            
            if (!decoded.userId || !decoded.email) {
                throw new Error('Invalid token');
            }
            
            const user = await db.getCollection('users').findOne({
                _id: new ObjectId(decoded.userId),
                email: decoded.email
            });
            
            if (!user) {
                throw new Error('User not found');
            }
            
            if (user.emailVerified) {
                return { success: true, message: 'Email already verified' };
            }
            
            await db.getCollection('users').updateOne(
                { _id: user._id },
                { $set: { emailVerified: true } }
            );
            
            return { 
                success: true, 
                message: 'Email verified successfully' 
            };
        } catch (error) {
            throw new Error('Invalid or expired verification token');
        }
    }
    
    // Middleware for protected routes
    static async requireAuth(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'No token provided' });
            }
            
            const token = authHeader.split(' ')[1];
            const decoded = this.verifyToken(token);
            
            if (!decoded) {
                return res.status(401).json({ error: 'Invalid token' });
            }
            
            // Check if user still exists
            const user = await db.getCollection('users').findOne({
                _id: new ObjectId(decoded.userId)
            });
            
            if (!user) {
                return res.status(401).json({ error: 'User no longer exists' });
            }
            
            req.user = {
                _id: user._id,
                email: user.email,
                name: user.name,
                roles: user.roles
            };
            
            next();
        } catch (error) {
            return res.status(401).json({ error: 'Authentication failed' });
        }
    }
    
    // Middleware for admin routes
    static async requireAdmin(req, res, next) {
        await this.requireAuth(req, res, () => {
            if (!req.user.roles.includes('admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }
            next();
        });
    }
    
    // Change password
    static async changePassword(userId, currentPassword, newPassword) {
        const user = await db.getCollection('users').findOne({
            _id: new ObjectId(userId)
        });
        
        if (!user) {
            throw new Error('User not found');
        }
        
        if (!user.passwordHash) {
            throw new Error('Password login not enabled for this account');
        }
        
        // Verify current password
        const isValid = await this.verifyPassword(currentPassword, user.passwordHash);
        if (!isValid) {
            throw new Error('Current password is incorrect');
        }
        
        // Validate new password
        const validation = this.validatePassword(newPassword);
        if (!validation.valid) {
            throw new Error(validation.message);
        }
        
        // Hash new password
        const newPasswordHash = await this.hashPassword(newPassword);
        
        // Update password
        await db.getCollection('users').updateOne(
            { _id: user._id },
            { $set: { passwordHash: newPasswordHash } }
        );
        
        return { success: true, message: 'Password updated successfully' };
    }
    
    // Request password reset
    static async requestPasswordReset(email) {
        const user = await db.getCollection('users').findOne({ email });
        
        if (!user) {
            // Don't reveal if user exists for security
            return { success: true };
        }
        
        const resetToken = jwt.sign(
            { userId: user._id.toString(), email: user.email },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        return {
            success: true,
            resetToken,
            email: user.email
        };
    }
    
    // Reset password with token
    static async resetPassword(token, newPassword) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            
            if (!decoded.userId || !decoded.email) {
                throw new Error('Invalid token');
            }
            
            const user = await db.getCollection('users').findOne({
                _id: new ObjectId(decoded.userId),
                email: decoded.email
            });
            
            if (!user) {
                throw new Error('User not found');
            }
            
            // Validate new password
            const validation = this.validatePassword(newPassword);
            if (!validation.valid) {
                throw new Error(validation.message);
            }
            
            // Hash new password
            const newPasswordHash = await this.hashPassword(newPassword);
            
            // Update password
            await db.getCollection('users').updateOne(
                { _id: user._id },
                { $set: { passwordHash: newPasswordHash } }
            );
            
            return { success: true, message: 'Password reset successfully' };
        } catch (error) {
            throw new Error('Invalid or expired reset token');
        }
    }
}

module.exports = AuthService;