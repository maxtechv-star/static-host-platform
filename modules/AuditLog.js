const { ObjectId } = require('mongodb');
const db = require('../lib/db');

class AuditLog {
    // Create audit log entry
    static async create(logData) {
        const collection = await db.getCollection('admin_audit');
        
        const log = {
            adminId: logData.adminId ? new ObjectId(logData.adminId) : null,
            userId: logData.userId ? new ObjectId(logData.userId) : null,
            siteId: logData.siteId ? new ObjectId(logData.siteId) : null,
            
            // Action details
            action: logData.action, // create, update, delete, suspend, activate, etc.
            resource: logData.resource || 'user', // user, site, upload, system
            resourceId: logData.resourceId || null,
            
            // Changes
            before: logData.before || null,
            after: logData.after || null,
            changes: logData.changes || {},
            
            // Context
            ip: logData.ip || 'unknown',
            userAgent: logData.userAgent || 'unknown',
            location: logData.location || null,
            
            // Status
            status: logData.status || 'success', // success, failed
            error: logData.error || null,
            
            // Metadata
            metadata: logData.metadata || {},
            
            // Timestamps
            createdAt: logData.createdAt || new Date(),
            updatedAt: logData.updatedAt || new Date()
        };
        
        const result = await collection.insertOne(log);
        log._id = result.insertedId;
        
        return log;
    }
    
    // Log user action
    static async logUserAction(adminId, action, userId, changes = {}, metadata = {}) {
        return this.create({
            adminId,
            userId,
            action,
            resource: 'user',
            resourceId: userId,
            changes,
            metadata,
            ip: metadata.ip,
            userAgent: metadata.userAgent
        });
    }
    
    // Log site action
    static async logSiteAction(adminId, action, siteId, changes = {}, metadata = {}) {
        return this.create({
            adminId,
            siteId,
            action,
            resource: 'site',
            resourceId: siteId,
            changes,
            metadata,
            ip: metadata.ip,
            userAgent: metadata.userAgent
        });
    }
    
    // Log system action
    static async logSystemAction(adminId, action, changes = {}, metadata = {}) {
        return this.create({
            adminId,
            action,
            resource: 'system',
            changes,
            metadata,
            ip: metadata.ip,
            userAgent: metadata.userAgent
        });
    }
    
