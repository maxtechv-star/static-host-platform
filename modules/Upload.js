const { ObjectId } = require('mongodb');
const db = require('../lib/db');

class Upload {
    // Create new upload record
    static async create(uploadData) {
        const collection = await db.getCollection('uploads');
        
        const upload = {
            siteId: uploadData.siteId.toString(),
            userId: uploadData.userId ? new ObjectId(uploadData.userId) : null,
            type: uploadData.type || 'file', // file, zip, git
            filename: uploadData.filename,
            originalFilename: uploadData.originalFilename || uploadData.filename,
            path: uploadData.path || '',
            s3Key: uploadData.s3Key || '',
            size: uploadData.size || 0,
            mimeType: uploadData.mimeType || 'application/octet-stream',
            
            // Metadata
            metadata: {
                width: uploadData.metadata?.width || null,
                height: uploadData.metadata?.height || null,
                duration: uploadData.metadata?.duration || null,
                resolution: uploadData.metadata?.resolution || null,
                checksum: uploadData.metadata?.checksum || null,
                optimized: uploadData.metadata?.optimized || false
            },
            
            // Status
            status: uploadData.status || 'completed', // pending, processing, completed, failed
            error: uploadData.error || null,
            retryCount: uploadData.retryCount || 0,
            
            // Processing
            processingTime: uploadData.processingTime || null,
            optimizedSize: uploadData.optimizedSize || null,
            
            // Timestamps
            uploadedAt: uploadData.uploadedAt || new Date(),
            processedAt: uploadData.processedAt || null,
            expiresAt: uploadData.expiresAt || null
        };
        
        const result = await collection.insertOne(upload);
        upload._id = result.insertedId;
        
        return upload;
    }
    
    // Find upload by ID
    static async findById(uploadId) {
        const collection = await db.getCollection('uploads');
        return collection.findOne({ _id: new ObjectId(uploadId) });
    }
    
    // Find uploads by site
    static async findBySite(siteId, options = {}) {
        const collection = await db.getCollection('uploads');
        
        const filter = { siteId: siteId.toString() };
        
        if (options.type) {
            filter.type = options.type;
        }
        
        if (options.status) {
            filter.status = options.status;
        }
        
        const sort = options.sort || { uploadedAt: -1 };
        const limit = options.limit || 50;
        const skip = options.skip || 0;
        
        return collection.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .toArray();
    }
    
    // Find uploads by user
    static async findByUser(userId, options = {}) {
        const collection = await db.getCollection('uploads');
        
        const filter = { userId: new ObjectId(userId) };
        
        if (options.siteId) {
            filter.siteId = options.siteId.toString();
        }
        
        if (options.type) {
            filter.type = options.type;
        }
        
        const sort = options.sort || { uploadedAt: -1 };
        const limit = options.limit || 50;
        const skip = options.skip || 0;
        
        return collection.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .toArray();
    }
    
    // Update upload
    static async update(uploadId, updates) {
        const collection = await db.getCollection('uploads');
        
        const updateData = { ...updates };
        
        const result = await collection.updateOne(
            { _id: new ObjectId(uploadId) },
            { $set: updateData }
        );
        
        return result.modifiedCount > 0;
    }
    
    // Update upload status
    static async updateStatus(uploadId, status, error = null) {
        const collection = await db.getCollection('uploads');
        
        const updateData = {
            status,
            processedAt: status === 'completed' || status === 'failed' ? new Date() : null
        };
        
        if (error) {
            updateData.error = error;
            updateData.$inc = { retryCount: 1 };
        }
        
        const result = await collection.updateOne(
            { _id: new ObjectId(uploadId) },
            { $set: updateData }
        );
        
        return result.modifiedCount > 0;
    }
    
    // Delete upload
    static async delete(uploadId) {
        const collection = await db.getCollection('uploads');
        const result = await collection.deleteOne({ _id: new ObjectId(uploadId) });
        return result.deletedCount > 0;
    }
    
    // Delete uploads by site
    static async deleteBySite(siteId) {
        const collection = await db.getCollection('uploads');
        const result = await collection.deleteMany({ siteId: siteId.toString() });
        return result.deletedCount;
    }
    
