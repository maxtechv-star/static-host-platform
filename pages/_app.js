import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import '../styles/globals.css';
import Layout from '../components/Layout';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Handle route changes with loading indicator
  useEffect(() => {
    const handleStart = () => setLoading(true);
    const handleComplete = () => setLoading(false);
    const handleError = () => setLoading(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleError);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleError);
    };
  }, [router]);

  // Check for authentication on protected routes
  useEffect(() => {
    const token = localStorage.getItem('token');
    const isProtectedRoute = router.pathname.startsWith('/dashboard') || 
                            router.pathname.startsWith('/admin');

    if (isProtectedRoute && !token) {
      router.push('/auth/login');
    }
  }, [router.pathname]);

  // Check for admin access on admin routes
  useEffect(() => {
    const checkAdminAccess = async () => {
      const token = localStorage.getItem('token');
      const isAdminRoute = router.pathname.startsWith('/admin');

      if (isAdminRoute && token) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const user = await response.json();
            if (!user.roles?.includes('admin')) {
              router.push('/dashboard');
            }
          } else {
            localStorage.removeItem('token');
            router.push('/auth/login');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          router.push('/auth/login');
        }
      }
    };

    checkAdminAccess();
  }, [router.pathname]);

  // Global error handler
  useEffect(() => {
    const handleError = (error) => {
      console.error('Global error:', error);
      // You could send this to an error tracking service
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        
        {/* PWA meta tags */}
        <meta name="application-name" content="StaticHost" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="StaticHost" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#4f46e5" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#4f46e5" />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-167x167.png" />

        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#4f46e5" />
        <link rel="shortcut icon" href="/favicon.ico" />

        {/* Open Graph */}
        <meta property="og:site_name" content="StaticHost" />
        <meta property="og:locale" content="en_US" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@VeronDev" />
        <meta name="twitter:creator" content="@VeronDev" />
      </Head>

      {/* Global loading indicator */}
      {loading && (
        <div className="fixed top-0 left-0 w-full h-1 z-50">
          <div className="h-full bg-primary-600 animate-pulse"></div>
        </div>
      )}

      {/* Toast notification container */}
      <div id="toast-container" className="fixed top-4 right-4 z-50 space-y-2"></div>

      {/* Modal container */}
      <div id="modal-container"></div>

      {/* Confirmation dialog container */}
      <div id="confirmation-container"></div>

      <Layout>
        <Component {...pageProps} />
      </Layout>

      {/* Global utility functions */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Global utility functions
            window.StaticHost = {
              // Show toast notification
              showToast: function(message, type = 'info', duration = 5000) {
                const container = document.getElementById('toast-container');
                if (!container) return;
                
                const toast = document.createElement('div');
                toast.className = \`p-4 rounded-lg shadow-lg transform transition-transform duration-300 translate-x-full \${
                  type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                  type === 'error' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                  type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' :
                  'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                }\`;
                
                toast.innerHTML = \`
                  <div class="flex items-center gap-3">
                    <div class="flex-shrink-0">
                      \${type === 'success' ? 
                        '<svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' :
                      type === 'error' ? 
                        '<svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' :
                      type === 'warning' ? 
                        '<svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.768 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>' :
                        '<svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
                      }
                    </div>
                    <div class="flex-1">
                      <p class="text-sm font-medium \${
                        type === 'success' ? 'text-green-800 dark:text-green-300' :
                        type === 'error' ? 'text-red-800 dark:text-red-300' :
                        type === 'warning' ? 'text-yellow-800 dark:text-yellow-300' :
                        'text-blue-800 dark:text-blue-300'
                      }">\${message}</p>
                    </div>
                    <button class="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" onclick="this.parentElement.parentElement.remove()">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                \`;
                
                container.appendChild(toast);
                
                // Animate in
                setTimeout(() => {
                  toast.style.transform = 'translateX(0)';
                }, 10);
                
                // Auto remove
                if (duration > 0) {
                  setTimeout(() => {
                    toast.style.transform = 'translateX(100%)';
                    setTimeout(() => {
                      if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                      }
                    }, 300);
                  }, duration);
                }
              },
              
              // Show confirmation dialog
              confirm: function(options) {
                return new Promise((resolve) => {
                  const container = document.getElementById('confirmation-container');
                  if (!container) return resolve(false);
                  
                  const dialog = document.createElement('div');
                  dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
                  
                  dialog.innerHTML = \`
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full transform transition-all duration-300 scale-95">
                      <div class="p-6">
                        <div class="flex items-center gap-3 mb-4">
                          <div class="p-2 rounded-lg \${
                            options.type === 'danger' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                            options.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
                            'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          }">
                            \${options.type === 'danger' ? 
                              '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.768 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>' :
                            options.type === 'warning' ? 
                              '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.768 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>' :
                              '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
                            }
                          </div>
                          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">\${options.title || 'Confirm Action'}</h3>
                        </div>
                        <p class="text-gray-600 dark:text-gray-400 mb-6">\${options.message}</p>
                        <div class="flex justify-end gap-3">
                          <button 
                            class="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            onclick="this.closest('.fixed').remove(); window.StaticHost._currentConfirmReject(false);"
                          >
                            \${options.cancelText || 'Cancel'}
                          </button>
                          <button 
                            class="px-4 py-2 \${
                              options.type === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                              options.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                              'bg-primary-600 hover:bg-primary-700'
                            } text-white font-medium rounded-lg transition-colors"
                            onclick="this.closest('.fixed').remove(); window.StaticHost._currentConfirmResolve(true);"
                          >
                            \${options.confirmText || 'Confirm'}
                          </button>
                        </div>
                      </div>
                    </div>
                  \`;
                  
                  container.appendChild(dialog);
                  
                  // Animate in
                  setTimeout(() => {
                    dialog.querySelector('.transform').classList.remove('scale-95');
                    dialog.querySelector('.transform').classList.add('scale-100');
                  }, 10);
                  
                  // Store promise resolvers
                  window.StaticHost._currentConfirmResolve = resolve;
                  window.StaticHost._currentConfirmReject = () => resolve(false);
                  
                  // Close on backdrop click
                  dialog.addEventListener('click', (e) => {
                    if (e.target === dialog) {
                      dialog.remove();
                      resolve(false);
                    }
                  });
                });
              },
              
              // Format bytes to human readable
              formatBytes: function(bytes, decimals = 2) {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const dm = decimals < 0 ? 0 : decimals;
                const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
              },
              
              // Format date
              formatDate: function(dateString, format = 'medium') {
                const date = new Date(dateString);
                const options = {
                  short: { year: 'numeric', month: 'short', day: 'numeric' },
                  medium: { year: 'numeric', month: 'long', day: 'numeric' },
                  long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
                  time: { hour: '2-digit', minute: '2-digit' },
                  datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                };
                return date.toLocaleDateString('en-US', options[format] || options.medium);
              },
              
              // Copy text to clipboard
              copyToClipboard: function(text) {
                if (navigator.clipboard && window.isSecureContext) {
                  return navigator.clipboard.writeText(text);
                } else {
                  const textArea = document.createElement('textarea');
                  textArea.value = text;
                  textArea.style.position = 'fixed';
                  textArea.style.left = '-999999px';
                  textArea.style.top = '-999999px';
                  document.body.appendChild(textArea);
                  textArea.focus();
                  textArea.select();
                  return new Promise((res, rej) => {
                    document.execCommand('copy') ? res() : rej();
                    textArea.remove();
                  });
                }
              },
              
              // Debounce function
              debounce: function(func, wait) {
                let timeout;
                return function executedFunction(...args) {
                  const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                  };
                  clearTimeout(timeout);
                  timeout = setTimeout(later, wait);
                };
              },
              
              // Throttle function
              throttle: function(func, limit) {
                let inThrottle;
                return function(...args) {
                  if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                  }
                };
              }
            };
            
            // Service Worker registration for PWA
            if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(error => {
                  console.error('Service Worker registration failed:', error);
                });
              });
            }
            
            // Online/offline detection
            window.addEventListener('online', () => {
              window.StaticHost.showToast('You are back online', 'success');
            });
            
            window.addEventListener('offline', () => {
              window.StaticHost.showToast('You are offline. Some features may not work.', 'warning', 0);
            });
          `
        }}
      />
    </>
  );
}

export default MyApp;