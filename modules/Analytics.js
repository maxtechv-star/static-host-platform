const { ObjectId } = require('mongodb');
const crypto = require('crypto');
const db = require('../lib/db');

class Analytics {
    // Create analytics hit
    static async create(hitData) {
        const collection = await db.getCollection('analytics');
        
        // Generate hash for IP address (privacy)
        const ipHash = hitData.ip ? 
            crypto.createHash('sha256').update(hitData.ip).digest('hex') : 
            null;
        
        const hit = {
            siteId: hitData.siteId.toString(),
            sessionId: hitData.sessionId || null,
            visitorId: hitData.visitorId || null,
            
            // Request data
            ipHash: ipHash,
            userAgent: hitData.userAgent || '',
            referrer: hitData.referrer || '',
            url: hitData.url || '/',
            path: hitData.path || '/',
            query: hitData.query || {},
            
            // Device/browser info
            browser: hitData.browser || '',
            browserVersion: hitData.browserVersion || '',
            os: hitData.os || '',
            device: hitData.device || '',
            deviceType: hitData.deviceType || 'desktop', // desktop, mobile, tablet, bot
            screenResolution: hitData.screenResolution || '',
            language: hitData.language || '',
            
            // Location (approximate from IP if available)
            country: hitData.country || null,
            region: hitData.region || null,
            city: hitData.city || null,
            
            // Event data
            eventType: hitData.eventType || 'pageview', // pageview, event, download, etc.
            eventName: hitData.eventName || null,
            eventData: hitData.eventData || {},
            
            // Session data
            sessionStart: hitData.sessionStart || false,
            sessionDuration: hitData.sessionDuration || 0,
            
            // Performance
            loadTime: hitData.loadTime || null,
            bandwidth: hitData.bandwidth || null,
            
            // Bot detection
            isBot: hitData.isBot || false,
            botName: hitData.botName || null,
            
            // Timestamp
            ts: hitData.ts || new Date(),
            date: hitData.ts ? new Date(hitData.ts).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        };
        
        const result = await collection.insertOne(hit);
        hit._id = result.insertedId;
        
        return hit;
    }
    
    // Get analytics for site
    static async getSiteAnalytics(siteId, period = '30d') {
        const collection = await db.getCollection('analytics');
        
        let startDate;
        const endDate = new Date();
        
        switch (period) {
            case '1d':
                startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        
        const pipeline = [
            { $match: { 
                siteId: siteId.toString(),
                ts: { $gte: startDate, $lte: endDate },
                isBot: { $ne: true }
            }},
            { 
                $group: {
                    _id: null,
                    totalHits: { $sum: 1 },
                    uniqueVisitors: { $addToSet: '$ipHash' },
                    pageviews: { 
                        $sum: { $cond: [{ $eq: ['$eventType', 'pageview'] }, 1, 0] }
                    },
                    events: { 
                        $sum: { $cond: [{ $eq: ['$eventType', 'event'] }, 1, 0] }
                    },
                    bandwidth: { $sum: '$bandwidth' },
                    avgLoadTime: { $avg: '$loadTime' }
                }
            },
            {
                $project: {
                    totalHits: 1,
                    uniqueVisitors: { $size: '$uniqueVisitors' },
                    pageviews: 1,
                    events: 1,
                    bandwidth: 1,
                    avgLoadTime: 1
                }
            }
        ];
        
        const result = await collection.aggregate(pipeline).toArray();
        
        return result[0] || {
            totalHits: 0,
            uniqueVisitors: 0,
            pageviews: 0,
            events: 0,
            bandwidth: 0,
            avgLoadTime: 0
        };
    }
    
    // Get daily analytics
    static async getDailyAnalytics(siteId, days = 30) {
        const collection = await db.getCollection('analytics');
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        const pipeline = [
            { $match: { 
                siteId: siteId.toString(),
                ts: { $gte: startDate },
                isBot: { $ne: true }
            }},
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$ts' } },
                    hits: { $sum: 1 },
                    uniqueVisitors: { $addToSet: '$ipHash' },
                    pageviews: { 
                        $sum: { $cond: [{ $eq: ['$eventType', 'pageview'] }, 1, 0] }
                    },
                    bandwidth: { $sum: '$bandwidth' }
                }
            },
            { $sort: { '_id': 1 } },
            {
                $project: {
                    date: '$_id',
                    hits: 1,
                    uniqueVisitors: { $size: '$uniqueVisitors' },
                    pageviews: 1,
                    bandwidth: 1
                }
            }
        ];
        