    // Get upload statistics for site
    static async getStats(siteId) {
        const collection = await db.getCollection('uploads');
        
        const stats = await collection.aggregate([
            { $match: { siteId: siteId.toString() } },
            { $group: {
                _id: null,
                totalUploads: { $sum: 1 },
                totalSize: { $sum: '$size' },
                successfulUploads: { 
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                failedUploads: { 
                    $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                },
                pendingUploads: { 
                    $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                },
                lastUpload: { $max: '$uploadedAt' }
            }}
        ]).toArray();
        
        const typeStats = await collection.aggregate([
            { $match: { siteId: siteId.toString() } },
            { $group: {
                _id: '$type',
                count: { $sum: 1 },
                totalSize: { $sum: '$size' }
            }}
        ]).toArray();
        
        return {
            ...(stats[0] || {
                totalUploads: 0,
                totalSize: 0,
                successfulUploads: 0,
                failedUploads: 0,
                pendingUploads: 0,
                lastUpload: null
            }),
            byType: typeStats.reduce((acc, stat) => {
                acc[stat._id] = {
                    count: stat.count,
                    size: stat.totalSize
                };
                return acc;
            }, {})
        };
    }
    
    // Get recent uploads
    static async getRecent(limit = 20, filters = {}) {
        const collection = await db.getCollection('uploads');
        
        const filter = {};
        
        if (filters.siteId) {
            filter.siteId = filters.siteId.toString();
        }
        
        if (filters.userId) {
            filter.userId = new ObjectId(filters.userId);
        }
        
        if (filters.type) {
            filter.type = filters.type;
        }
        
        if (filters.status) {
            filter.status = filters.status;
        }
        
        return collection.find(filter)
            .sort({ uploadedAt: -1 })
            .limit(limit)
            .toArray();
    }
    
    // Get uploads needing processing
    static async getPendingUploads(limit = 10) {
        const collection = await db.getCollection('uploads');
        return collection.find({
            status: 'pending',
            retryCount: { $lt: 3 }
        })
        .sort({ uploadedAt: 1 })
        .limit(limit)
        .toArray();
    }
    
    // Get expired uploads (for cleanup)
    static async getExpiredUploads(days = 7) {
        const collection = await db.getCollection('uploads');
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        return collection.find({
            uploadedAt: { $lt: cutoffDate },
            status: { $in: ['completed', 'failed'] }
        }).toArray();
    }
    
    // Get largest uploads
    static async getLargestUploads(siteId, limit = 10) {
        const collection = await db.getCollection('uploads');
        return collection.find({ siteId: siteId.toString() })
            .sort({ size: -1 })
            .limit(limit)
            .toArray();
    }
    
    // Search uploads
    static async search(query, page = 1, limit = 20, filters = {}) {
        const collection = await db.getCollection('uploads');
        const skip = (page - 1) * limit;
        
        const filter = {};
        
        if (query) {
            filter.$or = [
                { filename: { $regex: query, $options: 'i' } },
                { originalFilename: { $regex: query, $options: 'i' } }
            ];
        }
        
        if (filters.siteId) {
            filter.siteId = filters.siteId.toString();
        }
        
        if (filters.userId) {
            filter.userId = new ObjectId(filters.userId);
        }
        
        if (filters.type) {
            filter.type = filters.type;
        }
        
        if (filters.status) {
            filter.status = filters.status;
        }
        
        const [uploads, total] = await Promise.all([
            collection.find(filter)
                .sort({ uploadedAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            collection.countDocuments(filter)
        ]);
        
        return {
            uploads,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }
    
    // Count uploads
    static async count(filter = {}) {
        const collection = await db.getCollection('uploads');
        return collection.countDocuments(filter);
    }
    
    // Get storage usage by user
    static async getStorageUsage(userId) {
        const collection = await db.getCollection('uploads');
        
        // Get all sites for user
        const sitesCollection = await db.getCollection('sites');
        const userSites = await sitesCollection.find(
            { ownerId: new ObjectId(userId) },
            { projection: { _id: 1 } }
        ).toArray();
        
        if (userSites.length === 0) {
            return { totalSize: 0, fileCount: 0 };
        }
        
        const siteIds = userSites.map(site => site._id.toString());
        
        const stats = await collection.aggregate([
            { $match: { siteId: { $in: siteIds } } },
            { $group: {
                _id: null,
                totalSize: { $sum: '$size' },
                fileCount: { $sum: 1 }
            }}
        ]).toArray();
        
        return stats[0] || { totalSize: 0, fileCount: 0 };
    }
    
    // Validate upload data
    static validate(uploadData) {
        const errors = [];
        
        if (!uploadData.siteId) {
            errors.push('Site ID is required');
        }
        
        if (!uploadData.filename) {
            errors.push('Filename is required');
        }
        
        if (uploadData.size === undefined || uploadData.size < 0) {
            errors.push('Valid size is required');
        }
        
        if (uploadData.size > (parseInt(process.env.MAX_UPLOAD_SIZE) || 100 * 1024 * 1024)) {
            errors.push('File size exceeds maximum limit');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}

module.exports = Upload;