const { ObjectId } = require('mongodb');
const AuthService = require('../../../../lib/auth');
const Site = require('../../../../models/Site');
const Upload = require('../../../../models/Upload');
const s3Service = require('../../../../lib/s3');
const gitCloneService = require('../../../../lib/git-clone');
const validation = require('../../../../lib/validation');
const emailService = require('../../../../lib/email');

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

    const { repoUrl, branch = 'main' } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }

    // Validate Git URL
    const urlValidation = gitCloneService.validateGitUrl(repoUrl);
    if (!urlValidation.valid) {
      return res.status(400).json({ 
        error: 'Invalid Git URL',
        details: urlValidation.error
      });
    }

    // Clone repository
    const cloneResult = await gitCloneService.cloneRepository(repoUrl, { branch });
    
    if (!cloneResult.success) {
      return res.status(400).json({ 
        error: 'Failed to clone repository',
        details: cloneResult.error
      });
    }

    // Check for static site
    const staticCheck = await gitCloneService.checkForStaticSite(cloneResult.tempPath);
    
    if (!staticCheck.hasIndexHtml) {
      await gitCloneService.cleanupTemp(cloneResult.tempPath);
      return res.status(400).json({ 
        error: 'No index.html found in repository',
        details: 'Please ensure your repository contains an index.html file in the root or in a public/ dist/ build/ folder.'
      });
    }

    if (staticCheck.requiresBuild) {
      await gitCloneService.cleanupTemp(cloneResult.tempPath);
      return res.status(400).json({ 
        error: 'Repository requires build process',
        details: staticCheck.buildReason,
        instructions: gitCloneService.getBuildInstructions(staticCheck.packageJsonInfo, staticCheck.buildReason),
        suggestion: 'Please build your site locally and upload the output folder as a ZIP file.'
      });
    }

    // Determine source folder (root or static folder)
    const sourceFolder = staticCheck.foundInStaticFolder ? staticCheck.staticFolderName : '';

    // Get files for upload
    const filesResult = await gitCloneService.getStaticSiteFiles(cloneResult.tempPath, sourceFolder);
    
    if (!filesResult.success || filesResult.files.length === 0) {
      await gitCloneService.cleanupTemp(cloneResult.tempPath);
      return res.status(400).json({ 
        error: 'No valid files found in repository'
      });
    }

    // Check user storage quota
    const User = require('../../../../models/User');
    const user = await User.findById(decoded.userId);
    
    if (user.quota.usedStorage + filesResult.totalSize > user.quota.maxStorage) {
      await gitCloneService.cleanupTemp(cloneResult.tempPath);
      return res.status(400).json({ 
        error: `Storage quota exceeded. Available: ${validation.formatBytes(user.quota.maxStorage - user.quota.usedStorage)}, Needed: ${validation.formatBytes(filesResult.totalSize)}`
      });
    }

    // Upload files to S3
    let uploadedCount = 0;
    let totalUploadedSize = 0;
    const uploadErrors = [];

    for (const file of filesResult.files) {
      try {
        // Skip files that shouldn't be uploaded
        if (!validation.isStaticAsset(file.path)) {
          uploadErrors.push(`Skipped: ${file.path} (not a static asset)`);
          continue;
        }

        // Upload to S3
        const uploadResult = await s3Service.uploadFile(
          id,
          file.path,
          file.content
        );

        if (uploadResult.success) {
          uploadedCount++;
          totalUploadedSize += file.size;

          // Record upload in database
          await Upload.create({
            siteId: id,
            userId: decoded.userId,
            type: 'git',
            filename: file.path,
            originalFilename: file.path,
            path: file.path,
            s3Key: uploadResult.path,
            size: file.size,
            mimeType: file.mimeType,
            status: 'completed',
            metadata: {
              repoUrl,
              branch,
              commit: cloneResult.repoInfo.latestCommit?.hash
            }
          });
        }
      } catch (uploadError) {
        uploadErrors.push(`Failed to upload ${file.path}: ${uploadError.message}`);
      }
    }

    // Update site quota and info
    if (uploadedCount > 0) {
      await Site.updateQuota(id, totalUploadedSize, uploadedCount);
      await Site.update(id, {
        gitUrl: repoUrl,
        gitBranch: branch,
        deploymentType: 'git'
      });
    }

    // Cleanup temp directory
    await gitCloneService.cleanupTemp(cloneResult.tempPath);

    res.status(200).json({
      success: true,
      message: `Repository cloned successfully. ${uploadedCount} files uploaded.`,
      stats: {
        filesUploaded: uploadedCount,
        totalSize: totalUploadedSize,
        errors: uploadErrors.length,
        repoInfo: cloneResult.repoInfo
      },
      warnings: staticCheck.warnings,
      errors: uploadErrors.length > 0 ? uploadErrors : undefined
    });

  } catch (error) {
    console.error('Git clone error:', error);
    
    // Cleanup on error
    if (error.tempPath) {
      await gitCloneService.cleanupTemp(error.tempPath).catch(() => {});
    }
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('not authorized')) {
      return res.status(403).json({ error: error.message });
    }

    if (error.message.includes('quota')) {
      return res.status(400).json({ error: error.message });
    }

    if (error.message.includes('Authentication failed') || 
        error.message.includes('Repository not found') ||
        error.message.includes('could not read')) {
      return res.status(400).json({ 
        error: 'Git repository error',
        details: error.message
      });
    }

    res.status(500).json({ 
      error: 'Failed to clone repository',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}