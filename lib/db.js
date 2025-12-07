const { MongoClient, ObjectId } = require('mongodb');

class Database {
    constructor() {
        this.client = null;
        this.db = null;
        this.isConnected = false;
        this.connectionPromise = null;
    }
    
    async connect() {
        if (this.isConnected) {
            return this.db;
        }
        
        if (this.connectionPromise) {
            return this.connectionPromise;
        }
        
        this.connectionPromise = new Promise(async (resolve, reject) => {
            try {
                const mongoUri = process.env.MONGO_URI;
                
                if (!mongoUri) {
                    throw new Error('MONGO_URI environment variable is not set');
                }
                
                this.client = new MongoClient(mongoUri, {
                    maxPoolSize: 10,
                    minPoolSize: 2,
                    connectTimeoutMS: 10000,
                    socketTimeoutMS: 45000,
                    serverSelectionTimeoutMS: 10000,
                });
                
                await this.client.connect();
                this.db = this.client.db();
                this.isConnected = true;
                
                console.log('✅ MongoDB connected successfully');
                
                // Ensure indexes
                await this.createIndexes();
                
                resolve(this.db);
            } catch (error) {
                console.error('❌ MongoDB connection error:', error);
                reject(error);
            } finally {
                this.connectionPromise = null;
            }
        });
        
        return this.connectionPromise;
    }
    
    async createIndexes() {
        try {
            // Users collection indexes
            await this.db.collection('users').createIndex({ email: 1 }, { unique: true });
            await this.db.collection('users').createIndex({ googleId: 1 }, { sparse: true });
            await this.db.collection('users').createIndex({ createdAt: 1 });
            
            // Sites collection indexes
            await this.db.collection('sites').createIndex({ ownerId: 1 });
            await this.db.collection('sites').createIndex({ slug: 1 }, { unique: true, sparse: true });
            await this.db.collection('sites').createIndex({ status: 1 });
            await this.db.collection('sites').createIndex({ createdAt: 1 });
            await this.db.collection('sites').createIndex({ 'analytics.lastHit': 1 });
            
            // Uploads collection indexes
            await this.db.collection('uploads').createIndex({ siteId: 1 });
            await this.db.collection('uploads').createIndex({ uploadedAt: 1 });
            
            // Analytics collection indexes
            await this.db.collection('analytics').createIndex({ siteId: 1, ts: 1 });
            await this.db.collection('analytics').createIndex({ siteId: 1, ipHash: 1 });
            await this.db.collection('analytics').createIndex({ ts: 1 });
            
            // Admin audit log indexes
            await this.db.collection('admin_audit').createIndex({ adminId: 1, ts: 1 });
            await this.db.collection('admin_audit').createIndex({ ts: 1 });
            
            console.log('✅ Database indexes created');
        } catch (error) {
            console.error('❌ Error creating indexes:', error);
        }
    }
    
    async getCollection(collectionName) {
        if (!this.isConnected) {
            await this.connect();
        }
        
        return this.db.collection(collectionName);
    }
    
    // Helper methods for common operations
    async findOneById(collectionName, id, projection = {}) {
        const collection = await this.getCollection(collectionName);
        return collection.findOne({ _id: new ObjectId(id) }, { projection });
    }
    
    async findByIds(collectionName, ids, projection = {}) {
        const collection = await this.getCollection(collectionName);
        const objectIds = ids.map(id => new ObjectId(id));
        return collection.find({ _id: { $in: objectIds } }, { projection }).toArray();
    }
    
    async insertOne(collectionName, document) {
        const collection = await this.getCollection(collectionName);
        return collection.insertOne(document);
    }
    
    async updateOne(collectionName, filter, update, options = {}) {
        const collection = await this.getCollection(collectionName);
        return collection.updateOne(filter, update, options);
    }
    
    async deleteOne(collectionName, filter) {
        const collection = await this.getCollection(collectionName);
        return collection.deleteOne(filter);
    }
    
    async aggregate(collectionName, pipeline) {
        const collection = await this.getCollection(collectionName);
        return collection.aggregate(pipeline).toArray();
    }
    
    async count(collectionName, filter = {}) {
        const collection = await this.getCollection(collectionName);
        return collection.countDocuments(filter);
    }
    
    // Transaction support
    async withTransaction(callback) {
        const session = this.client.startSession();
        
        try {
            let result;
            await session.withTransaction(async () => {
                result = await callback(session);
            });
            
            return result;
        } finally {
            await session.endSession();
        }
    }
    
    // Close connection
    async close() {
        if (this.client) {
            await this.client.close();
            this.isConnected = false;
            this.db = null;
            this.client = null;
            console.log('✅ MongoDB connection closed');
        }
    }
    
    // Health check
    async healthCheck() {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            
            // Run a simple command to check connection
            await this.db.command({ ping: 1 });
            return { status: 'healthy', timestamp: new Date() };
        } catch (error) {
            return { 
                status: 'unhealthy', 
                error: error.message,
                timestamp: new Date() 
            };
        }
    }
    
    // Get database statistics
    async getStats() {
        try {
            const collections = await this.db.listCollections().toArray();
            const stats = {
                collections: [],
                totalDocuments: 0,
                totalSize: 0,
                timestamp: new Date()
            };
            
            for (const collectionInfo of collections) {
                const collection = this.db.collection(collectionInfo.name);
                const collStats = await collection.stats();
                
                stats.collections.push({
                    name: collectionInfo.name,
                    documents: collStats.count,
                    size: collStats.size,
                    storageSize: collStats.storageSize,
                    indexes: collStats.nindexes,
                    indexSize: collStats.totalIndexSize
                });
                
                stats.totalDocuments += collStats.count;
                stats.totalSize += collStats.size;
            }
            
            return stats;
        } catch (error) {
            console.error('Error getting database stats:', error);
            throw error;
        }
    }
}

// Singleton instance
const dbInstance = new Database();

// Ensure connection on module load in production
if (process.env.NODE_ENV === 'production') {
    dbInstance.connect().catch(console.error);
}

module.exports = dbInstance;