import Analytics from '../../../../../models/Analytics';
import Site from '../../../../../models/Site';
import crypto from 'crypto';

export default async function handler(req, res) {
  const { method } = req;
  const { siteId } = req.query;

  if (!siteId) {
    return res.status(400).json({ error: 'Site ID is required' });
  }

  try {
    switch (method) {
      case 'GET':
      case 'POST':
        await handleHit(req, res, siteId);
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Analytics hit API error:', error);
    
    // For analytics, always return success even on error
    // to not break user sites
    if (method === 'GET') {
      // Return a 1x1 transparent GIF for image beacon
      res.setHeader('Content-Type', 'image/gif');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    } else {
      res.status(200).json({ success: true });
    }
  }
}

async function handleHit(req, res, siteId) {
  try {
    // Verify site exists and is active
    const site = await Site.findById(siteId);
    if (!site) {
      return sendBeaconResponse(res);
    }

    if (site.status !== 'active') {
      return sendBeaconResponse(res);
    }

    // Check if analytics are disabled for this site
    if (site.analytics && site.analytics.enabled === false) {
      return sendBeaconResponse(res);
    }

    // Extract data from request
    const ip = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.connection.remoteAddress || 
               'unknown';
    
    const userAgent = req.headers['user-agent'] || '';
    const referrer = req.headers['referer'] || req.headers['referrer'] || '';
    
    // Check for bot/spam
    const botDetection = Analytics.detectBot(userAgent);
    if (botDetection.isBot && site.analytics?.excludeAdmin !== false) {
      // Still log bot hits but mark them as bots
      // This helps distinguish between real traffic and bots
    }

    // Parse query parameters or body
    let hitData = {};
    
    if (req.method === 'GET') {
      // For image beacon (GET request with query params)
      hitData = {
        ...req.query,
        ip,
        userAgent,
        referrer
      };
    } else if (req.method === 'POST') {
      // For fetch/beacon (POST request with body)
      if (req.headers['content-type'] === 'application/json') {
        hitData = {
          ...req.body,
          ip,
          userAgent,
          referrer
        };
      } else if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
        // Parse form data
        const params = new URLSearchParams(req.body);
        hitData = Object.fromEntries(params);
        hitData.ip = ip;
        hitData.userAgent = userAgent;
        hitData.referrer = referrer;
      }
    }

    // Extract URL and path
    let url = hitData.url || '/';
    let path = hitData.path || '/';
    
    if (url.startsWith('http')) {
      try {
        const urlObj = new URL(url);
        path = urlObj.pathname + urlObj.search;
      } catch (e) {
        // Invalid URL, use as-is
      }
    }

    // Parse user agent for device/browser info
    const userAgentInfo = Analytics.parseUserAgent(userAgent);

    // Generate session ID if not provided
    const sessionId = hitData.sessionId || 
                     crypto.createHash('md5')
                       .update(ip + userAgent + Math.floor(Date.now() / (30 * 60 * 1000)))
                       .digest('hex');

    // Generate visitor ID if not provided
    const visitorId = hitData.visitorId || 
                     crypto.createHash('sha256')
                       .update(ip + userAgent)
                       .digest('hex')
                       .substring(0, 16);

    // Prepare analytics data
    const analyticsData = {
      siteId,
      sessionId,
      visitorId,
      ip: Analytics.hashIp(ip), // Hash IP for privacy
      userAgent,
      referrer: referrer,
      url,
      path,
      query: hitData.query || {},
      
      // Device/browser info
      browser: userAgentInfo.browser,
      browserVersion: '',
      os: userAgentInfo.os,
      device: userAgentInfo.device,
      deviceType: userAgentInfo.device,
      screenResolution: hitData.screenResolution || '',
      language: hitData.language || req.headers['accept-language']?.split(',')[0] || '',
      
      // Event data
      eventType: hitData.type || 'pageview',
      eventName: hitData.eventName || null,
      eventData: typeof hitData.eventData === 'string' ? 
                JSON.parse(hitData.eventData) : 
                hitData.eventData || {},
      
      // Session data
      sessionStart: hitData.sessionStart === 'true',
      sessionDuration: parseInt(hitData.sessionDuration) || 0,
      
      // Performance
      loadTime: parseInt(hitData.loadTime) || null,
      bandwidth: parseInt(hitData.bandwidth) || 0,
      
      // Bot detection
      isBot: botDetection.isBot,
      botName: botDetection.botName,
      
      // Timestamp
      ts: new Date(hitData.ts || Date.now())
    };

    // Create analytics record (async, don't wait for it)
    Analytics.create(analyticsData).catch(error => {
      console.error('Failed to save analytics:', error);
    });

    // Update site analytics counters (async)
    Site.updateAnalytics(siteId, 1, analyticsData.sessionStart ? 1 : 0)
      .catch(error => {
        console.error('Failed to update site analytics:', error);
      });

    // Send appropriate response
    return sendBeaconResponse(res);

  } catch (error) {
    console.error('Process hit error:', error);
    return sendBeaconResponse(res);
  }
}

function sendBeaconResponse(res) {
  const accepts = res.req.headers.accept || '';
  
  if (accepts.includes('image/gif') || res.req.method === 'GET') {
    // Return a 1x1 transparent GIF for image beacon
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  } else {
    // Return JSON response for fetch/beacon
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).json({ 
      success: true, 
      timestamp: new Date().toISOString() 
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};