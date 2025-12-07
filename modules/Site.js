const { ObjectId } = require('mongodb');
const db = require('../lib/db');
const validation = require('../lib/validation');

class Site {
    // Create new site
    static async create(siteData) {
        const collection = await db.getCollection('sites');
        
        // Generate slug if not provided
        let slug = siteData.slug || validation.generateSlug(siteData.name);
        
        // Ensure slug is unique
        let counter = 1;
        let originalSlug = slug;
        while (await collection.findOne({ slug })) {
            slug = `${originalSlug}-${counter}`;
            counter++;
        }
        
        const site = {
            ownerId: new ObjectId(siteData.ownerId),
            name: siteData.name,
            slug,
            description: siteData.description || '',
            
            // Storage
            storagePath: siteData.storagePath || `sites/${new ObjectId()}`,
            publicUrl: siteData.publicUrl || '',
            customDomain: siteData.customDomain || null,
            domainVerified: siteData.domainVerified || false,
            
            // Status
            status: siteData.status || 'pending',
            lastError: siteData.lastError || null,
            errorCount: siteData.errorCount || 0,
            
            // Deployment
            deploymentType: siteData.deploymentType || 'zip', // zip, git, manual
            gitUrl: siteData.gitUrl || null,
            gitBranch: siteData.gitBranch || 'main',
            lastDeployed: siteData.lastDeployed || null,
            deploymentCount: siteData.deploymentCount || 0,
            
            // Quota
            quotaUsed: siteData.quotaUsed || 0,
            fileCount: siteData.fileCount || 0,
            lastFileUpload: siteData.lastFileUpload || null,
            
            // Analytics
            analytics: {
                enabled: siteData.analytics?.enabled !== false,
                excludeAdmin: siteData.analytics?.excludeAdmin || false,
                lastHit: siteData.analytics?.lastHit || null,
                totalHits: siteData.analytics?.totalHits || 0,
                uniqueVisitors: siteData.analytics?.uniqueVisitors || 0
            },
            
            // Settings
            settings: {
                autoDeploy: siteData.settings?.autoDeploy || false,
                notifyOnDeploy: siteData.settings?.notifyOnDeploy || true,
                passwordProtected: siteData.settings?.passwordProtected || false,
                passwordHash: siteData.settings?.passwordHash || null,
                corsEnabled: siteData.settings?.corsEnabled || true,
                cacheControl: siteData.settings?.cacheControl || 'public, max-age=31536000',
                headers: siteData.settings?.headers || {},
                redirects: siteData.settings?.redirects || [],
                rewrites: siteData.settings?.rewrites || []
            },
            
            // Security
            security: {
                sslEnabled: siteData.security?.sslEnabled || true,
                httpsRedirect: siteData.security?.httpsRedirect || true,
                allowedIps: siteData.security?.allowedIps || [],
                blockedIps: siteData.security?.blockedIps || [],
                rateLimit: siteData.security?.rateLimit || 1000
            },
            
            // Timestamps
            createdAt: siteData.createdAt || new Date(),
            updatedAt: siteData.updatedAt || new Date(),
            suspendedAt: siteData.suspendedAt || null,
            deletedAt: siteData.deletedAt || null,
            
            // Versioning
            version: siteData.version || 1,
            previousVersion: siteData.previousVersion || null,
            rollbackEnabled: siteData.rollbackEnabled || false
        };
        
        const result = await collection.insertOne(site);
        site._id = result.insertedId;
        
        // Update user's site count
        const usersCollection = await db.getCollection('users');
        await usersCollection.updateOne(
            { _id: site.ownerId },
            { $inc: { 'quota.usedSites': 1 } }
        );
        
        return site;
    }
    
    // Find site by ID
    static async findById(siteId, options = {}) {
        const collection = await db.getCollection('sites');
        
        const pipeline = [
            { $match: { _id: new ObjectId(siteId), status: { $ne: 'deleted' } } }
        ];
        
        if (options.populateOwner) {
            pipeline.push(
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
                    $addFields: {
                        'owner': {
                            $cond: {
                                if: { $eq: ['$owner', null] },
                                then: null,
                                else: {
                                    _id: '$owner._id',
                                    email: '$owner.email',
                                    name: '$owner.name',
                                    picture: '$owner.picture'
                                }
                            }
                        }
                    }
                }
            );
        }
        
        if (options.includeUploads) {
            pipeline.push(
                {
                    $lookup: {
                        from: 'uploads',
                        localField: '_id',
                        foreignField: 'siteId',
                        as: 'uploads'
                    }
                }
            );
        }
        