        return collection.aggregate(pipeline).toArray();
    }
    
    // Get monthly analytics
    static async getMonthlyAnalytics(siteId, months = 12) {
        const collection = await db.getCollection('analytics');
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);
        
        const pipeline = [
            { $match: { 
                siteId: siteId.toString(),
                ts: { $gte: startDate },
                isBot: { $ne: true }
            }},
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$ts' } },
                    hits: { $sum: 1 },
                    uniqueVisitors: { $addToSet: '$ipHash' },
                    pageviews: { 
                        $sum: { $cond: [{ $eq: ['$eventType', 'pageview'] }, 1, 0] }
                    },
                    bandwidth: { $sum: '$bandwidth' }
                }
            },
            { $sort: { '_id': 1 } },
            {
                $project: {
                    month: '$_id',
                    hits: 1,
                    uniqueVisitors: { $size: '$uniqueVisitors' },
                    pageviews: 1,
                    bandwidth: 1
                }
            }
        ];
        
        return collection.aggregate(pipeline).toArray();
    }
    
    // Get top pages
    static async getTopPages(siteId, limit = 10, days = 30) {
        const collection = await db.getCollection('analytics');
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        const pipeline = [
            { $match: { 
                siteId: siteId.toString(),
                ts: { $gte: startDate },
                eventType: 'pageview',
                isBot: { $ne: true }
            }},
            {
                $group: {
                    _id: '$path',
                    hits: { $sum: 1 },
                    uniqueVisitors: { $addToSet: '$ipHash' },
                    avgLoadTime: { $avg: '$loadTime' }
                }
            },
            { $sort: { hits: -1 } },
            { $limit: limit },
            {
                $project: {
                    path: '$_id',
                    hits: 1,
                    uniqueVisitors: { $size: '$uniqueVisitors' },
                    avgLoadTime: 1
                }
            }
        ];
        
        return collection.aggregate(pipeline).toArray();
    }
    
    // Get referrers
    static async getReferrers(siteId, limit = 10, days = 30) {
        const collection = await db.getCollection('analytics');
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        const pipeline = [
            { $match: { 
                siteId: siteId.toString(),
                ts: { $gte: startDate },
                referrer: { $ne: '', $ne: null },
                isBot: { $ne: true }
            }},
            {
                $group: {
                    _id: '$referrer',
                    hits: { $sum: 1 },
                    uniqueVisitors: { $addToSet: '$ipHash' }
                }
            },
            { $sort: { hits: -1 } },
            { $limit: limit },
            {
                $project: {
                    referrer: '$_id',
                    hits: 1,
                    uniqueVisitors: { $size: '$uniqueVisitors' }
                }
            }
        ];
        
        return collection.aggregate(pipeline).toArray();
    }
    
    // Get countries
    static async getCountries(siteId, limit = 10, days = 30) {
        const collection = await db.getCollection('analytics');
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        const pipeline = [
            { $match: { 
                siteId: siteId.toString(),
                ts: { $gte: startDate },
                country: { $ne: null },
                isBot: { $ne: true }
            }},
            {
                $group: {
                    _id: '$country',
                    hits: { $sum: 1 },
                    uniqueVisitors: { $addToSet: '$ipHash' }
                }
            },
            { $sort: { hits: -1 } },
            { $limit: limit },
            {
                $project: {
                    country: '$_id',
                    hits: 1,
                    uniqueVisitors: { $size: '$uniqueVisitors' }
                }
            }
        ];
        
        return collection.aggregate(pipeline).toArray();
    }
    
    // Get devices
    static async getDevices(siteId, days = 30) {
        const collection = await db.getCollection('analytics');
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        const pipeline = [
            { $match: { 
                siteId: siteId.toString(),
                ts: { $gte: startDate },
                isBot: { $ne: true }
            }},
            {
                $group: {
                    _id: '$deviceType',
                    hits: { $sum: 1 },
                    uniqueVisitors: { $addToSet: '$ipHash' }
                }
            },
            {
                $project: {
                    device: '$_id',
                    hits: 1,
                    uniqueVisitors: { $size: '$uniqueVisitors' },
                    percentage: { 
                        $multiply: [
                            { $divide: ['$hits', { $sum: '$hits' }] },
                            100
                        ]
                    }
                }
            }
        ];
        
        return collection.aggregate(pipeline).toArray();
    }
    
    // Get browsers
    static async getBrowsers(siteId, limit = 5, days = 30) {
        const collection = await db.getCollection('analytics');
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        const pipeline = [
            { $match: { 
                siteId: siteId.toString(),
                ts: { $gte: startDate },
                browser: { $ne: '' },
                isBot: { $ne: true }
            }},
            {
                $group: {
                    _id: '$browser',
                    hits: { $sum: 1 },
                    uniqueVisitors: { $addToSet: '$ipHash' }
                }
            },
            { $sort: { hits: -1 } },
            { $limit: limit },
            {
                $project: {
                    browser: '$_id',
                    hits: 1,
                    uniqueVisitors: { $size: '$uniqueVisitors' }
                }
            }
        ];
        
        return collection.aggregate(pipeline).toArray();
    }
    
    // Get real-time active visitors (last 5 minutes)
    static async getActiveVisitors(siteId) {
        const collection = await db.getCollection('analytics');
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        const pipeline = [
            { $match: { 
                siteId: siteId.toString(),
                ts: { $gte: fiveMinutesAgo },
                isBot: { $ne: true }
            }},
            {
                $group: {
                    _id: '$sessionId',
                    lastActivity: { $max: '$ts' },
                    pages: { $push: '$path' },
                    visitorId: { $first: '$visitorId' },
                    country: { $first: '$country' },
                    device: { $first: '$deviceType' }
                }
            },
            { $sort: { lastActivity: -1 } },
            {
                $project: {
                    sessionId: '$_id',
                    lastActivity: 1,
                    pageCount: { $size: '$pages' },
                    currentPage: { $arrayElemAt: ['$pages', -1] },
                    visitorId: 1,
                    country: 1,
                    device: 1,
                    activeSeconds: {
                        $divide: [
                            { $subtract: [new Date(), '$lastActivity'] },
                            1000
                        ]
                    }
                }
            }
        ];
        
        return collection.aggregate(pipeline).toArray();
    }
    
    // Get bandwidth usage
    static async getBandwidthUsage(siteId, days = 30) {
        const collection = await db.getCollection('analytics');
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        const pipeline = [
            { $match: { 
                siteId: siteId.toString(),
                ts: { $gte: startDate },
                bandwidth: { $gt: 0 }
            }},
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$ts' } },
                    bandwidth: { $sum: '$bandwidth' },
                    requests: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } },
            {
                $project: {
                    date: '$_id',
                    bandwidth: 1,
                    requests: 1,
                    bandwidthPerRequest: { $divide: ['$bandwidth', '$requests'] }
                }
            }
        ];
        
        return collection.aggregate(pipeline).toArray();
    }
    
    // Clean up old analytics (older than 90 days)
    static async cleanupOldData(days = 90) {
        const collection = await db.getCollection('analytics');
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        const result = await collection.deleteMany({
            ts: { $lt: cutoffDate }
        });
        
        return result.deletedCount;
    }
    
    // Count analytics
    static async count(filter = {}) {
        const collection = await db.getCollection('analytics');
        return collection.countDocuments(filter);
    }
    
    // Get summary for dashboard
    static async getDashboardSummary(siteId) {
        const collection = await db.getCollection('analytics');
        
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
        const lastWeekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const pipeline = [
            { $match: { siteId: siteId.toString(), isBot: { $ne: true } } },
            {
                $facet: {
                    today: [
                        { $match: { ts: { $gte: todayStart } } },
                        {
                            $group: {
                                _id: null,
                                hits: { $sum: 1 },
                                uniqueVisitors: { $addToSet: '$ipHash' }
                            }
                        }
                    ],
                    yesterday: [
                        { $match: { ts: { $gte: yesterdayStart, $lt: todayStart } } },
                        {
                            $group: {
                                _id: null,
                                hits: { $sum: 1 },
                                uniqueVisitors: { $addToSet: '$ipHash' }
                            }
                        }
                    ],
                    last7Days: [
                        { $match: { ts: { $gte: lastWeekStart } } },
                        {
                            $group: {
                                _id: null,
                                hits: { $sum: 1 },
                                uniqueVisitors: { $addToSet: '$ipHash' }
                            }
                        }
                    ],
                    allTime: [
                        {
                            $group: {
                                _id: null,
                                hits: { $sum: 1 },
                                uniqueVisitors: { $addToSet: '$ipHash' },
                                bandwidth: { $sum: '$bandwidth' },
                                avgLoadTime: { $avg: '$loadTime' }
                            }
                        }
                    ]
                }
            }
        ];
        
        const result = await collection.aggregate(pipeline).toArray();
        const data = result[0] || {};
        
        return {
            today: {
                hits: data.today?.[0]?.hits || 0,
                uniqueVisitors: data.today?.[0]?.uniqueVisitors?.length || 0
            },
            yesterday: {
                hits: data.yesterday?.[0]?.hits || 0,
                uniqueVisitors: data.yesterday?.[0]?.uniqueVisitors?.length || 0
            },
            last7Days: {
                hits: data.last7Days?.[0]?.hits || 0,
                uniqueVisitors: data.last7Days?.[0]?.uniqueVisitors?.length || 0
            },
            allTime: {
                hits: data.allTime?.[0]?.hits || 0,
                uniqueVisitors: data.allTime?.[0]?.uniqueVisitors?.length || 0,
                bandwidth: data.allTime?.[0]?.bandwidth || 0,
                avgLoadTime: data.allTime?.[0]?.avgLoadTime || 0
            }
        };
    }
    
    // Hash IP for privacy
    static hashIp(ip) {
        if (!ip) return null;
        return crypto.createHash('sha256').update(ip).digest('hex');
    }
    
    // Detect bot from user agent
    static detectBot(userAgent) {
        if (!userAgent) return { isBot: false, botName: null };
        
        const botPatterns = [
            { pattern: /googlebot/i, name: 'Googlebot' },
            { pattern: /bingbot/i, name: 'Bingbot' },
            { pattern: /slurp/i, name: 'Yahoo Slurp' },
            { pattern: /duckduckbot/i, name: 'DuckDuckGo' },
            { pattern: /baiduspider/i, name: 'Baiduspider' },
            { pattern: /yandexbot/i, name: 'YandexBot' },
            { pattern: /facebookexternalhit/i, name: 'Facebook' },
            { pattern: /twitterbot/i, name: 'Twitterbot' },
            { pattern: /rogerbot/i, name: 'Rogerbot' },
            { pattern: /linkedinbot/i, name: 'LinkedInBot' },
            { pattern: /embedly/i, name: 'Embedly' },
            { pattern: /quora link preview/i, name: 'Quora' },
            { pattern: /showyoubot/i, name: 'ShowYouBot' },
            { pattern: /outbrain/i, name: 'Outbrain' },
            { pattern: /pinterest/i, name: 'Pinterest' },
            { pattern: /developers.google.com/i, name: 'Google Developers' },
            { pattern: /slackbot/i, name: 'Slackbot' },
            { pattern: /applebot/i, name: 'Applebot' },
            { pattern: /whatsapp/i, name: 'WhatsApp' },
            { pattern: /flipboard/i, name: 'Flipboard' },
            { pattern: /tumblr/i, name: 'Tumblr' },
            { pattern: /bitlybot/i, name: 'Bitly' },
            { pattern: /skypeuripreview/i, name: 'Skype' },
            { pattern: /nuzzel/i, name: 'Nuzzel' },
            { pattern: /discordbot/i, name: 'Discord' },
            { pattern: /telegrambot/i, name: 'Telegram' },
            { pattern: /mj12bot/i, name: 'Majestic' },
            { pattern: /ahrefsbot/i, name: 'Ahrefs' },
            { pattern: /semrushbot/i, name: 'Semrush' },
            { pattern: /dotbot/i, name: 'Dotbot' },
            { pattern: /moz.com/i, name: 'Moz' }
        ];
        
        for (const bot of botPatterns) {
            if (bot.pattern.test(userAgent)) {
                return { isBot: true, botName: bot.name };
            }
        }
        
        return { isBot: false, botName: null };
    }
    
    // Parse user agent
    static parseUserAgent(userAgent) {
        if (!userAgent) return {};
        
        // Simple parsing - in production, use a library like ua-parser-js
        const ua = userAgent.toLowerCase();
        
        let browser = 'Unknown';
        let os = 'Unknown';
        let device = 'desktop';
        
        // Browser detection
        if (ua.includes('chrome') && !ua.includes('chromium')) {
            browser = 'Chrome';
        } else if (ua.includes('firefox')) {
            browser = 'Firefox';
        } else if (ua.includes('safari') && !ua.includes('chrome')) {
            browser = 'Safari';
        } else if (ua.includes('edge')) {
            browser = 'Edge';
        } else if (ua.includes('opera')) {
            browser = 'Opera';
        } else if (ua.includes('msie') || ua.includes('trident')) {
            browser = 'IE';
        }
        
        // OS detection
        if (ua.includes('windows')) {
            os = 'Windows';
        } else if (ua.includes('mac os') || ua.includes('macintosh')) {
            os = 'macOS';
        } else if (ua.includes('linux')) {
            os = 'Linux';
        } else if (ua.includes('android')) {
            os = 'Android';
            device = 'mobile';
        } else if (ua.includes('iphone') || ua.includes('ipad')) {
            os = 'iOS';
            device = ua.includes('ipad') ? 'tablet' : 'mobile';
        }
        
        // Device type
        if (ua.includes('mobile')) {
            device = 'mobile';
        } else if (ua.includes('tablet')) {
            device = 'tablet';
        }
        
        return { browser, os, device };
    }
}

module.exports = Analytics;