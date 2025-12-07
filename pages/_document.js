import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          {/* Preconnect to external domains */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="preconnect" href="https://cdn.jsdelivr.net" />
          <link rel="preconnect" href="https://*.s3.amazonaws.com" />
          
          {/* Fonts */}
          <link 
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" 
            rel="stylesheet" 
          />
          
          {/* Preload critical assets */}
          <link rel="preload" href="/analytics-script.js" as="script" />
          <link rel="preload" href="/beacon.gif" as="image" />
          
          {/* DNS prefetch for external domains */}
          <link rel="dns-prefetch" href="//github.com" />
          <link rel="dns-prefetch" href="//api.statichost.dev" />
          <link rel="dns-prefetch" href="//cdn.statichost.dev" />
          
          {/* Platform metadata */}
          <meta name="platform" content="StaticHost" />
          <meta name="platform-version" content="1.0.0" />
          <meta name="platform-owner" content="VeronDev" />
          <meta name="platform-repository" content="https://github.com/VeronDev/static-host-platform" />
          
          {/* Security headers */}
          <meta httpEquiv="Content-Security-Policy" content={`
            default-src 'self';
            script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://www.googletagmanager.com https://www.google-analytics.com;
            style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net;
            font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net;
            img-src 'self' data: blob: https:;
            connect-src 'self' https://api.statichost.dev https://cdn.statichost.dev https://www.google-analytics.com;
            frame-src 'self';
            media-src 'self';
            object-src 'none';
            base-uri 'self';
            form-action 'self';
          `.replace(/\s+/g, ' ')} />
          
          <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
          <meta httpEquiv="X-Frame-Options" content="DENY" />
          <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
          <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
          
          {/* Structured data for SEO */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebApplication",
                "name": "StaticHost",
                "description": "Free static site hosting platform by VeronDev. Host your HTML, CSS, and JavaScript sites with no build steps required.",
                "url": "https://statichost.dev",
                "applicationCategory": "DeveloperApplication",
                "operatingSystem": "Any",
                "author": {
                  "@type": "Person",
                  "name": "VeronDev",
                  "url": "https://github.com/VeronDev"
                },
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "USD"
                },
                "featureList": [
                  "Static file hosting",
                  "No build steps",
                  "Free hosting",
                  "Analytics tracking",
                  "Git integration",
                  "ZIP upload"
                ]
              })
            }}
          />
          
          {/* Additional structured data */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": "StaticHost Platform",
                "url": "https://statichost.dev",
                "logo": "https://statichost.dev/logo.png",
                "founder": {
                  "@type": "Person",
                  "name": "VeronDev",
                  "url": "https://github.com/VeronDev"
                },
                "sameAs": [
                  "https://github.com/VeronDev",
                  "https://github.com/VeronDev/static-host-platform"
                ]
              })
            }}
          />
        </Head>
        <body className="antialiased">
          {/* NoScript fallback */}
          <noscript>
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'white',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div>
                <h1 style={{ fontSize: '24px', marginBottom: '20px', color: '#111827' }}>
                  JavaScript is Required
                </h1>
                <p style={{ marginBottom: '20px', color: '#4b5563' }}>
                  StaticHost requires JavaScript to function properly. Please enable JavaScript in your browser settings.
                </p>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>
                  Platform by <strong>VeronDev</strong>
                </p>
              </div>
            </div>
          </noscript>
          
          {/* Main application */}
          <Main />
          <NextScript />
          
          {/* Performance monitoring */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Performance monitoring
                if ('performance' in window) {
                  window.addEventListener('load', () => {
                    setTimeout(() => {
                      const perfData = window.performance.getEntriesByType('navigation')[0];
                      if (perfData) {
                        const metrics = {
                          dns: perfData.domainLookupEnd - perfData.domainLookupStart,
                          tcp: perfData.connectEnd - perfData.connectStart,
                          ttfb: perfData.responseStart - perfData.requestStart,
                          download: perfData.responseEnd - perfData.responseStart,
                          domInteractive: perfData.domInteractive - perfData.responseEnd,
                          domComplete: perfData.domComplete - perfData.domInteractive,
                          load: perfData.loadEventEnd - perfData.loadEventStart,
                          total: perfData.loadEventEnd - perfData.startTime
                        };
                        
                        // Send to analytics if user is logged in
                        const token = localStorage.getItem('token');
                        if (token) {
                          fetch('/api/analytics/perf', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': 'Bearer ' + token
                            },
                            body: JSON.stringify({
                              url: window.location.pathname,
                              metrics: metrics,
                              userAgent: navigator.userAgent
                            })
                          }).catch(() => {});
                        }
                      }
                    }, 0);
                  });
                }
                
                // Error tracking
                window.addEventListener('error', (event) => {
                  const token = localStorage.getItem('token');
                  if (token) {
                    fetch('/api/analytics/error', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                      },
                      body: JSON.stringify({
                        message: event.message,
                        filename: event.filename,
                        lineno: event.lineno,
                        colno: event.colno,
                        url: window.location.href,
                        userAgent: navigator.userAgent
                      })
                    }).catch(() => {});
                  }
                });
                
                // Unhandled promise rejections
                window.addEventListener('unhandledrejection', (event) => {
                  const token = localStorage.getItem('token');
                  if (token) {
                    fetch('/api/analytics/error', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                      },
                      body: JSON.stringify({
                        message: event.reason?.message || 'Unhandled promise rejection',
                        stack: event.reason?.stack,
                        url: window.location.href,
                        type: 'promise'
                      })
                    }).catch(() => {});
                  }
                });
              `
            }}
          />
        </body>
      </Html>
    );
  }
}

export default MyDocument;