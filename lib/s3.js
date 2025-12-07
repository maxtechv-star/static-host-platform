const AWS = require('aws-sdk');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, CopyObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');
const mime = require('mime-types');

class S3Service {
    constructor() {
        this.bucket = process.env.S3_BUCKET;
        this.region = process.env.S3_REGION || 'us-east-1';
        this.endpoint = process.env.S3_ENDPOINT;
        this.cdnUrl = process.env.CDN_URL || `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
        
        // Configure AWS SDK
        const s3Config = {
            region: this.region,
            credentials: {
                accessKeyId: process.env.S3_KEY,
                secretAccessKey: process.env.S3_SECRET
            },
            ...(this.endpoint && { endpoint: this.endpoint }),
            ...(this.endpoint && { s3ForcePathStyle: true })
        };
        
        // Use v3 SDK for newer features
        this.s3Client = new S3Client(s3Config);
        
        // Keep v2 for compatibility
        this.s3 = new AWS.S3(s3Config);
    }
    
    // Generate file path for site storage
    generateSitePath(siteId, filePath = '') {
        // Sanitize file path to prevent directory traversal
        const safeFilePath = filePath.replace(/\.\.\//g, '').replace(/^\//, '');
        return `sites/${siteId}/${safeFilePath}`;
    }
    
    // Generate public URL for a file
    generatePublicUrl(siteId, filePath = '') {
        const s3Path = this.generateSitePath(siteId, filePath);
        return `${this.cdnUrl}/${s3Path}`;
    }
    
    // Upload file to S3
    async uploadFile(siteId, filePath, content, contentType = null) {
        try {
            const s3Path = this.generateSitePath(siteId, filePath);
            
            // Determine content type
            const mimeType = contentType || mime.lookup(filePath) || 'application/octet-stream';
            
            const params = {
                Bucket: this.bucket,
                Key: s3Path,
                Body: content,
                ContentType: mimeType,
                CacheControl: 'public, max-age=31536000, immutable',
                ACL: 'public-read'
            };
            
            // Special handling for HTML files
            if (filePath.endsWith('.html') || filePath.endsWith('.htm')) {
                params.ContentType = 'text/html; charset=utf-8';
                params.CacheControl = 'public, max-age=3600';
            }
            
            await this.s3Client.send(new PutObjectCommand(params));
            
            return {
                success: true,
                path: s3Path,
                url: this.generatePublicUrl(siteId, filePath),
                size: Buffer.byteLength(content)
            };
        } catch (error) {
            console.error('S3 upload error:', error);
            throw new Error(`Failed to upload file: ${error.message}`);
        }
    }
    
    // Upload file from buffer
    async uploadFileBuffer(siteId, filePath, buffer, contentType = null) {
        return this.uploadFile(siteId, filePath, buffer, contentType);
    }
    
    // Upload file from stream
    async uploadFileStream(siteId, filePath, stream, contentType = null) {
        try {
            const s3Path = this.generateSitePath(siteId, filePath);
            const mimeType = contentType || mime.lookup(filePath) || 'application/octet-stream';
            
            const params = {
                Bucket: this.bucket,
                Key: s3Path,
                Body: stream,
                ContentType: mimeType,
                CacheControl: 'public, max-age=31536000, immutable',
                ACL: 'public-read'
            };
            
            await this.s3.upload(params).promise();
            
            return {
                success: true,
                path: s3Path,
                url: this.generatePublicUrl(siteId, filePath)
            };
        } catch (error) {
            console.error('S3 stream upload error:', error);
            throw new Error(`Failed to upload file: ${error.message}`);
        }
    }
    
    // Get file from S3
    async getFile(siteId, filePath) {
        try {
            const s3Path = this.generateSitePath(siteId, filePath);
            
            const params = {
                Bucket: this.bucket,
                Key: s3Path
            };
            
            const response = await this.s3Client.send(new GetObjectCommand(params));
            
            // Convert stream to buffer
            const chunks = [];
            for await (const chunk of response.Body) {
                chunks.push(chunk);
            }
            
            return Buffer.concat(chunks);
        } catch (error) {
            if (error.name === 'NoSuchKey') {
                return null;
            }
            throw new Error(`Failed to get file: ${error.message}`);
        }
    }
    
    // Get signed URL for temporary access
    async getSignedUrl(siteId, filePath, expiresIn = 3600) {
        try {
            const s3Path = this.generateSitePath(siteId, filePath);
            
            const params = {
                Bucket: this.bucket,
                Key: s3Path
            };
            
            const command = new GetObjectCommand(params);
            const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
            
            return signedUrl;
        } catch (error) {
            throw new Error(`Failed to generate signed URL: ${error.message}`);
        }
    }
    
    // List files in a site directory
    async listFiles(siteId, prefix = '') {
        try {
            const s3Prefix = this.generateSitePath(siteId, prefix);
            
            const params = {
                Bucket: this.bucket,
                Prefix: s3Prefix
            };
            
            const response = await this.s3Client.send(new ListObjectsV2Command(params));
            
            const files = (response.Contents || []).map(item => {
                const relativePath = item.Key.replace(`sites/${siteId}/`, '');
                return {
                    key: item.Key,
                    path: relativePath,
                    size: item.Size,
                    lastModified: item.LastModified,
                    etag: item.ETag
                };
            });
            
            return {
                files,
                isTruncated: response.IsTruncated,
                continuationToken: response.NextContinuationToken
            };
        } catch (error) {
            throw new Error(`Failed to list files: ${error.message}`);
        }
    }
    
    // Delete file from S3
    async deleteFile(siteId, filePath) {
        try {
            const s3Path = this.generateSitePath(siteId, filePath);
            
            const params = {
                Bucket: this.bucket,
                Key: s3Path
            };
            
            await this.s3Client.send(new DeleteObjectCommand(params));
            
            return { success: true };
        } catch (error) {
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }
    
    // Delete all files for a site
    async deleteSiteFiles(siteId) {
        try {
            const files = await this.listFiles(siteId);
            
            if (files.files.length === 0) {
                return { success: true, deletedCount: 0 };
            }
            
            const deleteParams = {
                Bucket: this.bucket,
                Delete: {
                    Objects: files.files.map(file => ({ Key: file.key }))
                }
            };
            
            await this.s3.deleteObjects(deleteParams).promise();
            
            return { success: true, deletedCount: files.files.length };
        } catch (error) {
            throw new Error(`Failed to delete site files: ${error.message}`);
        }
    }
    
    // Copy file within S3
    async copyFile(sourceSiteId, sourcePath, destSiteId, destPath) {
        try {
            const sourceKey = this.generateSitePath(sourceSiteId, sourcePath);
            const destKey = this.generateSitePath(destSiteId, destPath);
            
            const params = {
                Bucket: this.bucket,
                CopySource: `${this.bucket}/${sourceKey}`,
                Key: destKey,
                ACL: 'public-read',
                CacheControl: 'public, max-age=31536000, immutable'
            };
            
            await this.s3.copyObject(params).promise();
            
            return {
                success: true,
                url: this.generatePublicUrl(destSiteId, destPath)
            };
        } catch (error) {
            throw new Error(`Failed to copy file: ${error.message}`);
        }
    }
    
    // Get file metadata
    async getFileMetadata(siteId, filePath) {
        try {
            const s3Path = this.generateSitePath(siteId, filePath);
            
            const params = {
                Bucket: this.bucket,
                Key: s3Path
            };
            
            const response = await this.s3Client.send(new HeadObjectCommand(params));
            
            return {
                size: response.ContentLength,
                contentType: response.ContentType,
                lastModified: response.LastModified,
                etag: response.ETag,
                cacheControl: response.CacheControl
            };
        } catch (error) {
            if (error.name === 'NotFound') {
                return null;
            }
            throw new Error(`Failed to get file metadata: ${error.message}`);
        }
    }
    
    // Upload entire directory (from extracted zip)
    async uploadDirectory(siteId, directoryPath, files) {
        const results = [];
        const errors = [];
        
        for (const file of files) {
            try {
                const relativePath = file.path.replace(directoryPath, '').replace(/^\//, '');
                
                if (this.isValidStaticFile(relativePath)) {
                    const result = await this.uploadFileBuffer(
                        siteId,
                        relativePath,
                        file.content,
                        file.mimeType
                    );
                    
                    results.push({
                        path: relativePath,
                        size: file.content.length,
                        url: result.url
                    });
                }
            } catch (error) {
                errors.push({
                    path: file.path,
                    error: error.message
                });
            }
        }
        
        return {
            success: errors.length === 0,
            uploaded: results.length,
            results,
            errors
        };
    }
    
    // Validate file for static hosting
    isValidStaticFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const bannedExtensions = [
            '.php', '.py', '.rb', '.pl', '.sh', '.exe', '.bat', '.cmd',
            '.jar', '.war', '.ear', '.dll', '.so', '.dylib'
        ];
        
        // Check for banned extensions
        if (bannedExtensions.includes(ext)) {
            return false;
        }
        
        // Check for suspicious patterns
        const suspiciousPatterns = [
            /\.htaccess$/i,
            /wp-config\.php$/i,
            /\.env$/,
            /config\.json$/i,
            /\.git\//,
            /\.svn\//,
            /\.DS_Store$/
        ];
        
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(filePath)) {
                return false;
            }
        }
        
        return true;
    }
    
    // Generate hash for file (for caching)
    generateFileHash(content) {
        return crypto.createHash('md5').update(content).digest('hex');
    }
    
    // Get bucket statistics
    async getBucketStats() {
        try {
            let totalSize = 0;
            let totalFiles = 0;
            let continuationToken = null;
            
            do {
                const params = {
                    Bucket: this.bucket,
                    Prefix: 'sites/',
                    ContinuationToken: continuationToken
                };
                
                const response = await this.s3Client.send(new ListObjectsV2Command(params));
                
                for (const item of response.Contents || []) {
                    totalSize += item.Size || 0;
                    totalFiles++;
                }
                
                continuationToken = response.NextContinuationToken;
            } while (continuationToken);
            
            return {
                totalSize,
                totalFiles,
                bucket: this.bucket,
                region: this.region,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('Error getting bucket stats:', error);
            throw error;
        }
    }
    
    // Check if bucket exists and is accessible
    async checkBucketAccess() {
        try {
            await this.s3Client.send(new ListObjectsV2Command({
                Bucket: this.bucket,
                MaxKeys: 1
            }));
            
            return { accessible: true };
        } catch (error) {
            return { 
                accessible: false, 
                error: error.message 
            };
        }
    }
}

// Singleton instance
const s3Service = new S3Service();

module.exports = s3Service;