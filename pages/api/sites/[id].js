const { ObjectId } = require('mongodb');
const AuthService = require('../../../lib/auth');
const Site = require('../../../models/Site');
const s3Service = require('../../../lib/s3');

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

  try {
    const site = await Site.findById(id, { populateOwner: true });
    
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Check ownership (unless admin)
    if (!decoded.roles.includes('admin') && site.ownerId.toString() !== decoded.userId) {
      return res.status(403).json({ error: 'Not authorized to access this site' });
    }

    if (req.method === 'GET') {
      // Get site details
      const stats = await Site.getStats(id);
      
      res.status(200).json({
        success: true,
        site: {
          ...site,
          owner: {
            _id: site.owner?._id,
            email: site.owner?.email,
            name: site.owner?.name
          }
        },
        stats
      });

    } else if (req.method === 'PUT') {
      // Update site
      const { name, description, settings } = req.body;

      // Validate site name if provided
      if (name) {
        const validation = require('../../../lib/validation');
        const nameValidation = validation.validateSiteName(name);
        if (!nameValidation.valid) {
          return res.status(400).json({ error: nameValidation.errors[0] });
        }
      }

      const updates = {};
      if (name) updates.name = name.trim();
      if (description !== undefined) updates.description = description.trim();
      if (settings) updates.settings = { ...site.settings, ...settings };

      const updated = await Site.update(id, updates);

      if (!updated) {
        return res.status(400).json({ error: 'Failed to update site' });
      }

      res.status(200).json({
        success: true,
        message: 'Site updated successfully'
      });

    } else if (req.method === 'DELETE') {
      // Delete site (soft delete)
      const confirmed = req.query.confirm === 'true';
      
      if (!confirmed) {
        return res.status(400).json({ 
          error: 'Confirmation required. Add ?confirm=true to delete.' 
        });
      }

      // Check if site has files
      const hasFiles = site.quotaUsed > 0;

      if (hasFiles) {
        // Delete files from S3
        try {
          await s3Service.deleteSiteFiles(id);
        } catch (s3Error) {
          console.error('Failed to delete S3 files:', s3Error);
          // Continue with soft delete even if S3 fails
        }
      }

      // Soft delete site
      const deleted = await Site.delete(id);

      if (!deleted) {
        return res.status(400).json({ error: 'Failed to delete site' });
      }

      res.status(200).json({
        success: true,
        message: 'Site deleted successfully'
      });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Site API error:', error);
    
    if (error.message.includes('not authorized')) {
      return res.status(403).json({ error: error.message });
    }

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
}