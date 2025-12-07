const { ObjectId } = require('mongodb');
const db = require('../lib/db');

class User {
    // Create new user
    static async create(userData) {
        const collection = await db.getCollection('users');
        
        const user = {
            email: userData.email,
            name: userData.name || userData.email.split('@')[0],
            googleId: userData.googleId || null,
            passwordHash: userData.passwordHash || null,
            picture: userData.picture || null,
            roles: userData.roles || ['user'],
            emailVerified: userData.emailVerified || false,
            verificationToken: userData.verificationToken || null,
            verificationExpires: userData.verificationExpires || null,
            resetPasswordToken: userData.resetPasswordToken || null,
            resetPasswordExpires: userData.resetPasswordExpires || null,
            
            // Settings
            settings: {
                emailNotifications: userData.settings?.emailNotifications !== false,
                twoFactorEnabled: userData.settings?.twoFactorEnabled || false,
                twoFactorSecret: userData.settings?.twoFactorSecret || null,
                preferredTheme: userData.settings?.preferredTheme || 'light',
                language: userData.settings?.language || 'en'
            },
            
            // Quotas
            quota: {
                maxSites: userData.quota?.maxSites || parseInt(process.env.MAX_SITES_PER_USER) || 10,
                maxStorage: userData.quota?.maxStorage || parseInt(process.env.MAX_STORAGE_PER_USER) || 100 * 1024 * 1024, // 100MB
                usedSites: userData.quota?.usedSites || 0,
                usedStorage: userData.quota?.usedStorage || 0,
                lastReset: userData.quota?.lastReset || new Date()
            },
            
            // Status
            status: userData.status || 'active',
            suspendedAt: userData.suspendedAt || null,
            suspensionReason: userData.suspensionReason || null,
            deletedAt: userData.deletedAt || null,
            
            // Timestamps
            createdAt: userData.createdAt || new Date(),
            updatedAt: userData.updatedAt || new Date(),
            lastLogin: userData.lastLogin || null,
            lastActive: userData.lastActive || null,
            
            // Analytics
            analytics: {
                totalLogins: userData.analytics?.totalLogins || 0,
                lastIp: userData.analytics?.lastIp || null,
                userAgent: userData.analytics?.userAgent || null
            },
            
            // Billing (for future upgrades)
            billing: {
                plan: userData.billing?.plan || 'free',
                stripeCustomerId: userData.billing?.stripeCustomerId || null,
                subscriptionId: userData.billing?.subscriptionId || null,
                subscriptionStatus: userData.billing?.subscriptionStatus || null,
                currentPeriodEnd: userData.billing?.currentPeriodEnd || null
            }
        };
        
        // Check if first user should be admin
        const userCount = await collection.countDocuments();
        if (userCount === 0 || process.env.ADMIN_EMAILS?.includes(user.email)) {
            user.roles = ['user', 'admin'];
        }
        
        const result = await collection.insertOne(user);
        user._id = result.insertedId;
        
        return user;
    }
    
    // Find user by ID
    static async findById(userId, options = {}) {
        const collection = await db.getCollection('users');
        
        const projection = {};
        if (options.excludeSensitive) {
            projection.passwordHash = 0;
            projection.googleId = 0;
            projection.settings.twoFactorSecret = 0;
            projection.resetPasswordToken = 0;
            projection.resetPasswordExpires = 0;
            projection.verificationToken = 0;
            projection.verificationExpires = 0;
        }
        
        return collection.findOne(
            { _id: new ObjectId(userId) },
            { projection }
        );
    }
    
    // Find user by email
    static async findByEmail(email, options = {}) {
        const collection = await db.getCollection('users');
        
        const projection = {};
        if (options.excludeSensitive) {
            projection.passwordHash = 0;
            projection.googleId = 0;
            projection.settings.twoFactorSecret = 0;
        }
        
        return collection.findOne(
            { email: email.toLowerCase() },
            { projection }
        );
    }
    
    // Find user by Google ID
    static async findByGoogleId(googleId) {
        const collection = await db.getCollection('users');
        return collection.findOne({ googleId });
    }
    
