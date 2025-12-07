import AuthService from '../../../lib/auth';
import AdminService from '../../../lib/admin';
import Site from '../../../models/Site';
import emailService from '../../../lib/email';

export default async function handler(req, res) {
  // Require admin authentication
  await AuthService.requireAdmin(req, res, async () => {
    try {
      const { method } = req;
      const { id } = req.query;

      switch (method) {
        case 'GET':
          await handleGet(req, res, id);
          break;

        case 'PUT':
          await handlePut(req, res, id);
          break;

        case 'DELETE':
          await handleDelete(req, res, id);
          break;

        default:
          res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
          res.status(405).json({ error: `Method ${method} not allowed` });
      }
    } catch (error) {
      console.error('Admin sites API error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}

// GET /api/admin/sites - List all sites
// GET /api/admin/sites/:id - Get specific site
async function handleGet(req, res, siteId) {
  try {
    if (siteId) {
      // Get single site with owner info
      const site = await Site.findById(siteId, { populateOwner: true });
      
      if (!site) {
        return res.status(404).json({ error: 'Site not found' });
      }

      // Get site statistics
      const stats = await Site.getStats(siteId);

      res.status(200).json({
        success: true,
        site,
        stats
      });
    } else {
      // List all sites with pagination and filters
      const { 
        page = 1, 
        limit = 20, 
        search = '',
        status,
        userId
      } = req.query;
      
      const filters = {};
      if (status) filters.status = status;
      if (userId) filters.userId = userId;
      if (search) filters.search = search;

      const result = await AdminService.getSites(
        parseInt(page),
        parseInt(limit),
        filters
      );

      res.status(200).json({
        success: true,
        ...result
      });
    }
  } catch (error) {
    console.error('Get sites error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to fetch sites' });
  }
}

// PUT /api/admin/sites/:id - Update site
async function handlePut(req, res, siteId) {
  try {
    const updates = req.body;

    if (!siteId) {
      return res.status(400).json({ error: 'Site ID is required' });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    // Get current site for logging
    const currentSite = await Site.findById(siteId);
    if (!currentSite) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Validate allowed updates
    const allowedUpdates = [
      'name',
      'status',
      'slug',
      'analytics.enabled',
      'analytics.excludeAdmin',
      'settings.customDomain'
    ];

    const invalidUpdates = Object.keys(updates).filter(key => 
      !allowedUpdates.includes(key) && 
      !key.startsWith('analytics.') && 
      !key.startsWith('settings.')
    );

    if (invalidUpdates.length > 0) {
      return res.status(400).json({ 
        error: `Invalid update fields: ${invalidUpdates.join(', ')}` 
      });
    }

    // Special handling for status changes
    if (updates.status && updates.status !== currentSite.status) {
      // Validate status transition
      const validStatuses = ['pending', 'active', 'suspended', 'inactive', 'deleted'];
      if (!validStatuses.includes(updates.status)) {
        return res.status(400).json({ 
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }

      // If activating a site, ensure it has files
      if (updates.status === 'active') {
        const siteStats = await Site.getStats(siteId);
        if (siteStats.storage.files === 0) {
          return res.status(400).json({ 
            error: 'Cannot activate site with no files' 
          });
        }
      }

      // If suspending a site, require reason
      if (updates.status === 'suspended' && !updates.suspensionReason) {
        return res.status(400).json({ 
          error: 'Suspension reason is required' 
        });
      }
    }

    // Update site
    const result = await AdminService.updateSite(siteId, updates);

    // If status changed to active, send activation email
    if (updates.status === 'active' && currentSite.status !== 'active') {
      try {
        // Get site owner email
        const User = require('../../../models/User');
        const owner = await User.findById(currentSite.ownerId);
        
        if (owner && owner.email) {
          await emailService.sendSiteActivationEmail(
            owner.email,
            owner.name,
            currentSite.name,
            currentSite.publicUrl || `${process.env.APP_URL}/s/${currentSite.slug}`
          );
        }
      } catch (emailError) {
        console.error('Failed to send activation email:', emailError);
        // Continue even if email fails
      }
    }

    res.status(200).json({
      success: true,
      message: 'Site updated successfully',
      updates
    });

  } catch (error) {
    console.error('Update site error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('Invalid') || error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to update site' });
  }
}

// DELETE /api/admin/sites/:id - Delete site (soft delete)
async function handleDelete(req, res, siteId) {
  try {
    if (!siteId) {
      return res.status(400).json({ error: 'Site ID is required' });
    }

    // Get site before deletion
    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Soft delete site
    const result = await AdminService.deleteSite(siteId);

    res.status(200).json({
      success: true,
      message: 'Site deleted successfully'
    });

  } catch (error) {
    console.error('Delete site error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to delete site' });
  }
}

// Additional endpoint for bulk site operations
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb'
    }
  }
};