        const sites = await collection.aggregate(pipeline).toArray();
        return sites[0] || null;
    }
    
    // Find site by slug
    static async findBySlug(slug, ownerId = null) {
        const collection = await db.getCollection('sites');
        
        const filter = { slug, status: { $ne: 'deleted' } };
        if (ownerId) {
            filter.ownerId = new ObjectId(ownerId);
        }
        
        return collection.findOne(filter);
    }
    
    // Find sites by owner
    static async findByOwner(ownerId, options = {}) {
        const collection = await db.getCollection('sites');
        
        const filter = { 
            ownerId: new ObjectId(ownerId),
            status: { $ne: 'deleted' }
        };
        
        if (options.status) {
            filter.status = options.status;
        }
        
        const sort = options.sort || { createdAt: -1 };
        const limit = options.limit || 100;
        const skip = options.skip || 0;
        
        return collection.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .toArray();
    }
    
    // Update site
    static async update(siteId, updates) {
        const collection = await db.getCollection('sites');
        
        const updateData = {
            ...updates,
            updatedAt: new Date()
        };
        
        const result = await collection.updateOne(
            { _id: new ObjectId(siteId) },
            { $set: updateData }
        );
        
        return result.modifiedCount > 0;
    }
    
    // Update quota usage
    static async updateQuota(siteId, fileSize, fileCount = 1) {
        const collection = await db.getCollection('sites');
        
        const result = await collection.updateOne(
            { _id: new ObjectId(siteId) },
            {
                $inc: {
                    quotaUsed: fileSize,
                    fileCount: fileCount
                },
                $set: {
                    lastFileUpload: new Date(),
                    updatedAt: new Date()
                }
            }
        );
        
        if (result.modifiedCount > 0) {
            // Update owner's total storage
            const site = await collection.findOne({ _id: new ObjectId(siteId) });
            if (site) {
                const usersCollection = await db.getCollection('users');
                await usersCollection.updateOne(
                    { _id: site.ownerId },
                    { $inc: { 'quota.usedStorage': fileSize } }
                );
            }
        }
        
        return result.modifiedCount > 0;
    }
    
    // Update analytics stats
    static async updateAnalytics(siteId, hits = 0, uniqueVisitors = 0) {
        const collection = await db.getCollection('sites');
        
        const updateData = {
            'analytics.lastHit': new Date(),
            updatedAt: new Date()
        };
        
        if (hits > 0) {
            updateData.$inc = {
                'analytics.totalHits': hits,
                'analytics.uniqueVisitors': uniqueVisitors
            };
        }
        
        const result = await collection.updateOne(
            { _id: new ObjectId(siteId) },
            updateData
        );
        
        return result.modifiedCount > 0;
    }
    
    // Activate site
    static async activate(siteId) {
        const collection = await db.getCollection('sites');
        
        const result = await collection.updateOne(
            { _id: new ObjectId(siteId) },
            {
                $set: {
                    status: 'active',
                    lastDeployed: new Date(),
                    $inc: { deploymentCount: 1 },
                    updatedAt: new Date(),
                    suspendedAt: null
                }
            }
        );
        
        return result.modifiedCount > 0;
    }
    
    // Deactivate site
    static async deactivate(siteId) {
        const collection = await db.getCollection('sites');
        
        const result = await collection.updateOne(
            { _id: new ObjectId(siteId) },
            {
                $set: {
                    status: 'inactive',
                    updatedAt: new Date()
                }
            }
        );
        
        return result.modifiedCount > 0;
    }
    
    // Suspend site
    static async suspend(siteId, reason = '') {
        const collection = await db.getCollection('sites');
        
        const result = await collection.updateOne(
            { _id: new ObjectId(siteId) },
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
    
    // Delete site (soft delete)
    static async delete(siteId) {
        const collection = await db.getCollection('sites');
        
        const result = await collection.updateOne(
            { _id: new ObjectId(siteId) },
            {
                $set: {
                    status: 'deleted',
                    deletedAt: new Date(),
                    updatedAt: new Date()
                }
            }
        );
        
        if (result.modifiedCount > 0) {
            // Update user's site count
            const site = await collection.findOne({ _id: new ObjectId(siteId) });
            if (site) {
                const usersCollection = await db.getCollection('users');
                await usersCollection.updateOne(
                    { _id: site.ownerId },
                    { $inc: { 'quota.usedSites': -1, 'quota.usedStorage': -site.quotaUsed } }
                );
            }
        }
        
        return result.modifiedCount > 0;
    }
    
    // Check if site is active
    static async isActive(siteId) {
        const site = await this.findById(siteId);
        return site && site.status === 'active';
    }
    
    // Get site statistics
    static async getStats(siteId) {
        const collection = await db.getCollection('sites');
        
        const site = await collection.findOne(
            { _id: new ObjectId(siteId) },
            {
                projection: {
                    quotaUsed: 1,
                    fileCount: 1,
                    deploymentCount: 1,
                    createdAt: 1,
                    lastDeployed: 1,
                    analytics: 1
                }
            }
        );
        
        if (!site) {
            return null;
        }
        
        // Get uploads statistics
        const uploadsCollection = await db.getCollection('uploads');
        const uploadStats = await uploadsCollection.aggregate([
            { $match: { siteId: siteId.toString() } },
            { $group: {
                _id: null,
                totalUploads: { $sum: 1 },
                totalSize: { $sum: '$size' },
                lastUpload: { $max: '$uploadedAt' }
            }}
        ]).toArray();
        
        // Get analytics for last 30 days
        const analyticsCollection = await db.getCollection('analytics');
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        const analyticsStats = await analyticsCollection.aggregate([
            { $match: { siteId: siteId.toString(), ts: { $gte: thirtyDaysAgo } } },
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
        
        return {
            storage: {
                used: site.quotaUsed,
                files: site.fileCount,
                uploads: uploadStats[0]?.totalUploads || 0,
                lastUpload: uploadStats[0]?.lastUpload || null
            },
            deployments: {
                count: site.deploymentCount,
                last: site.lastDeployed,
                daysSinceDeploy: site.lastDeployed ? 
                    Math.floor((Date.now() - site.lastDeployed) / (1000 * 60 * 60 * 24)) : null
            },
            analytics: {
                totalHits: analyticsStats[0]?.totalHits || 0,
                uniqueVisitors: analyticsStats[0]?.uniqueVisitors || 0,
                hitsPerVisitor: analyticsStats[0]?.uniqueVisitors > 0 ? 
                    (analyticsStats[0].totalHits / analyticsStats[0].uniqueVisitors).toFixed(1) : 0
            },
            age: {
                createdAt: site.createdAt,
                daysActive: Math.floor((Date.now() - site.createdAt) / (1000 * 60 * 60 * 24))
            }
        };
    }
    
    // Search sites
    static async search(query, page = 1, limit = 20, filters = {}) {
        const collection = await db.getCollection('sites');
        const skip = (page - 1) * limit;
        
        const filter = {
            status: { $ne: 'deleted' }
        };
        
        if (query) {
            filter.$or = [
                { name: { $regex: query, $options: 'i' } },
                { slug: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ];
        }
        
        if (filters.ownerId) {
            filter.ownerId = new ObjectId(filters.ownerId);
        }
        
        if (filters.status) {
            filter.status = filters.status;
        }
        
        const pipeline = [
            { $match: filter },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
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
                $project: {
                    _id: 1,
                    name: 1,
                    slug: 1,
                    status: 1,
                    publicUrl: 1,
                    quotaUsed: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    'owner._id': 1,
                    'owner.email': 1,
                    'owner.name': 1
                }
            }
        ];
        
        const [sites, total] = await Promise.all([
            collection.aggregate(pipeline).toArray(),
            collection.countDocuments(filter)
        ]);
        
        return {
            sites,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }
    
    // Count sites
    static async count(filter = {}) {
        const collection = await db.getCollection('sites');
        return collection.countDocuments({ ...filter, status: { $ne: 'deleted' } });
    }
    
    // Get sites needing cleanup (deleted more than 30 days ago)
    static async getSitesForCleanup(days = 30) {
        const collection = await db.getCollection('sites');
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        return collection.find({
            status: 'deleted',
            deletedAt: { $lt: cutoffDate }
        }).toArray();
    }
    
    // Get active sites for CDN invalidation
    static async getActiveSites() {
        const collection = await db.getCollection('sites');
        return collection.find({
            status: 'active',
            publicUrl: { $ne: '' }
        }, {
            projection: {
                _id: 1,
                slug: 1,
                publicUrl: 1,
                storagePath: 1
            }
        }).toArray();
    }
    
    // Validate site data
    static validate(siteData) {
        const errors = [];
        
        if (!siteData.name || siteData.name.trim().length < 2) {
            errors.push('Site name must be at least 2 characters long');
        }
        
        if (siteData.name.length > 100) {
            errors.push('Site name cannot exceed 100 characters');
        }
        
        if (siteData.description && siteData.description.length > 500) {
            errors.push('Description cannot exceed 500 characters');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}

module.exports = Site;