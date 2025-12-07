const { ObjectId } = require('mongodb');
const db = require('./db');
const emailService = require('./email');

class AdminService {
    // Get platform statistics
    async getPlatformStats() {
        try {
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            
            // Get counts using aggregation for performance
            const stats = await db.getCollection('users').aggregate([
                {
                    $facet: {
                        // User statistics
                        userStats: [
                            {
                                $group: {
                                    _id: null,
                                    totalUsers: { $sum: 1 },
                                    verifiedUsers: { $sum: { $cond: [{ $eq: ['$emailVerified', true] }, 1, 0] } },
                                    googleUsers: { $sum: { $cond: [{ $ifNull: ['$googleId', false] }, 1, 0] } },
                                    newUsersToday: {
                                        $sum: {
                                            $cond: [
                                                { $gte: ['$createdAt', oneDayAgo] },
                                                1,
                                                0
                                            ]
                                        }
                                    }
                                }
                            }
                        ],
                        
                        // Site statistics
                        siteStats: [
                            { $lookup: {
                                from: 'sites',
                                localField: '_id',
                                foreignField: 'ownerId',
                                as: 'userSites'
                            }},
                            { $unwind: { path: '$userSites', preserveNullAndEmptyArrays: true } },
                            { $match: { 'userSites.status': { $ne: 'deleted' } } },
                            {
                                $group: {
                                    _id: null,
                                    totalSites: { $sum: 1 },
                                    activeSites: { $sum: { $cond: [{ $eq: ['$userSites.status', 'active'] }, 1, 0] } },
                                    pendingSites: { $sum: { $cond: [{ $eq: ['$userSites.status', 'pending'] }, 1, 0] } },
                                    suspendedSites: { $sum: { $cond: [{ $eq: ['$userSites.status', 'suspended'] }, 1, 0] } },
                                    totalStorage: { $sum: { $ifNull: ['$userSites.quotaUsed', 0] } },
                                    newSitesToday: {
                                        $sum: {
                                            $cond: [
                                                { $gte: ['$userSites.createdAt', oneDayAgo] },
                                                1,
                                                0
                                            ]
                                        }
                                    }
                                }
                            }
                        ],
                        
                        // Active users (logged in last 30 days)
                        activeUsers: [
                            { $match: { lastLogin: { $gte: thirtyDaysAgo } } },
                            { $count: 'count' }
                        ]
                    }
                }
            ]).toArray();
            
            // Get analytics hits for last 30 days
            const analyticsStats = await db.getCollection('analytics').aggregate([
                { $match: { ts: { $gte: thirtyDaysAgo } } },
                {
                    $group: {
                        _id: null,
                        totalHits: { $sum: 1 },
                        uniqueVisitors: { $addToSet: '$ipHash' }
                    }
                },
                {
                    $project: {
                        totalHits: 1,
                        uniqueVisitors: { $size: '$uniqueVisitors' }
                    }
                }
            ]).toArray();
            
            const userStats = stats[0]?.userStats[0] || {
                totalUsers: 0,
                verifiedUsers: 0,
                googleUsers: 0,
                newUsersToday: 0
            };
            
            const siteStats = stats[0]?.siteStats[0] || {
                totalSites: 0,
                activeSites: 0,
                pendingSites: 0,
                suspendedSites: 0,
                totalStorage: 0,
                newSitesToday: 0
            };
            
            const activeUsersCount = stats[0]?.activeUsers[0]?.count || 0;
            const analytics = analyticsStats[0] || { totalHits: 0, uniqueVisitors: 0 };
            
            return {
                users: {
                    total: userStats.totalUsers,
                    verified: userStats.verifiedUsers,
                    google: userStats.googleUsers,
                    active: activeUsersCount,
                    newToday: userStats.newUsersToday,
                    verificationRate: userStats.totalUsers > 0 ? (userStats.verifiedUsers / userStats.totalUsers * 100).toFixed(1) : 0
                },
                sites: {
                    total: siteStats.totalSites,
                    active: siteStats.activeSites,
                    pending: siteStats.pendingSites,
                    suspended: siteStats.suspendedSites,
                    newToday: siteStats.newSitesToday,
                    activationRate: siteStats.totalSites > 0 ? (siteStats.activeSites / siteStats.totalSites * 100).toFixed(1) : 0
                },
                storage: {
                    total: siteStats.totalStorage,
                    formatted: this.formatBytes(siteStats.totalStorage)
                },
                analytics: {
                    totalHits: analytics.totalHits,
                    uniqueVisitors: analytics.uniqueVisitors,
                    hitsPerVisitor: analytics.uniqueVisitors > 0 ? (analytics.totalHits / analytics.uniqueVisitors).toFixed(1) : 0
                },
                timestamp: now
            };
            
        } catch (error) {
            console.error('Error getting platform stats:', error);
            throw error;
        }
    }
    
