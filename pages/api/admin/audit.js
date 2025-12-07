import AuthService from '../../../lib/auth';
import AdminService from '../../../lib/admin';

export default async function handler(req, res) {
  // Require admin authentication
  await AuthService.requireAdmin(req, res, async () => {
    try {
      const { method } = req;

      switch (method) {
        case 'GET':
          await handleGet(req, res);
          break;

        default:
          res.setHeader('Allow', ['GET']);
          res.status(405).json({ error: `Method ${method} not allowed` });
      }
    } catch (error) {
      console.error('Admin audit API error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}

// GET /api/admin/audit - Get audit logs
async function handleGet(req, res) {
  try {
    const { 
      page = 1, 
      limit = 50,
      adminId,
      userId,
      siteId,
      resource,
      action,
      startDate,
      endDate,
      search = ''
    } = req.query;

    const filters = {};
    if (adminId) filters.adminId = adminId;
    if (userId) filters.userId = userId;
    if (siteId) filters.siteId = siteId;
    if (resource) filters.resource = resource;
    if (action) filters.action = action;
    if (startDate || endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }
    if (search) {
      // Search will be handled by AdminService
    }

    const result = await AdminService.getAuditLogs(
      parseInt(page),
      parseInt(limit),
      filters
    );

    res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
}

// Additional endpoint for audit log statistics
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb'
    }
  }
};