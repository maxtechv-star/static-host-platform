import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiBarChart2,
  FiUsers,
  FiEye,
  FiGlobe,
  FiClock,
  FiTrendingUp,
  FiTrendingDown,
  FiCalendar,
  FiMapPin,
  FiMonitor,
  FiSmartphone,
  FiTablet,
  FiFilter,
  FiDownload,
  FiRefreshCw,
  FiChevronLeft,
  FiExternalLink,
  FiInfo,
  FiActivity,
  FiPieChart,
  FiTarget,
  FiNavigation,
  FiMaximize2
} from 'react-icons/fi';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Analytics() {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState('30d'); // 7d, 30d, 90d, 1y
  const [selectedSite, setSelectedSite] = useState('all'); // 'all' or siteId
  const [sites, setSites] = useState([]);
  const [analytics, setAnalytics] = useState({
    summary: {
      totalVisitors: 0,
      totalPageviews: 0,
      avgDuration: 0,
      bounceRate: 0,
      previousVisitors: 0,
      previousPageviews: 0,
      previousDuration: 0,
      previousBounceRate: 0
    },
    daily: [],
    monthly: [],
    sources: [],
    countries: [],
    devices: [],
    browsers: [],
    pages: [],
    realtime: []
  });
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('overview'); // overview, sources, locations, devices, pages
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // Fetch analytics data
    fetchAnalyticsData();
    fetchUserSites();
  }, [router, timeRange, selectedSite]);

  const fetchUserSites = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch('/api/sites', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSites(data.sites || []);
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const fetchAnalyticsData = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);

    try {
      // Fetch summary
      const summaryUrl = selectedSite === 'all' 
        ? `/api/analytics/summary?range=${timeRange}`
        : `/api/analytics/site/${selectedSite}/summary?range=${timeRange}`;
      
      const summaryResponse = await fetch(summaryUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setAnalytics(prev => ({ ...prev, summary: summaryData }));
      }

      // Fetch daily data
      const dailyUrl = selectedSite === 'all'
        ? `/api/analytics/daily?range=${timeRange}`
        : `/api/analytics/site/${selectedSite}/daily?range=${timeRange}`;
      
      const dailyResponse = await fetch(dailyUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (dailyResponse.ok) {
        const dailyData = await dailyResponse.json();
        setAnalytics(prev => ({ ...prev, daily: dailyData }));
      }

      // Fetch sources
      const sourcesUrl = selectedSite === 'all'
        ? `/api/analytics/sources?range=${timeRange}`
        : `/api/analytics/site/${selectedSite}/sources?range=${timeRange}`;
      
      const sourcesResponse = await fetch(sourcesUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (sourcesResponse.ok) {
        const sourcesData = await sourcesResponse.json();
        setAnalytics(prev => ({ ...prev, sources: sourcesData }));
      }

      // Fetch other data points
      if (selectedSite !== 'all') {
        // Only fetch detailed analytics for single site
        const [countriesRes, devicesRes, browsersRes, pagesRes, realtimeRes] = await Promise.all([
          fetch(`/api/analytics/site/${selectedSite}/countries?range=${timeRange}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`/api/analytics/site/${selectedSite}/devices?range=${timeRange}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`/api/analytics/site/${selectedSite}/browsers?range=${timeRange}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`/api/analytics/site/${selectedSite}/pages?range=${timeRange}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`/api/analytics/site/${selectedSite}/realtime`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (countriesRes.ok) {
          setAnalytics(prev => ({ ...prev, countries: await countriesRes.json() }));
        }
        if (devicesRes.ok) {
          setAnalytics(prev => ({ ...prev, devices: await devicesRes.json() }));
        }
        if (browsersRes.ok) {
          setAnalytics(prev => ({ ...prev, browsers: await browsersRes.json() }));
        }
        if (pagesRes.ok) {
          setAnalytics(prev => ({ ...prev, pages: await pagesRes.json() }));
        }
        if (realtimeRes.ok) {
          setAnalytics(prev => ({ ...prev, realtime: await realtimeRes.json() }));
        }
      }

      // Fetch monthly data
      const monthlyResponse = await fetch(`/api/analytics/monthly?range=${timeRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (monthlyResponse.ok) {
        const monthlyData = await monthlyResponse.json();
        setAnalytics(prev => ({ ...prev, monthly: monthlyData }));
      }

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds < 0) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getPercentageChange = (current, previous) => {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const exportUrl = selectedSite === 'all'
        ? `/api/analytics/export?range=${timeRange}`
        : `/api/analytics/site/${selectedSite}/export?range=${timeRange}`;
      
      const response = await fetch(exportUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${selectedSite === 'all' ? 'all' : selectedSite}-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  // Charts Data
  const visitorsChartData = {
    labels: analytics.daily.slice(-30).map(day => {
      const date = new Date(day.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }) || Array(30).fill(''),
    datasets: [
      {
        label: 'Visitors',
        data: analytics.daily.slice(-30).map(day => day.uniqueVisitors) || Array(30).fill(0),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2
      },
      {
        label: 'Pageviews',
        data: analytics.daily.slice(-30).map(day => day.pageviews) || Array(30).fill(0),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2
      }
    ]
  };

  const sourcesChartData = {
    labels: analytics.sources.slice(0, 5).map(source => {
      if (source.referrer === '' || source.referrer === 'direct') return 'Direct';
      if (source.referrer === 'organic') return 'Search';
      try {
        return new URL(source.referrer).hostname.replace('www.', '');
      } catch {
        return source.referrer;
      }
    }) || ['Direct', 'Search', 'Social', 'Referral', 'Other'],
    datasets: [
      {
        data: analytics.sources.slice(0, 5).map(source => source.visitors) || [40, 30, 15, 10, 5],
        backgroundColor: [
          'rgb(99, 102, 241)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
          'rgb(139, 92, 246)'
        ],
        borderWidth: 0
      }
    ]
  };

  const devicesChartData = {
    labels: analytics.devices.length > 0 ? analytics.devices.map(device => device.device) : ['Desktop', 'Mobile', 'Tablet'],
    datasets: [
      {
        data: analytics.devices.length > 0 ? analytics.devices.map(device => device.visitors) : [60, 30, 10],
        backgroundColor: [
          'rgb(99, 102, 241)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)'
        ],
        borderWidth: 0
      }
    ]
  };

  const countriesChartData = {
    labels: analytics.countries.slice(0, 8).map(country => country.country) || [],
    datasets: [
      {
        label: 'Visitors',
        data: analytics.countries.slice(0, 8).map(country => country.visitors) || [],
        backgroundColor: 'rgba(99, 102, 241, 0.6)',
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: 1
      }
    ]
  };

  const browsersChartData = {
    labels: analytics.browsers.slice(0, 5).map(browser => browser.browser) || ['Chrome', 'Firefox', 'Safari', 'Edge', 'Other'],
    datasets: [
      {
        data: analytics.browsers.slice(0, 5).map(browser => browser.visitors) || [65, 15, 10, 5, 5],
        backgroundColor: [
          'rgb(59, 130, 246)',
          'rgb(245, 158, 11)',
          'rgb(16, 185, 129)',
          'rgb(139, 92, 246)',
          'rgb(107, 114, 128)'
        ],
        borderWidth: 0
      }
    ]
  };

  const chartsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          boxWidth: 8
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 12 },
        bodyFont: { size: 12 },
        padding: 10
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          drawBorder: false,
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          padding: 10
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 0,
          padding: 10
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    animation: {
      duration: 750
    }
  };

  const StatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 text-blue-600 dark:text-blue-400">
            <FiUsers className="w-6 h-6" />
          </div>
          <div className={`flex items-center gap-1 text-sm font-medium ${
            getPercentageChange(analytics.summary.totalVisitors, analytics.summary.previousVisitors || 0) >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {getPercentageChange(analytics.summary.totalVisitors, analytics.summary.previousVisitors || 0) >= 0 ? (
              <FiTrendingUp className="w-4 h-4" />
            ) : (
              <FiTrendingDown className="w-4 h-4" />
            )}
            {Math.abs(getPercentageChange(analytics.summary.totalVisitors, analytics.summary.previousVisitors || 0))}%
          </div>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {loading ? '...' : formatNumber(analytics.summary.totalVisitors)}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">Total Visitors</p>
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          vs previous period: {formatNumber(analytics.summary.previousVisitors || 0)}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 text-green-600 dark:text-green-400">
            <FiEye className="w-6 h-6" />
          </div>
          <div className={`flex items-center gap-1 text-sm font-medium ${
            getPercentageChange(analytics.summary.totalPageviews, analytics.summary.previousPageviews || 0) >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {getPercentageChange(analytics.summary.totalPageviews, analytics.summary.previousPageviews || 0) >= 0 ? (
              <FiTrendingUp className="w-4 h-4" />
            ) : (
              <FiTrendingDown className="w-4 h-4" />
            )}
            {Math.abs(getPercentageChange(analytics.summary.totalPageviews, analytics.summary.previousPageviews || 0))}%
          </div>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {loading ? '...' : formatNumber(analytics.summary.totalPageviews)}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">Page Views</p>
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          vs previous period: {formatNumber(analytics.summary.previousPageviews || 0)}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 text-purple-600 dark:text-purple-400">
            <FiClock className="w-6 h-6" />
          </div>
          <div className={`flex items-center gap-1 text-sm font-medium ${
            getPercentageChange(analytics.summary.avgDuration, analytics.summary.previousDuration || 0) >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {getPercentageChange(analytics.summary.avgDuration, analytics.summary.previousDuration || 0) >= 0 ? (
              <FiTrendingUp className="w-4 h-4" />
            ) : (
              <FiTrendingDown className="w-4 h-4" />
            )}
            {Math.abs(getPercentageChange(analytics.summary.avgDuration, analytics.summary.previousDuration || 0))}%
          </div>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {loading ? '...' : formatDuration(analytics.summary.avgDuration || 0)}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">Avg. Duration</p>
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          vs previous period: {formatDuration(analytics.summary.previousDuration || 0)}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 text-orange-600 dark:text-orange-400">
            <FiBarChart2 className="w-6 h-6" />
          </div>
          <div className={`flex items-center gap-1 text-sm font-medium ${
            getPercentageChange(analytics.summary.bounceRate, analytics.summary.previousBounceRate || 0) <= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {getPercentageChange(analytics.summary.bounceRate, analytics.summary.previousBounceRate || 0) <= 0 ? (
              <FiTrendingDown className="w-4 h-4" />
            ) : (
              <FiTrendingUp className="w-4 h-4" />
            )}
            {Math.abs(getPercentageChange(analytics.summary.bounceRate, analytics.summary.previousBounceRate || 0))}%
          </div>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {loading ? '...' : (analytics.summary.bounceRate || 0).toFixed(1)}%
        </h3>
        <p className="text-gray-600 dark:text-gray-400">Bounce Rate</p>
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          vs previous period: {(analytics.summary.previousBounceRate || 0).toFixed(1)}%
        </div>
      </div>
    </div>
  );

  const VisitorsChart = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Visitor Traffic</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {timeRange === '7d' ? 'Last 7 days' : 
             timeRange === '30d' ? 'Last 30 days' :
             timeRange === '90d' ? 'Last 90 days' : 'Last year'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-primary-500"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Visitors</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Pageviews</span>
          </div>
        </div>
      </div>
      <div className="h-80">
        <Line 
          data={visitorsChartData} 
          options={{
            ...chartsOptions,
            plugins: {
              ...chartsOptions.plugins,
              legend: {
                display: false
              }
            },
            scales: {
              ...chartsOptions.scales,
              y: {
                ...chartsOptions.scales.y,
                ticks: {
                  callback: function(value) {
                    return formatNumber(value);
                  }
                }
              }
            }
          }} 
        />
      </div>
    </div>
  );

  const TrafficSources = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Traffic Sources</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Where your visitors come from</p>
        </div>
        <FiGlobe className="w-5 h-5 text-gray-400" />
      </div>
      <div className="h-64">
        <Pie 
          data={sourcesChartData} 
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: {
                  padding: 15,
                  usePointStyle: true,
                  boxWidth: 8
                }
              }
            }
          }} 
        />
      </div>
      <div className="mt-6 space-y-3">
        {analytics.sources.slice(0, 5).map((source, index) => (
          <div key={index} className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{
                backgroundColor: sourcesChartData.datasets[0].backgroundColor[index]
              }}></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {source.referrer === '' || source.referrer === 'direct' ? 'Direct' : 
                 source.referrer === 'organic' ? 'Search' :
                 source.referrer.includes('google') ? 'Google' :
                 source.referrer.includes('facebook') ? 'Facebook' :
                 source.referrer.includes('twitter') ? 'Twitter' :
                 source.referrer.includes('linkedin') ? 'LinkedIn' :
                 (() => {
                   try {
                     return new URL(source.referrer).hostname.replace('www.', '').replace('.com', '');
                   } catch {
                     return source.referrer.length > 20 ? source.referrer.substring(0, 20) + '...' : source.referrer;
                   }
                 })()}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {source.visitors}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {((source.visitors / analytics.summary.totalVisitors) * 100 || 0).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const TopPages = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Pages</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Most visited pages on your site</p>
        </div>
        <FiNavigation className="w-5 h-5 text-gray-400" />
      </div>
      <div className="space-y-4">
        {analytics.pages.slice(0, 8).map((page, index) => (
          <div key={index} className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 p-3 rounded-lg transition-colors">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {page.path === '/' ? 'Homepage' : page.path}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {formatDuration(page.avgDuration || 0)} avg • {(page.bounceRate || 0).toFixed(1)}% bounce
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(page.visitors)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">visitors</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-primary-500"></div>
            </div>
          </div>
        ))}
        
        {analytics.pages.length === 0 && (
          <div className="text-center py-8">
            <FiTarget className="w-12 h-12 text-gray-400 mx-auto mb-4 opacity-50" />
            <p className="text-gray-500 dark:text-gray-400">No page data available yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Page analytics will appear after visitors start browsing</p>
          </div>
        )}
      </div>
    </div>
  );

  const DeviceAnalytics = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Device Distribution</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">How visitors access your site</p>
        </div>
        <div className="flex gap-2">
          <FiMonitor className="w-5 h-5 text-gray-400" />
          <FiSmartphone className="w-5 h-5 text-gray-400" />
          <FiTablet className="w-5 h-5 text-gray-400" />
        </div>
      </div>
      <div className="h-64">
        <Doughnut 
          data={devicesChartData} 
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
              legend: {
                position: 'right',
                labels: {
                  padding: 15,
                  usePointStyle: true,
                  boxWidth: 8
                }
              }
            }
          }} 
        />
      </div>
      <div className="mt-6 grid grid-cols-3 gap-4">
        {analytics.devices.map((device, index) => (
          <div key={index} className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {device.visitors}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {device.device}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {((device.visitors / analytics.summary.totalVisitors) * 100 || 0).toFixed(1)}%
            </div>
          </div>
        ))}
        
        {analytics.devices.length === 0 && (
          <div className="col-span-3 text-center py-4">
            <p className="text-gray-500 dark:text-gray-400">No device data available</p>
          </div>
        )}
      </div>
    </div>
  );

  const GeographicAnalytics = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Geographic Distribution</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Where your visitors are located</p>
        </div>
        <FiMapPin className="w-5 h-5 text-gray-400" />
      </div>
      <div className="h-64">
        <Bar 
          data={countriesChartData} 
          options={{
            ...chartsOptions,
            indexAxis: 'y',
            scales: {
              x: {
                beginAtZero: true,
                grid: {
                  drawBorder: false
                }
              },
              y: {
                grid: {
                  display: false
                }
              }
            }
          }} 
        />
      </div>
      <div className="mt-6 space-y-3">
        {analytics.countries.slice(0, 5).map((country, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">{getFlagEmoji(country.country)}</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">{country.country}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-32 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary-500 to-cyan-500"
                  style={{ 
                    width: `${(country.visitors / analytics.countries[0]?.visitors || 1) * 100}%` 
                  }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white min-w-12 text-right">
                {country.visitors}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const BrowserAnalytics = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Browser Usage</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Most popular browsers among visitors</p>
        </div>
        <FiActivity className="w-5 h-5 text-gray-400" />
      </div>
      <div className="h-64">
        <Pie 
          data={browsersChartData} 
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: {
                  padding: 15,
                  usePointStyle: true,
                  boxWidth: 8
                }
              }
            }
          }} 
        />
      </div>
      <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
        {analytics.browsers.slice(0, 5).map((browser, index) => (
          <div key={index} className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              {((browser.visitors / analytics.summary.totalVisitors) * 100 || 0).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {browser.browser}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const RealtimeVisitors = () => (
    <div className="bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-primary-900/10 dark:to-cyan-900/10 rounded-2xl border border-primary-200 dark:border-primary-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Real-time Visitors</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Active in the last 5 minutes</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full absolute top-0 left-0 animate-ping"></div>
          </div>
          <span className="text-sm font-medium text-green-600 dark:text-green-400">Live</span>
        </div>
      </div>
      
      {analytics.realtime.length > 0 ? (
        <div className="space-y-3">
          {analytics.realtime.slice(0, 5).map((visitor, index) => (
            <div key={index} className="flex items-center justify-between bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-cyan-500 flex items-center justify-center text-white text-xs font-medium">
                  {visitor.country ? getFlagEmoji(visitor.country) : '🌐'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {visitor.country || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {visitor.device} • {visitor.browser}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {Math.round(visitor.activeSeconds)}s
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {visitor.currentPage ? visitor.currentPage.substring(0, 20) + '...' : '/'}
                </p>
              </div>
            </div>
          ))}
          
          {analytics.realtime.length > 5 && (
            <div className="text-center pt-3 border-t border-primary-200 dark:border-primary-800">
              <p className="text-sm text-primary-600 dark:text-primary-400">
                +{analytics.realtime.length - 5} more visitors active
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <FiUsers className="w-12 h-12 text-primary-400 mx-auto mb-4 opacity-50" />
          <p className="text-primary-600 dark:text-primary-400 font-medium">No active visitors</p>
          <p className="text-sm text-primary-500 dark:text-primary-500/70 mt-2">
            Visitors will appear here when they're active on your site
          </p>
        </div>
      )}
      
      <div className="mt-6 text-center">
        <button
          onClick={fetchAnalyticsData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 rounded-lg border border-primary-200 dark:border-primary-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-sm font-medium"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </div>
  );

  const getFlagEmoji = (countryCode) => {
    if (!countryCode) return '🌐';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  };

  const TimeRangeSelector = () => (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setTimeRange('7d')}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          timeRange === '7d'
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        7 days
      </button>
      <button
        onClick={() => setTimeRange('30d')}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          timeRange === '30d'
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        30 days
      </button>
      <button
        onClick={() => setTimeRange('90d')}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          timeRange === '90d'
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        90 days
      </button>
      <button
        onClick={() => setTimeRange('1y')}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          timeRange === '1y'
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        1 year
      </button>
    </div>
  );

  const SiteSelector = () => (
    <div className="relative">
      <select
        value={selectedSite}
        onChange={(e) => setSelectedSite(e.target.value)}
        className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg pl-4 pr-10 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      >
        <option value="all">All Sites</option>
        {sites.map(site => (
          <option key={site._id} value={site._id}>
            {site.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
        <FiFilter className="w-4 h-4" />
      </div>
    </div>
  );

  const ViewSelector = () => (
    <div className="flex overflow-x-auto pb-2">
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {['overview', 'sources', 'locations', 'devices', 'pages'].map((view) => (
          <button
            key={view}
            onClick={() => setCurrentView(view)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              currentView === view
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );

  if (loading && !analytics.daily.length) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-primary-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Analytics - StaticHost</title>
        <meta name="description" content="View detailed analytics for your static sites. Track visitors, traffic sources, locations, and more." />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/dashboard" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mr-6">
                  <FiChevronLeft className="w-5 h-5" />
                  <span>Dashboard</span>
                </Link>
                <div className="flex items-baseline">
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Analytics
                  </h1>
                  <div className="ml-4 flex items-center gap-4">
                    <SiteSelector />
                    <TimeRangeSelector />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={handleExportData}
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <FiDownload className="w-4 h-4" />
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
                
                <button
                  onClick={fetchAnalyticsData}
                  disabled={loading}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh data"
                >
                  <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Overview */}
          <div className="mb-8">
            <StatsCards />
          </div>

          {/* View Selector */}
          <div className="mb-6">
            <ViewSelector />
          </div>

          {/* Current View Content */}
          {currentView === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <VisitorsChart />
                </div>
                <div>
                  <RealtimeVisitors />
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <TrafficSources />
                <DeviceAnalytics />
              </div>
            </div>
          )}

          {currentView === 'sources' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <TrafficSources />
                <BrowserAnalytics />
              </div>
              <TopPages />
            </div>
          )}

          {currentView === 'locations' && (
            <div className="space-y-8">
              <GeographicAnalytics />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <TrafficSources />
                <DeviceAnalytics />
              </div>
            </div>
          )}

          {currentView === 'devices' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <DeviceAnalytics />
                <BrowserAnalytics />
              </div>
              <TopPages />
            </div>
          )}

          {currentView === 'pages' && (
            <div className="space-y-8">
              <TopPages />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <TrafficSources />
                <DeviceAnalytics />
              </div>
            </div>
          )}

          {/* Analytics Help Section */}
          <div className="mt-12 bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-primary-900/10 dark:to-cyan-900/10 rounded-2xl border border-primary-200 dark:border-primary-800 p-6">
            <div className="flex items-start gap-4">
              <FiInfo className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Understanding Your Analytics</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Key Metrics</h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li>• <strong>Visitors:</strong> Unique users who visited your site</li>
                      <li>• <strong>Pageviews:</strong> Total number of pages viewed</li>
                      <li>• <strong>Avg. Duration:</strong> Average time spent on your site</li>
                      <li>• <strong>Bounce Rate:</strong> Percentage of single-page visits</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Privacy & Accuracy</h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li>• All IP addresses are hashed for privacy</li>
                      <li>• Bot traffic is automatically filtered out</li>
                      <li>• Data updates every 5 minutes</li>
                      <li>• No cookies required for tracking</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-primary-200 dark:border-primary-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Note:</strong> Analytics are collected via our privacy-focused JavaScript snippet. 
                    To track visitors on your site, add the tracking script from your site settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-12 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <p>© {new Date().getFullYear()} StaticHost Analytics. Free platform by <strong>VeronDev</strong>.</p>
                <p className="mt-1">Data retention: 90 days for detailed analytics, 1 year for aggregated data.</p>
              </div>
              <div className="flex items-center gap-6">
                <button
                  onClick={() => window.StaticHost?.showToast('Analytics data refreshed', 'success')}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  Refresh Data
                </button>
                <Link
                  href="/dashboard"
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}