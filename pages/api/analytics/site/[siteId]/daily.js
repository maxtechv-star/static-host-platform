import Analytics from '../../../../../models/Analytics';
import Site from '../../../../../models/Site';
import AuthService from '../../../../../lib/auth';

export default async function handler(req, res) {
  const { method } = req;
  const { siteId } = req.query;

  if (!siteId) {
    return res.status(400).json({ error: 'Site ID is required' });
  }

  try {
    switch (method) {
      case 'GET':
        await handleGet(req, res, siteId);
        break;

      default:
        res.setHeader('Allow', ['GET']);
        res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Analytics daily API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req, res, siteId) {
  try {
    // Verify site exists
    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Check authorization
    const authHeader = req.headers.authorization;
    let isAuthorized = false;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = AuthService.verifyToken(token);
      
      if (decoded) {
        // Check if user is site owner or admin
        if (decoded.userId === site.ownerId.toString() || 
            (decoded.roles && decoded.roles.includes('admin'))) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ 
        error: 'Unauthorized access to analytics' 
      });
    }

    // Get query parameters
    const { days = 30, groupBy = 'day' } = req.query;
    const daysInt = parseInt(days);

    if (daysInt < 1 || daysInt > 365) {
      return res.status(400).json({ 
        error: 'Days must be between 1 and 365' 
      });
    }

    let analyticsData;
    if (groupBy === 'month') {
      // Get monthly analytics
      analyticsData = await Analytics.getMonthlyAnalytics(siteId, Math.ceil(daysInt / 30));
    } else {
      // Get daily analytics (default)
      analyticsData = await Analytics.getDailyAnalytics(siteId, daysInt);
    }

    // Get additional statistics
    const summary = await Analytics.getDashboardSummary(siteId);
    const topPages = await Analytics.getTopPages(siteId, 10, daysInt);
    const referrers = await Analytics.getReferrers(siteId, 10, daysInt);
    const countries = await Analytics.getCountries(siteId, 10, daysInt);
    const devices = await Analytics.getDevices(siteId, daysInt);
    const browsers = await Analytics.getBrowsers(siteId, 5, daysInt);
    const activeVisitors = await Analytics.getActiveVisitors(siteId);
    const bandwidthUsage = await Analytics.getBandwidthUsage(siteId, daysInt);

    res.status(200).json({
      success: true,
      site: {
        _id: site._id,
        name: site.name,
        slug: site.slug,
        publicUrl: site.publicUrl,
        status: site.status
      },
      timeframe: {
        days: daysInt,
        groupBy,
        startDate: new Date(Date.now() - daysInt * 24 * 60 * 60 * 1000),
        endDate: new Date()
      },
      summary: {
        today: summary.today,
        yesterday: summary.yesterday,
        last7Days: summary.last7Days,
        allTime: summary.allTime
      },
      analytics: analyticsData,
      breakdowns: {
        topPages,
        referrers,
        countries,
        devices,
        browsers
      },
      realtime: {
        activeVisitors: activeVisitors.length,
        activeSessions: activeVisitors
      },
      bandwidth: bandwidthUsage
    });

  } catch (error) {
    console.error('Get daily analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
}

export const config = {
  api: {
    responseLimit: '10mb',
  },
};