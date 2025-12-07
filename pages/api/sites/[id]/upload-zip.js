const { ObjectId } = require('mongodb');
const AuthService = require('../../../../lib/auth');
const Site = require('../../../../models/Site');
const Upload = require('../../../../models/Upload');
const s3Service = require('../../../../lib/s3');
const validation = require('../../../../lib/validation');
const AdmZip = require('adm-zip');
const busboy = require('busboy');

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
    let zipBuffer = Buffer.alloc(0);
    let filename = '';

    bb.on('file', (name, file, info) => {
      if (name === 'file') {
        filename = info.filename;
        const chunks = [];
        
        file.on('data', (chunk) => {
          chunks.push(chunk);
        });

        file.on('end', () => {
          zipBuffer = Buffer.concat(chunks);
        });
      } else {
        file.resume(); // Discard other fields
      }
    });

    bb.on('close', async () => {
      try {
        // Validate ZIP file
        const zipValidation = await validation.validateZipFile(zipBuffer, filename);
        
        if (!zipValidation.valid) {
          return res.status(400).json({ 
            error: 'Invalid ZIP file',
            details: zipValidation.errors,
            warnings: zipValidation.warnings
          });
        }

        // Check user storage quota
        const User = require('../../../../models/User');
        const user = await User.findById(decoded.userId);
        
        const totalSize = zipValidation.totalSize;
        if (user.quota.usedStorage + totalSize > user.quota.maxStorage) {
          return res.status(400).json({ 
            error: `Storage quota exceeded. Available: ${validation.formatBytes(user.quota.maxStorage - user.quota.usedStorage)}, Needed: ${validation.formatBytes(totalSize)}`
          });
        }

        // Extract and upload files
        const zip = new AdmZip(zipBuffer);
        const zipEntries = zip.getEntries();
        let uploadedCount = 0;
        let totalUploadedSize = 0;
        const uploadErrors = [];

        for (const entry of zipEntries) {
          if (entry.isDirectory) continue;

          const filePath = entry.entryName;
          
          // Skip files that shouldn't be uploaded
          if (!validation.isStaticAsset(filePath)) {
            uploadErrors.push(`Skipped: ${filePath} (not a static asset)`);
            continue;
          }

          try {
            const fileContent = entry.getData();
            
            // Upload to S3
            const uploadResult = await s3Service.uploadFile(
              id,
              filePath,
              fileContent
            );

            if (uploadResult.success) {
              uploadedCount++;
              totalUploadedSize += fileContent.length;

              // Record upload in database
              await Upload.create({
                siteId: id,
                userId: decoded.userId,
                type: 'zip',
                filename: filePath,
                originalFilename: filePath,
                path: filePath,
                s3Key: uploadResult.path,
                size: fileContent.length,
                mimeType: entry.header.made,
                status: 'completed'
              });
            }
          } catch (uploadError) {
            uploadErrors.push(`Failed to upload ${filePath}: ${uploadError.message}`);
          }
        }

        // Update site quota
        if (uploadedCount > 0) {
          await Site.updateQuota(id, totalUploadedSize, uploadedCount);
        }

        // Create upload record for the ZIP itself
        await Upload.create({
          siteId: id,
          userId: decoded.userId,
          type: 'zip',
          filename: filename,
          originalFilename: filename,
          size: zipBuffer.length,
          status: 'completed',
          metadata: {
            extractedFiles: uploadedCount,
            totalSize: totalUploadedSize
          }
        });

        res.status(200).json({
          success: true,
          message: `ZIP uploaded successfully. ${uploadedCount} files extracted.`,
          stats: {
            filesUploaded: uploadedCount,
            totalSize: totalUploadedSize,
            errors: uploadErrors.length,
            warnings: zipValidation.warnings
          },
          errors: uploadErrors.length > 0 ? uploadErrors : undefined,
          warnings: zipValidation.warnings.length > 0 ? zipValidation.warnings : undefined
        });

      } catch (error) {
        console.error('ZIP upload processing error:', error);
        res.status(500).json({ 
          error: 'Failed to process ZIP file',
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
    console.error('Upload ZIP error:', error);
    
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