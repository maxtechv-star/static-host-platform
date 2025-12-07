const { ObjectId } = require('mongodb');
const AuthService = require('../../../../lib/auth');
const Site = require('../../../../models/Site');
const Upload = require('../../../../models/Upload');
const s3Service = require('../../../../lib/s3');
const validation = require('../../../../lib/validation');
const busboy = require('busboy');
const path = require('path');

export const config = {
  api: {
    bodyParser: false, // Disable default body parser for file uploads
  },
};

export default async function handler(req, res) {
  // Verify authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = AuthService.verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { id } = req.query;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get site and verify ownership
    const site = await Site.findById(id);
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    if (site.ownerId.toString() !== decoded.userId) {
      return res.status(403).json({ error: 'Not authorized to upload to this site' });
    }

    // Parse multipart form data
    const bb = busboy({ headers: req.headers });
    const files = [];
    const uploadPath = req.headers['x-upload-path'] || '';

    bb.on('file', (name, file, info) => {
      if (name === 'file' || name === 'files') {
        const chunks = [];
        
        file.on('data', (chunk) => {
          chunks.push(chunk);
        });

        file.on('end', () => {
          files.push({
            filename: info.filename,
            content: Buffer.concat(chunks),
            mimeType: info.mimeType
          });
        });
      } else {
        file.resume(); // Discard other fields
      }
    });

    bb.on('close', async () => {
      try {
        if (files.length === 0) {
          return res.status(400).json({ error: 'No files provided' });
        }

        // Check user storage quota
        const User = require('../../../../models/User');
        const user = await User.findById(decoded.userId);
        
        const totalSize = files.reduce((sum, file) => sum + file.content.length, 0);
        if (user.quota.usedStorage + totalSize > user.quota.maxStorage) {
          return res.status(400).json({ 
            error: `Storage quota exceeded. Available: ${validation.formatBytes(user.quota.maxStorage - user.quota.usedStorage)}, Needed: ${validation.formatBytes(totalSize)}`
          });
        }

        // Process each file
        let uploadedCount = 0;
        let totalUploadedSize = 0;
        const uploadResults = [];
        const uploadErrors = [];

        for (const file of files) {
          try {
            // Validate file
            const fileValidation = validation.validateFile({
              name: file.filename,
              size: file.content.length
            });

            if (!fileValidation.valid) {
              uploadErrors.push({
                filename: file.filename,
                error: fileValidation.errors[0]
              });
              continue;
            }

            // Construct file path
            const filePath = uploadPath ? 
              path.join(uploadPath, file.filename).replace(/\\/g, '/') : 
              file.filename;

            // Upload to S3
            const uploadResult = await s3Service.uploadFile(
              id,
              filePath,
              file.content,
              file.mimeType
            );

            if (uploadResult.success) {
              uploadedCount++;
              totalUploadedSize += file.content.length;

              // Record upload in database
              await Upload.create({
                siteId: id,
                userId: decoded.userId,
                type: 'file',
                filename: file.filename,
                originalFilename: file.filename,
                path: filePath,
                s3Key: uploadResult.path,
                size: file.content.length,
                mimeType: file.mimeType,
                status: 'completed'
              });

              uploadResults.push({
                filename: file.filename,
                path: filePath,
                size: file.content.length,
                url: uploadResult.url
              });
            }
          } catch (uploadError) {
            uploadErrors.push({
              filename: file.filename,
              error: uploadError.message
            });
          }
        }

        // Update site quota
        if (uploadedCount > 0) {
          await Site.updateQuota(id, totalUploadedSize, uploadedCount);
        }

        res.status(200).json({
          success: true,
          message: `Uploaded ${uploadedCount} of ${files.length} files`,
          files: uploadResults,
          stats: {
            uploaded: uploadedCount,
            failed: uploadErrors.length,
            totalSize: totalUploadedSize
          },
          errors: uploadErrors.length > 0 ? uploadErrors : undefined
        });

      } catch (error) {
        console.error('File upload processing error:', error);
        res.status(500).json({ 
          error: 'Failed to process upload',
          details: error.message
        });
      }
    });

    bb.on('error', (error) => {
      console.error('Busboy error:', error);
      res.status(500).json({ error: 'Failed to parse upload' });
    });

    req.pipe(bb);

  } catch (error) {
    console.error('Upload file error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('not authorized')) {
      return res.status(403).json({ error: error.message });
    }

    if (error.message.includes('quota')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
}