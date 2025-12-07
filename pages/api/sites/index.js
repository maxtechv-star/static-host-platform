const { ObjectId } = require('mongodb');
const AuthService = require('../../../lib/auth');
const Site = require('../../../models/Site');
const User = require('../../../models/User');
const validation = require('../../../lib/validation');

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

  try {
    if (req.method === 'GET') {
      // Get user's sites
      const { page = 1, limit = 20, status } = req.query;
      const sites = await Site.findByOwner(decoded.userId, {
        status,
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit)
      });

      // Get total count for pagination
      const total = await Site.count({ ownerId: new ObjectId(decoded.userId) });

      res.status(200).json({
        success: true,
        sites,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });

    } else if (req.method === 'POST') {
      // Create new site
      const { name, description } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({ error: 'Site name is required' });
      }

      // Validate site name
      const nameValidation = validation.validateSiteName(name);
      if (!nameValidation.valid) {
        return res.status(400).json({ error: nameValidation.errors[0] });
      }

      // Check user quota
      const user = await User.findById(decoded.userId);
      if (user.quota.usedSites >= user.quota.maxSites) {
        return res.status(400).json({ 
          error: `You have reached your site limit (${user.quota.maxSites}). Please upgrade your plan or delete unused sites.`
        });
      }

      // Create site
      const siteData = {
        ownerId: decoded.userId,
        name: name.trim(),
        description: description?.trim() || '',
        status: 'pending'
      };

      const site = await Site.create(siteData);

      // Return site info
      res.status(201).json({
        success: true,
        message: 'Site created successfully',
        site: {
          _id: site._id,
          name: site.name,
          slug: site.slug,
          status: site.status,
          createdAt: site.createdAt
        }
      });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Sites API error:', error);
    
    if (error.message.includes('quota') || error.message.includes('limit')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
}