    // Get audit logs
    static async getLogs(filters = {}, options = {}) {
        const collection = await db.getCollection('admin_audit');
        
        const filter = {};
        
        if (filters.adminId) {
            filter.adminId = new ObjectId(filters.adminId);
        }
        
        if (filters.userId) {
            filter.userId = new ObjectId(filters.userId);
        }
        
        if (filters.siteId) {
            filter.siteId = new ObjectId(filters.siteId);
        }
        
        if (filters.resource) {
            filter.resource = filters.resource;
        }
        
        if (filters.action) {
            filter.action = filters.action;
        }
        
        if (filters.status) {
            filter.status = filters.status;
        }
        
        if (filters.startDate || filters.endDate) {
            filter.createdAt = {};
            if (filters.startDate) {
                filter.createdAt.$gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                filter.createdAt.$lte = new Date(filters.endDate);
            }
        }
        
        const sort = options.sort || { createdAt: -1 };
        const limit = options.limit || 50;
        const skip = options.skip || 0;
        
        const pipeline = [
            { $match: filter },
            { $sort: sort },
            { $skip: skip },
            { $limit: limit },
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
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'sites',
                    localField: 'siteId',
                    foreignField: '_id',
                    as: 'site'
                }
            },
            { $unwind: { path: '$site', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    action: 1,
                    resource: 1,
                    resourceId: 1,
                    before: 1,
                    after: 1,
                    changes: 1,
                    status: 1,
                    error: 1,
                    ip: 1,
                    userAgent: 1,
                    createdAt: 1,
                    
                    'admin._id': 1,
                    'admin.email': 1,
                    'admin.name': 1,
                    
                    'user._id': 1,
                    'user.email': 1,
                    'user.name': 1,
                    
                    'site._id': 1,
                    'site.name': 1,
                    'site.slug': 1
                }
            }
        ];
        
        return collection.aggregate(pipeline).toArray();
    }
    
    // Get audit log by ID
    static async findById(logId) {
        const collection = await db.getCollection('admin_audit');
        
        const pipeline = [
            { $match: { _id: new ObjectId(logId) } },
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
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'sites',
                    localField: 'siteId',
                    foreignField: '_id',
                    as: 'site'
                }
            },
            { $unwind: { path: '$site', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    action: 1,
                    resource: 1,
                    resourceId: 1,
                    before: 1,
                    after: 1,
                    changes: 1,
                    status: 1,
                    error: 1,
                    ip: 1,
                    userAgent: 1,
                    location: 1,
                    metadata: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    
                    'admin._id': 1,
                    'admin.email': 1,
                    'admin.name': 1,
                    
                    'user._id': 1,
                    'user.email': 1,
                    'user.name': 1,
                    
                    'site._id': 1,
                    'site.name': 1,
                    'site.slug': 1,
                    'site.publicUrl': 1
                }
            }
        ];
        
        const logs = await collection.aggregate(pipeline).toArray();
        return logs[0] || null;
    }
    
    // Search audit logs
    static async search(query, page = 1, limit = 20, filters = {}) {
        const collection = await db.getCollection('admin_audit');
        const skip = (page - 1) * limit;
        
        const filter = {};
        
        if (query) {
            // Search in action, resource, or admin/user names via lookup
            // For simplicity, we'll search in action field
            filter.action = { $regex: query, $options: 'i' };
        }
        
        if (filters.adminId) {
            filter.adminId = new ObjectId(filters.adminId);
        }
        
        if (filters.resource) {
            filter.resource = filters.resource;
        }
        
        if (filters.startDate || filters.endDate) {
            filter.createdAt = {};
            if (filters.startDate) {
                filter.createdAt.$gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                filter.createdAt.$lte = new Date(filters.endDate);
            }
        }
        
        const pipeline = [
            { $match: filter },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'adminId',
                    foreignField: '_id',
                    as: 'admin'
                }
            },
            { $unwind: { path: '$admin', preserveNullAndEmptyArrays: true } }
        ];
        
        const [logs, total] = await Promise.all([
            collection.aggregate(pipeline).toArray(),
            collection.countDocuments(filter)
        ]);
        
        return {
            logs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }
    
    // Get statistics
    static async getStats(period = '30d') {
        const collection = await db.getCollection('admin_audit');
        
        let startDate;
        const endDate = new Date();
        
        switch (period) {
            case '1d':
                startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        
        const pipeline = [
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            {
                $facet: {
                    byAction: [
                        {
                            $group: {
                                _id: '$action',
                                count: { $sum: 1 },
                                success: { 
                                    $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
                                },
                                failed: { 
                                    $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                                }
                            }
                        },
                        { $sort: { count: -1 } }
                    ],
                    byResource: [
                        {
                            $group: {
                                _id: '$resource',
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { count: -1 } }
                    ],
                    byAdmin: [
                        {
                            $group: {
                                _id: '$adminId',
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { count: -1 } },
                        { $limit: 10 },
                        {
                            $lookup: {
                                from: 'users',
                                localField: '_id',
                                foreignField: '_id',
                                as: 'admin'
                            }
                        },
                        { $unwind: { path: '$admin', preserveNullAndEmptyArrays: true } },
                        {
                            $project: {
                                adminId: '$_id',
                                count: 1,
                                'admin.email': 1,
                                'admin.name': 1
                            }
                        }
                    ],
                    daily: [
                        {
                            $group: {
                                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { '_id': 1 } }
                    ],
                    summary: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                success: { 
                                    $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
                                },
                                failed: { 
                                    $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                                }
                            }
                        }
                    ]
                }
            }
        ];
        
        const result = await collection.aggregate(pipeline).toArray();
        const data = result[0] || {};
        
        return {
            byAction: data.byAction || [],
            byResource: data.byResource || [],
            byAdmin: data.byAdmin || [],
            daily: data.daily || [],
            summary: data.summary?.[0] || { total: 0, success: 0, failed: 0 }
        };
    }
    
    // Count audit logs
    static async count(filter = {}) {
        const collection = await db.getCollection('admin_audit');
        return collection.countDocuments(filter);
    }
    
    // Clean up old audit logs (older than 1 year)
    static async cleanupOldData(days = 365) {
        const collection = await db.getCollection('admin_audit');
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        const result = await collection.deleteMany({
            createdAt: { $lt: cutoffDate }
        });
        
        return result.deletedCount;
    }
    
    // Export audit logs (for compliance)
    static async exportLogs(format = 'json', filters = {}) {
        const logs = await this.getLogs(filters, { limit: 10000 }); // Max 10k for export
        
        if (format === 'csv') {
            // Convert to CSV
            const headers = [
                'Timestamp',
                'Admin Email',
                'Action',
                'Resource',
                'Resource ID',
                'Status',
                'IP Address',
                'User Agent'
            ];
            
            const rows = logs.map(log => [
                log.createdAt.toISOString(),
                log.admin?.email || '',
                log.action,
                log.resource,
                log.resourceId || '',
                log.status,
                log.ip,
                `"${log.userAgent.replace(/"/g, '""')}"`
            ]);
            
            return [headers, ...rows].map(row => row.join(',')).join('\n');
        }
        
        // Default JSON
        return logs;
    }
    
    // Get admin activity summary
    static async getAdminActivity(adminId, period = '30d') {
        const collection = await db.getCollection('admin_audit');
        
        let startDate;
        const endDate = new Date();
        
        switch (period) {
            case '1d':
                startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        
        const pipeline = [
            { $match: { 
                adminId: new ObjectId(adminId),
                createdAt: { $gte: startDate, $lte: endDate }
            }},
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    actions: { $sum: 1 },
                    successful: { 
                        $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
                    },
                    failed: { 
                        $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                    },
                    resources: { $addToSet: '$resource' }
                }
            },
            { $sort: { '_id': 1 } },
            {
                $project: {
                    date: '$_id',
                    actions: 1,
                    successful: 1,
                    failed: 1,
                    resourceCount: { $size: '$resources' }
                }
            }
        ];
        
        return collection.aggregate(pipeline).toArray();
    }
    
    // Validate audit log data
    static validate(logData) {
        const errors = [];
        
        if (!logData.action) {
            errors.push('Action is required');
        }
        
        if (!logData.resource) {
            errors.push('Resource is required');
        }
        
        if (!logData.adminId) {
            errors.push('Admin ID is required');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}

module.exports = AuditLog;