// StaticHost Analytics Script v1.0
// Owner: VeronDev
// This script is injected into hosted sites to collect analytics

(function() {
    'use strict';
    
    // Configuration
    const CONFIG = {
        SCRIPT_VERSION: '1.0.0',
        BEACON_URL: window.location.origin.includes('localhost') 
            ? 'http://localhost:3000/api/hit' 
            : 'https://' + window.location.hostname.replace('your-domain', 'statichost') + '/api/hit',
        COLLECT_PAGEVIEWS: true,
        COLLECT_EVENTS: false,
        RESPECT_DNT: true,
        SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
        DEBUG: false
    };
    
    // State management
    const State = {
        siteId: null,
        sessionId: null,
        visitorId: null,
        pageviews: 0,
        lastActivity: Date.now(),
        initialized: false
    };
    
    // Generate unique IDs
    function generateId() {
        return 'visitor_' + Math.random().toString(36).substr(2, 9) + 
               '_' + Date.now().toString(36);
    }
    
    // Hash function for privacy (SHA-256 like but simpler for browser)
    function hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }
    
    // Get site ID from script tag
    function getSiteId() {
        const script = document.currentScript;
        if (!script) return null;
        
        // Try to get from data attribute
        if (script.getAttribute('data-site-id')) {
            return script.getAttribute('data-site-id');
        }
        
        // Try to get from src URL
        const src = script.src;
        const match = src.match(/siteId=([a-f0-9-]+)/i);
        return match ? match[1] : null;
    }
    
    // Get visitor fingerprint (privacy-focused)
    function getVisitorFingerprint() {
        const components = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            (new Date()).getTimezoneOffset(),
            !!navigator.cookieEnabled,
            !!navigator.doNotTrack
        ].join('|');
        
        return hashString(components);
    }
    
    // Send analytics data
    function sendBeacon(type, data = {}) {
        if (CONFIG.RESPECT_DNT && navigator.doNotTrack === '1') {
            log('Do Not Track enabled, skipping analytics');
            return;
        }
        
        if (!State.siteId) {
            log('Site ID not found, skipping analytics');
            return;
        }
        
        const payload = {
            siteId: State.siteId,
            visitorId: State.visitorId,
            sessionId: State.sessionId,
            type: type,
            url: window.location.pathname,
            referrer: document.referrer || 'direct',
            timestamp: Date.now(),
            ...data
        };
        
        // Use multiple methods for reliability
        const url = `${CONFIG.BEACON_URL}/${State.siteId}`;
        const params = new URLSearchParams(payload).toString();
        
        // Method 1: Navigator sendBeacon (most reliable)
        if (navigator.sendBeacon) {
            navigator.sendBeacon(url, params);
        }
        // Method 2: Image pixel (fallback)
        else {
            const img = new Image(1,1);
            img.src = `${url}.gif?${params}`;
            img.style.position = 'absolute';
            img.style.opacity = '0';
            document.body.appendChild(img);
            setTimeout(() => document.body.removeChild(img), 100);
        }
        
        // Method 3: Fetch with keepalive (modern browsers)
        if ('fetch' in window) {
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params,
                keepalive: true
            }).catch(() => {
                // Silent fail for analytics
            });
        }
        
        log(`Beacon sent: ${type}`, payload);
    }
    
    // Session management
    function checkSession() {
        const now = Date.now();
        const timeSinceLastActivity = now - State.lastActivity;
        
        if (timeSinceLastActivity > CONFIG.SESSION_TIMEOUT) {
            // New session
            State.sessionId = 'session_' + Date.now().toString(36);
            State.pageviews = 0;
            log('New session started');
        }
        
        State.lastActivity = now;
        
        // Store in sessionStorage
        try {
            sessionStorage.setItem('statichost_session', JSON.stringify({
                sessionId: State.sessionId,
                visitorId: State.visitorId,
                lastActivity: State.lastActivity
            }));
        } catch (e) {
            // Ignore storage errors
        }
    }
    
    // Track pageview
    function trackPageview() {
        if (!CONFIG.COLLECT_PAGEVIEWS || !State.initialized) return;
        
        checkSession();
        
        State.pageviews++;
        sendBeacon('pageview', {
            pageviews: State.pageviews,
            title: document.title,
            hostname: window.location.hostname
        });
    }
    
    // Track custom event
    function trackEvent(eventName, eventData = {}) {
        if (!State.initialized) return;
        
        sendBeacon('event', {
            eventName: eventName,
            eventData: JSON.stringify(eventData)
        });
    }
    
    // Debug logging
    function log(message, data = null) {
        if (!CONFIG.DEBUG) return;
        
        console.log(`[StaticHost Analytics] ${message}`, data || '');
    }
    
    // Initialize analytics
    function init() {
        if (State.initialized) return;
        
        // Get site ID
        State.siteId = getSiteId();
        if (!State.siteId) {
            log('Failed to initialize: No site ID found');
            return;
        }
        
        // Get or create visitor ID
        try {
            const stored = localStorage.getItem('statichost_visitor');
            if (stored) {
                const data = JSON.parse(stored);
                State.visitorId = data.visitorId;
            } else {
                State.visitorId = generateId();
                localStorage.setItem('statichost_visitor', JSON.stringify({
                    visitorId: State.visitorId,
                    firstVisit: Date.now()
                }));
            }
        } catch (e) {
            // Fallback to fingerprint if localStorage fails
            State.visitorId = getVisitorFingerprint();
        }
        
        // Get or create session
        try {
            const stored = sessionStorage.getItem('statichost_session');
            if (stored) {
                const data = JSON.parse(stored);
                State.sessionId = data.sessionId;
                State.lastActivity = data.lastActivity || Date.now();
            } else {
                State.sessionId = 'session_' + Date.now().toString(36);
                State.lastActivity = Date.now();
            }
        } catch (e) {
            State.sessionId = 'session_' + Date.now().toString(36);
            State.lastActivity = Date.now();
        }
        
        State.initialized = true;
        log('Analytics initialized', {
            siteId: State.siteId,
            visitorId: State.visitorId,
            sessionId: State.sessionId
        });
        
        // Track initial pageview
        setTimeout(trackPageview, 100);
        
        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                checkSession();
            }
        });
        
        // Track beforeunload for final beacon
        window.addEventListener('beforeunload', () => {
            sendBeacon('unload', {
                timeOnPage: Date.now() - State.lastActivity
            });
        });
    }
    
    // Public API
    window.StaticHostAnalytics = {
        // Methods
        trackPageview: trackPageview,
        trackEvent: trackEvent,
        
        // Configuration
        config: function(newConfig) {
            Object.assign(CONFIG, newConfig);
            log('Configuration updated', CONFIG);
        },
        
        // Debug
        debug: function(enable) {
            CONFIG.DEBUG = enable;
            log('Debug mode ' + (enable ? 'enabled' : 'disabled'));
        },
        
        // Get current state (for debugging)
        getState: function() {
            return {
                ...State,
                config: { ...CONFIG }
            };
        },
        
        // Manual initialization
        init: init,
        
        // Version
        version: CONFIG.SCRIPT_VERSION
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();

// Usage examples in HTML:
// 
// 1. Basic usage (site ID in data attribute):
// <script src="/analytics-script.js" data-site-id="YOUR_SITE_ID"></script>
//
// 2. With custom configuration:
// <script>
//   window.StaticHostAnalytics.config({
//     COLLECT_EVENTS: true,
//     DEBUG: true
//   });
// </script>
//
// 3. Track custom events:
// <button onclick="StaticHostAnalytics.trackEvent('button_click', {button: 'cta'})">
//   Click me
// </button>