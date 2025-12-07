import AuthService from '../../../lib/auth';
import AdminService from '../../../lib/admin';
import User from '../../../models/User';

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
      console.error('Admin users API error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}

// GET /api/admin/users - List all users
// GET /api/admin/users/:id - Get specific user
async function handleGet(req, res, userId) {
  try {
    if (userId) {
      // Get single user with detailed info
      const userData = await AdminService.getUserById(userId);
      if (!userData) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({
        success: true,
        user: userData.user,
        sites: userData.sites,
        stats: userData.stats
      });
    } else {
      // List all users with pagination
      const { page = 1, limit = 20, search = '' } = req.query;
      
      const result = await AdminService.getUsers(
        parseInt(page),
        parseInt(limit),
        search
      );

      res.status(200).json({
        success: true,
        ...result
      });
    }
  } catch (error) {
    console.error('Get users error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

// PUT /api/admin/users/:id - Update user
async function handlePut(req, res, userId) {
  try {
    const updates = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    // Validate allowed updates
    const allowedUpdates = [
      'name',
      'roles',
      'emailVerified',
      'quota.maxSites',
      'quota.maxStorage',
      'settings.emailNotifications',
      'settings.twoFactorEnabled'
    ];

    const invalidUpdates = Object.keys(updates).filter(key => 
      !allowedUpdates.includes(key) && 
      !key.startsWith('quota.') && 
      !key.startsWith('settings.')
    );

    if (invalidUpdates.length > 0) {
      return res.status(400).json({ 
        error: `Invalid update fields: ${invalidUpdates.join(', ')}` 
      });
    }

    // Update user
    const result = await AdminService.updateUser(userId, updates);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      updates
    });

  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('No valid updates')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to update user' });
  }
}

// DELETE /api/admin/users/:id - Delete user (soft delete)
async function handleDelete(req, res, userId) {
  try {
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get user before deletion for logging
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if admin is trying to delete themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user is platform owner (VeronDev)
    if (process.env.ADMIN_EMAILS?.includes(user.email)) {
      return res.status(403).json({ 
        error: 'Cannot delete platform owner account' 
      });
    }

    // Soft delete user
    const result = await AdminService.deleteUser(userId);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to delete user' });
  }
}

// Additional endpoint for bulk actions
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb'
    }
  }
};