    // Update user
    static async update(userId, updates) {
        const collection = await db.getCollection('users');
        
        const updateData = {
            ...updates,
            updatedAt: new Date()
        };
        
        const result = await collection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: updateData }
        );
        
        return result.modifiedCount > 0;
    }
    
    // Update last login
    static async updateLastLogin(userId, ip = null, userAgent = null) {
        const collection = await db.getCollection('users');
        
        const updateData = {
            lastLogin: new Date(),
            lastActive: new Date(),
            updatedAt: new Date()
        };
        
        if (ip) {
            updateData['analytics.lastIp'] = ip;
        }
        
        if (userAgent) {
            updateData['analytics.userAgent'] = userAgent;
        }
        
        updateData['analytics.totalLogins'] = { $inc: 1 };
        
        await collection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: updateData }
        );
    }
    
    // Update quota usage
    static async updateQuota(userId, updates) {
        const collection = await db.getCollection('users');
        
        const setData = {};
        const incData = {};
        
        if (updates.usedSites !== undefined) {
            incData['quota.usedSites'] = updates.usedSites;
        }
        
        if (updates.usedStorage !== undefined) {
            incData['quota.usedStorage'] = updates.usedStorage;
        }
        
        if (updates.maxSites !== undefined) {
            setData['quota.maxSites'] = updates.maxSites;
        }
        
        if (updates.maxStorage !== undefined) {
            setData['quota.maxStorage'] = updates.maxStorage;
        }
        
        const updateQuery = {};
        if (Object.keys(setData).length > 0) {
            updateQuery.$set = setData;
        }
        if (Object.keys(incData).length > 0) {
            updateQuery.$inc = incData;
        }
        
        if (Object.keys(updateQuery).length === 0) {
            return false;
        }
        
        updateQuery.$set = {
            ...(updateQuery.$set || {}),
            updatedAt: new Date()
        };
        
        const result = await collection.updateOne(
            { _id: new ObjectId(userId) },
            updateQuery
        );
        
        return result.modifiedCount > 0;
    }
    
    // Verify email
    static async verifyEmail(userId) {
        const collection = await db.getCollection('users');
        
        const result = await collection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    emailVerified: true,
                    verificationToken: null,
                    verificationExpires: null,
                    updatedAt: new Date()
                }
            }
        );
        
        return result.modifiedCount > 0;
    }
    
    // Set verification token
    static async setVerificationToken(userId, token) {
        const collection = await db.getCollection('users');
        
        const result = await collection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    verificationToken: token,
                    verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                    updatedAt: new Date()
                }
            }
        );
        
        return result.modifiedCount > 0;
    }
    
    // Set password reset token
    static async setPasswordResetToken(userId, token) {
        const collection = await db.getCollection('users');
        
        const result = await collection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    resetPasswordToken: token,
                    resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
                    updatedAt: new Date()
                }
            }
        );
        
        return result.modifiedCount > 0;
    }
    
    // Reset password
    static async resetPassword(userId, passwordHash) {
        const collection = await db.getCollection('users');
        
        const result = await collection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    passwordHash,
                    resetPasswordToken: null,
                    resetPasswordExpires: null,
                    updatedAt: new Date()
                }
            }
        );
        
        return result.modifiedCount > 0;
    }
    
    // Delete user (soft delete)
    static async delete(userId) {
        const collection = await db.getCollection('users');
        
        const result = await collection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    status: 'deleted',
                    deletedAt: new Date(),
                    email: `deleted_${Date.now()}_${userId}@deleted.com`,
                    name: 'Deleted User',
                    updatedAt: new Date()
                }
            }
        );
        
        return result.modifiedCount > 0;
    }
    
    // Suspend user
    static async suspend(userId, reason = '') {
        const collection = await db.getCollection('users');
        
        const result = await collection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    status: 'suspended',
                    suspendedAt: new Date(),
                    suspensionReason: reason,
                    updatedAt: new Date()
                }
            }
        );
        
        return result.modifiedCount > 0;
    }
    
    // Activate user
    static async activate(userId) {
        const collection = await db.getCollection('users');
        
        const result = await collection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    status: 'active',
                    suspendedAt: null,
                    suspensionReason: null,
                    updatedAt: new Date()
                }
            }
        );
        
        return result.modifiedCount > 0;
    }
    
    // Check if user has admin role
    static isAdmin(user) {
        return user && user.roles && user.roles.includes('admin');
    }
    
    // Get user statistics
    static async getStats(userId) {
        const collection = await db.getCollection('users');
        
        const user = await collection.findOne(
            { _id: new ObjectId(userId) },
            {
                projection: {
                    quota: 1,
                    createdAt: 1,
                    lastLogin: 1,
                    analytics: 1
                }
            }
        );
        
        if (!user) {
            return null;
        }
        
        // Get site counts
        const sitesCollection = await db.getCollection('sites');
        const siteStats = await sitesCollection.aggregate([
            { $match: { ownerId: new ObjectId(userId), status: { $ne: 'deleted' } } },
            { $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalStorage: { $sum: '$quotaUsed' }
            }}
        ]).toArray();
        
        const stats = {
            totalSites: 0,
            activeSites: 0,
            pendingSites: 0,
            suspendedSites: 0,
            totalStorage: 0
        };
        
        siteStats.forEach(stat => {
            stats.totalSites += stat.count;
            stats.totalStorage += stat.totalStorage || 0;
            
            if (stat._id === 'active') stats.activeSites = stat.count;
            if (stat._id === 'pending') stats.pendingSites = stat.count;
            if (stat._id === 'suspended') stats.suspendedSites = stat.count;
        });
        
        // Get analytics hits for last 30 days
        const analyticsCollection = await db.getCollection('analytics');
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        const analyticsStats = await analyticsCollection.aggregate([
            { $match: { 
                siteId: { $in: (await sitesCollection.find({ ownerId: new ObjectId(userId) }).toArray()).map(s => s._id.toString()) },
                ts: { $gte: thirtyDaysAgo }
            }},
            { $group: {
                _id: null,
                totalHits: { $sum: 1 },
                uniqueVisitors: { $addToSet: '$ipHash' }
            }},
            { $project: {
                totalHits: 1,
                uniqueVisitors: { $size: '$uniqueVisitors' }
            }}
        ]).toArray();
        
        stats.totalHits = analyticsStats[0]?.totalHits || 0;
        stats.uniqueVisitors = analyticsStats[0]?.uniqueVisitors || 0;
        
        return {
            ...user.quota,
            ...stats,
            storagePercent: user.quota.maxStorage > 0 ? 
                Math.min(100, (stats.totalStorage / user.quota.maxStorage) * 100) : 0,
            sitesPercent: user.quota.maxSites > 0 ? 
                Math.min(100, (stats.totalSites / user.quota.maxSites) * 100) : 0,
            daysSinceJoin: Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)),
            lastLoginDays: user.lastLogin ? 
                Math.floor((Date.now() - user.lastLogin) / (1000 * 60 * 60 * 24)) : null
        };
    }
    
    // Search users
    static async search(query, page = 1, limit = 20) {
        const collection = await db.getCollection('users');
        const skip = (page - 1) * limit;
        
        const filter = {
            status: { $ne: 'deleted' }
        };
        
        if (query) {
            filter.$or = [
                { email: { $regex: query, $options: 'i' } },
                { name: { $regex: query, $options: 'i' } }
            ];
        }
        
        const [users, total] = await Promise.all([
            collection.find(filter, {
                projection: {
                    passwordHash: 0,
                    googleId: 0,
                    settings: 0,
                    resetPasswordToken: 0,
                    resetPasswordExpires: 0,
                    verificationToken: 0,
                    verificationExpires: 0
                },
                skip,
                limit,
                sort: { createdAt: -1 }
            }).toArray(),
            collection.countDocuments(filter)
        ]);
        
        return {
            users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }
    
    // Count users
    static async count(filter = {}) {
        const collection = await db.getCollection('users');
        return collection.countDocuments(filter);
    }
    
    // Get all admins
    static async getAdmins() {
        const collection = await db.getCollection('users');
        return collection.find(
            { roles: 'admin', status: 'active' },
            {
                projection: {
                    _id: 1,
                    email: 1,
                    name: 1
                }
            }
        ).toArray();
    }
}

module.exports = User;