const { ObjectId } = require('mongodb');
const AuthService = require('../../../../lib/auth');
const Site = require('../../../../models/Site');
const s3Service = require('../../../../lib/s3');
const emailService = require('../../../../lib/email');
const validation = require('../../../../lib/validation');

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
    const site = await Site.findById(id, { populateOwner: true });
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    if (site.ownerId.toString() !== decoded.userId && !decoded.roles.includes('admin')) {
      return res.status(403).json({ error: 'Not authorized to activate this site' });
    }

    // Check if site already has files
    if (site.quotaUsed === 0) {
      return res.status(400).json({ 
        error: 'Site has no files. Please upload files before activating.' 
      });
    }

    // Check if index.html exists
    try {
      const indexContent = await s3Service.getFile(id, 'index.html');
      
      if (!indexContent) {
        // Check in common static folders
        const staticFolders = ['public', 'dist', 'build', 'out', '_site'];
        let foundIndex = false;
        
        for (const folder of staticFolders) {
          const folderIndex = await s3Service.getFile(id, `${folder}/index.html`);
          if (folderIndex) {
            foundIndex = true;
            break;
          }
        }

        if (!foundIndex) {
          return res.status(400).json({ 
            error: 'No index.html found. Please ensure your site has an index.html file in the root or in a public/ dist/ build/ folder.',
            suggestion: 'Upload a file named "index.html" or re-upload your ZIP/Git repository.'
          });
        }
      }
    } catch (s3Error) {
      console.error('Error checking index.html:', s3Error);
      // Continue activation even if we can't check
    }

    // Activate site
    const activated = await Site.activate(id);
    
    if (!activated) {
      return res.status(400).json({ error: 'Failed to activate site' });
    }

    // Generate public URL
    const cdnUrl = process.env.CDN_URL || process.env.APP_URL || 'https://your-domain.vercel.app';
    const publicUrl = `${cdnUrl}/s/${site.slug || id}`;

    // Update site with public URL
    await Site.update(id, { publicUrl });

    // Get updated site info
    const updatedSite = await Site.findById(id, { populateOwner: true });

    // Send activation email to user
    if (updatedSite.owner?.email) {
      try {
        await emailService.sendSiteActivationEmail(
          updatedSite.owner.email,
          updatedSite.owner.name,
          updatedSite.name,
          publicUrl
        );
      } catch (emailError) {
        console.error('Failed to send activation email:', emailError);
        // Continue even if email fails
      }
    }

    // Send admin notification
    try {
      await emailService.sendAdminNewSiteNotification(updatedSite, updatedSite.owner);
    } catch (adminEmailError) {
      console.error('Failed to send admin notification:', adminEmailError);
    }

    res.status(200).json({
      success: true,
      message: 'Site activated successfully',
      site: {
        _id: updatedSite._id,
        name: updatedSite.name,
        slug: updatedSite.slug,
        publicUrl,
        status: updatedSite.status,
        lastDeployed: updatedSite.lastDeployed
      }
    });

  } catch (error) {
    console.error('Activate site error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('not authorized')) {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to activate site' });
  }
}