    // Get all users with pagination
    async getUsers(page = 1, limit = 20, search = '') {
        try {
            const skip = (page - 1) * limit;
            
            const matchStage = {};
            if (search) {
                matchStage.$or = [
                    { email: { $regex: search, $options: 'i' } },
                    { name: { $regex: search, $options: 'i' } }
                ];
            }
            
            const pipeline = [
                { $match: matchStage },
                { $sort: { createdAt: -1 } },
                {
                    $facet: {
                        users: [
                            { $skip: skip },
                            { $limit: limit },
                            {
                                $lookup: {
                                    from: 'sites',
                                    localField: '_id',
                                    foreignField: 'ownerId',
                                    as: 'sites'
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    email: 1,
                                    name: 1,
                                    roles: 1,
                                    emailVerified: 1,
                                    createdAt: 1,
                                    lastLogin: 1,
                                    googleId: 1,
                                    picture: 1,
                                    'quota.maxSites': 1,
                                    'quota.usedSites': 1,
                                    'quota.maxStorage': 1,
                                    'quota.usedStorage': 1,
                                    siteCount: { $size: '$sites' },
                                    activeSites: {
                                        $size: {
                                            $filter: {
                                                input: '$sites',
                                                as: 'site',
                                                cond: { $eq: ['$$site.status', 'active'] }
                                            }
                                        }
                                    }
                                }
                            }
                        ],
                        total: [
                            { $count: 'count' }
                        ]
                    }
                }
            ];
            
            const result = await db.getCollection('users').aggregate(pipeline).toArray();
            
            return {
                users: result[0]?.users || [],
                total: result[0]?.total[0]?.count || 0,
                page,
                limit,
                totalPages: Math.ceil((result[0]?.total[0]?.count || 0) / limit)
            };
            
        } catch (error) {
            console.error('Error getting users:', error);
            throw error;
        }
    }
    
    // Get all sites with pagination
    async getSites(page = 1, limit = 20, filters = {}) {
        try {
            const skip = (page - 1) * limit;
            
            const matchStage = { status: { $ne: 'deleted' } };
            
            // Apply filters
            if (filters.status) {
                matchStage.status = filters.status;
            }
            
            if (filters.search) {
                matchStage.$or = [
                    { name: { $regex: filters.search, $options: 'i' } },
                    { slug: { $regex: filters.search, $options: 'i' } }
                ];
            }
            
            if (filters.userId) {
                matchStage.ownerId = new ObjectId(filters.userId);
            }
            
            const pipeline = [
                { $match: matchStage },
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'ownerId',
                        foreignField: '_id',
                        as: 'owner'
                    }
                },
                { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
                {
                    $facet: {
                        sites: [
                            { $skip: skip },
                            { $limit: limit },
                            {
                                $project: {
                                    _id: 1,
                                    name: 1,
                                    slug: 1,
                                    status: 1,
                                    publicUrl: 1,
                                    quotaUsed: 1,
                                    createdAt: 1,
                                    updatedAt: 1,
                                    lastDeployed: 1,
                                    'owner._id': 1,
                                    'owner.email': 1,
                                    'owner.name': 1,
                                    analytics: 1
                                }
                            }
                        ],
                        total: [
                            { $count: 'count' }
                        ]
                    }
                }
            ];
            
            const result = await db.getCollection('sites').aggregate(pipeline).toArray();
            
            return {
                sites: result[0]?.sites || [],
                total: result[0]?.total[0]?.count || 0,
                page,
                limit,
                totalPages: Math.ceil((result[0]?.total[0]?.count || 0) / limit)
            };
            
        } catch (error) {
            console.error('Error getting sites:', error);
            throw error;
        }
    }
    
    // Get user by ID
    async getUserById(userId) {
        try {
            const user = await db.getCollection('users').findOne(
                { _id: new ObjectId(userId) },
                {
                    projection: {
                        passwordHash: 0,
                        'settings.twoFactorSecret': 0
                    }
                }
            );
            
            if (!user) {
                throw new Error('User not found');
            }
            
            // Get user's sites
            const sites = await db.getCollection('sites').find(
                { ownerId: user._id, status: { $ne: 'deleted' } }
            ).toArray();
            
            // Get user's storage usage
            const storageStats = await db.getCollection('sites').aggregate([
                { $match: { ownerId: user._id, status: { $ne: 'deleted' } } },
                { $group: {
                    _id: null,
                    totalStorage: { $sum: '$quotaUsed' },
                    totalSites: { $sum: 1 },
                    activeSites: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } }
                }}
            ]).toArray();
            
            const stats = storageStats[0] || {
                totalStorage: 0,
                totalSites: 0,
                activeSites: 0
            };
            
            return {
                user,
                sites,
                stats: {
                    storage: {
                        used: stats.totalStorage,
                        max: user.quota.maxStorage,
                        percent: user.quota.maxStorage > 0 ? (stats.totalStorage / user.quota.maxStorage * 100).toFixed(1) : 0
                    },
                    sites: {
                        used: stats.totalSites,
                        active: stats.activeSites,
                        max: user.quota.maxSites,
                        percent: user.quota.maxSites > 0 ? (stats.totalSites / user.quota.maxSites * 100).toFixed(1) : 0
                    }
                }
            };
            
        } catch (error) {
            console.error('Error getting user by ID:', error);
            throw error;
        }
    }
    
    // Update user
    async updateUser(userId, updates) {
        try {
            const allowedUpdates = [
                'name',
                'roles',
                'emailVerified',
                'quota.maxSites',
                'quota.maxStorage',
                'settings.emailNotifications',
                'settings.twoFactorEnabled'
            ];
            
            // Filter updates to only allowed fields
            const filteredUpdates = {};
            for (const key of allowedUpdates) {
                if (updates[key] !== undefined) {
                    // Handle nested quota updates
                    if (key.startsWith('quota.')) {
                        if (!filteredUpdates.quota) filteredUpdates.quota = {};
                        const quotaKey = key.split('.')[1];
                        filteredUpdates.quota[quotaKey] = parseInt(updates[key]) || 0;
                    }
                    // Handle nested settings updates
                    else if (key.startsWith('settings.')) {
                        if (!filteredUpdates.settings) filteredUpdates.settings = {};
                        const settingsKey = key.split('.')[1];
                        filteredUpdates.settings[settingsKey] = updates[key];
                    }
                    else {
                        filteredUpdates[key] = updates[key];
                    }
                }
            }
            
            if (Object.keys(filteredUpdates).length === 0) {
                throw new Error('No valid updates provided');
            }
            
            const result = await db.getCollection('users').updateOne(
                { _id: new ObjectId(userId) },
                { $set: filteredUpdates }
            );
            
            if (result.modifiedCount === 0) {
                throw new Error('User not found or no changes made');
            }
            
            // Log admin action
            await this.logAdminAction(
                'update_user',
                userId,
                { updates: filteredUpdates }
            );
            
            return { success: true, message: 'User updated successfully' };
            
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }
    
    // Update site
    async updateSite(siteId, updates) {
        try {
            const allowedUpdates = [
                'name',
                'status',
                'slug',
                'analytics.enabled',
                'analytics.excludeAdmin',
                'settings.customDomain'
            ];
            
            // Filter updates to only allowed fields
            const filteredUpdates = {};
            for (const key of allowedUpdates) {
                if (updates[key] !== undefined) {
                    // Handle nested updates
                    if (key.includes('.')) {
                        const parts = key.split('.');
                        let current = filteredUpdates;
                        for (let i = 0; i < parts.length - 1; i++) {
                            if (!current[parts[i]]) current[parts[i]] = {};
                            current = current[parts[i]];
                        }
                        current[parts[parts.length - 1]] = updates[key];
                    } else {
                        filteredUpdates[key] = updates[key];
                    }
                }
            }
            
            filteredUpdates.updatedAt = new Date();
            
            if (Object.keys(filteredUpdates).length === 0) {
                throw new Error('No valid updates provided');
            }
            
            const result = await db.getCollection('sites').updateOne(
                { _id: new ObjectId(siteId) },
                { $set: filteredUpdates }
            );
            
            if (result.modifiedCount === 0) {
                throw new Error('Site not found or no changes made');
            }
            
            // Log admin action
            await this.logAdminAction(
                'update_site',
                siteId,
                { updates: filteredUpdates }
            );
            
            return { success: true, message: 'Site updated successfully' };
            
        } catch (error) {
            console.error('Error updating site:', error);
            throw error;
        }
    }
    
    // Suspend user
    async suspendUser(userId, reason = '') {
        return db.withTransaction(async (session) => {
            try {
                // Update user status
                const userResult = await db.getCollection('users').updateOne(
                    { _id: new ObjectId(userId) },
                    { $set: { status: 'suspended', suspendedAt: new Date(), suspensionReason: reason } },
                    { session }
                );
                
                if (userResult.modifiedCount === 0) {
                    throw new Error('User not found');
                }
                
                // Suspend all user's sites
                await db.getCollection('sites').updateMany(
                    { ownerId: new ObjectId(userId), status: 'active' },
                    { $set: { status: 'suspended', suspendedAt: new Date() } },
                    { session }
                );
                
                // Log admin action
                await this.logAdminAction(
                    'suspend_user',
                    userId,
                    { reason }
                );
                
                return { success: true, message: 'User and all sites suspended' };
                
            } catch (error) {
                console.error('Error suspending user:', error);
                throw error;
            }
        });
    }
    
    // Activate user
    async activateUser(userId) {
        try {
            const result = await db.getCollection('users').updateOne(
                { _id: new ObjectId(userId) },
                { $set: { status: 'active', suspendedAt: null, suspensionReason: '' } }
            );
            
            if (result.modifiedCount === 0) {
                throw new Error('User not found');
            }
            
            // Log admin action
            await this.logAdminAction(
                'activate_user',
                userId,
                {}
            );
            
            return { success: true, message: 'User activated' };
            
        } catch (error) {
            console.error('Error activating user:', error);
            throw error;
        }
    }
    
    // Delete user (soft delete)
    async deleteUser(userId) {
        return db.withTransaction(async (session) => {
            try {
                // Soft delete user
                const userResult = await db.getCollection('users').updateOne(
                    { _id: new ObjectId(userId) },
                    { 
                        $set: { 
                            status: 'deleted',
                            deletedAt: new Date(),
                            email: `deleted_${Date.now()}_${userId}@deleted.com`,
                            name: 'Deleted User'
                        }
                    },
                    { session }
                );
                
                if (userResult.modifiedCount === 0) {
                    throw new Error('User not found');
                }
                
                // Soft delete all user's sites
                await db.getCollection('sites').updateMany(
                    { ownerId: new ObjectId(userId) },
                    { $set: { status: 'deleted', deletedAt: new Date() } },
                    { session }
                );
                
                // Log admin action
                await this.logAdminAction(
                    'delete_user',
                    userId,
                    {}
                );
                
                return { success: true, message: 'User deleted' };
                
            } catch (error) {
                console.error('Error deleting user:', error);
                throw error;
            }
        });
    }
    
    // Get admin audit logs
    async getAuditLogs(page = 1, limit = 50, filters = {}) {
        try {
            const skip = (page - 1) * limit;
            
            const matchStage = {};
            
            if (filters.adminId) {
                matchStage.adminId = new ObjectId(filters.adminId);
            }
            
            if (filters.action) {
                matchStage.action = filters.action;
            }
            
            if (filters.startDate || filters.endDate) {
                matchStage.ts = {};
                if (filters.startDate) {
                    matchStage.ts.$gte = new Date(filters.startDate);
                }
                if (filters.endDate) {
                    matchStage.ts.$lte = new Date(filters.endDate);
                }
            }
            
            const pipeline = [
                { $match: matchStage },
                { $sort: { ts: -1 } },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'adminId',
                        foreignField: '_id',
                        as: 'admin'
                    }
                },
                { $unwind: { path: '$admin', preserveNullAndEmptyArrays: true } },
                {
                    $facet: {
                        logs: [
                            { $skip: skip },
                            { $limit: limit },
                            {
                                $project: {
                                    _id: 1,
                                    action: 1,
                                    targetId: 1,
                                    details: 1,
                                    ts: 1,
                                    ip: 1,
                                    userAgent: 1,
                                    'admin._id': 1,
                                    'admin.email': 1,
                                    'admin.name': 1
                                }
                            }
                        ],
                        total: [
                            { $count: 'count' }
                        ]
                    }
                }
            ];
            
            const result = await db.getCollection('admin_audit').aggregate(pipeline).toArray();
            
            return {
                logs: result[0]?.logs || [],
                total: result[0]?.total[0]?.count || 0,
                page,
                limit,
                totalPages: Math.ceil((result[0]?.total[0]?.count || 0) / limit)
            };
            
        } catch (error) {
            console.error('Error getting audit logs:', error);
            throw error;
        }
    }
    
    // Log admin action
    async logAdminAction(action, targetId, details = {}, req = null) {
        try {
            const logEntry = {
                action,
                targetId: targetId.toString(),
                details,
                ts: new Date(),
                ip: req?.ip || req?.headers['x-forwarded-for'] || 'unknown',
                userAgent: req?.headers['user-agent'] || 'unknown'
            };
            
            // If we have an admin user from request
            if (req?.user?._id) {
                logEntry.adminId = new ObjectId(req.user._id);
            }
            
            await db.getCollection('admin_audit').insertOne(logEntry);
            
        } catch (error) {
            console.error('Error logging admin action:', error);
            // Don't throw - audit logging shouldn't break main functionality
        }
    }
    
    // Get system health
    async getSystemHealth() {
        try {
            const [dbHealth, s3Health, emailHealth] = await Promise.allSettled([
                db.healthCheck(),
                this.checkS3Health(),
                this.checkEmailHealth()
            ]);
            
            return {
                database: dbHealth.status === 'fulfilled' ? dbHealth.value : { status: 'error', error: dbHealth.reason?.message },
                storage: s3Health.status === 'fulfilled' ? s3Health.value : { status: 'error', error: s3Health.reason?.message },
                email: emailHealth.status === 'fulfilled' ? emailHealth.value : { status: 'error', error: emailHealth.reason?.message },
                timestamp: new Date()
            };
            
        } catch (error) {
            console.error('Error getting system health:', error);
            throw error;
        }
    }
    
    // Check S3 health
    async checkS3Health() {
        // This would require S3 service - simplified version
        return { status: 'healthy', message: 'S3 check not implemented' };
    }
    
    // Check email health
    async checkEmailHealth() {
        try {
            // Try to send a test email
            await emailService.testEmailConfig();
            return { status: 'healthy', message: 'Email service is working' };
        } catch (error) {
            return { status: 'unhealthy', error: error.message };
        }
    }
    
    // Format bytes
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    
    // Impersonate user (get user token for admin)
    async impersonateUser(userId, adminId) {
        try {
            const user = await db.getCollection('users').findOne(
                { _id: new ObjectId(userId) }
            );
            
            if (!user) {
                throw new Error('User not found');
            }
            
            // Generate token for the user
            const AuthService = require('./auth');
            const token = AuthService.generateToken(user);
            
            // Log impersonation
            await this.logAdminAction(
                'impersonate_user',
                userId,
                { adminId: adminId.toString() }
            );
            
            return {
                success: true,
                token,
                user: {
                    _id: user._id,
                    email: user.email,
                    name: user.name,
                    roles: user.roles
                }
            };
            
        } catch (error) {
            console.error('Error impersonating user:', error);
            throw error;
        }
    }
}

// Singleton instance
const adminService = new AdminService();

module.exports = adminService;