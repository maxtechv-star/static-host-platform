import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiGlobe,
  FiBarChart2,
  FiUpload,
  FiFolder,
  FiSettings,
  FiPlus,
  FiArrowUpRight,
  FiEye,
  FiCalendar,
  FiUsers,
  FiHardDrive,
  FiActivity,
  FiAlertCircle,
  FiRefreshCw,
  FiTrendingUp,
  FiClock,
  FiChevronRight,
  FiStar,
  FiZap
} from 'react-icons/fi';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
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

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalSites: 0,
    activeSites: 0,
    storageUsed: 0,
    totalVisitors: 0,
    bandwidthUsed: 0,
    storageLimit: 100 * 1024 * 1024, // 100MB default
    sitesLimit: 10
  });
  const [sites, setSites] = useState([]);
  const [analytics, setAnalytics] = useState({
    daily: [],
    monthly: [],
    topPages: [],
    referrers: []
  });
  const [loading, setLoading] = useState({
    user: true,
    stats: true,
    sites: true,
    analytics: true
  });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // Get user data
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Fetch dashboard data
    fetchDashboardData();
  }, [router]);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('token');
    
    try {
      // Fetch user stats
      const statsResponse = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
      
      // Fetch user sites
      const sitesResponse = await fetch('/api/sites', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (sitesResponse.ok) {
        const sitesData = await sitesResponse.json();
        setSites(sitesData.sites || []);
      }
      
      // Fetch analytics
      const analyticsResponse = await fetch('/api/analytics/summary', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading({
        user: false,
        stats: false,
        sites: false,
        analytics: false
      });
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getStoragePercentage = () => {
    return Math.min(100, (stats.storageUsed / stats.storageLimit) * 100);
  };

  const getSitesPercentage = () => {
    return Math.min(100, (stats.activeSites / stats.sitesLimit) * 100);
  };

  // Charts Data
  const visitorsChartData = {
    labels: analytics.daily.map(day => day.date.split('-').slice(1).join('/')) || Array(30).fill(''),
    datasets: [
      {
        label: 'Visitors',
        data: analytics.daily.map(day => day.uniqueVisitors) || Array(30).fill(0),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const bandwidthChartData = {
    labels: analytics.monthly.map(month => month.month.split('-')[1]) || Array(12).fill(''),
    datasets: [
      {
        label: 'Bandwidth (MB)',
        data: analytics.monthly.map(month => month.bandwidth / (1024 * 1024)) || Array(12).fill(0),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1
      }
    ]
  };

  const storageChartData = {
    labels: ['Used', 'Available'],
    datasets: [
      {
        data: [stats.storageUsed, Math.max(0, stats.storageLimit - stats.storageUsed)],
        backgroundColor: [
          'rgb(99, 102, 241)',
          'rgb(229, 231, 235)'
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
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          drawBorder: false
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  const QuickActions = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Link
        href="/dashboard/sites/create"
        className="bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-primary-900/20 dark:to-cyan-900/20 border-2 border-dashed border-primary-300 dark:border-primary-700 rounded-2xl p-6 text-center hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-200 group"
      >
        <div className="inline-flex p-3 rounded-xl bg-gradient-to-r from-primary-500 to-cyan-500 text-white mb-4 group-hover:scale-110 transition-transform duration-200">
          <FiPlus className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">New Site</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Upload static files</p>
      </Link>

      <Link
        href="/dashboard/sites"
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center hover:border-primary-300 dark:hover:border-primary-700 transition-colors group"
      >
        <div className="inline-flex p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 mb-4 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          <FiFolder className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">All Sites</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Manage your sites</p>
      </Link>

      <Link
        href="/dashboard/analytics"
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center hover:border-primary-300 dark:hover:border-primary-700 transition-colors group"
      >
        <div className="inline-flex p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 mb-4 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          <FiBarChart2 className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Analytics</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">View detailed stats</p>
      </Link>

      <Link
        href="/dashboard/settings"
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center hover:border-primary-300 dark:hover:border-primary-700 transition-colors group"
      >
        <div className="inline-flex p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 mb-4 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          <FiSettings className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Settings</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Account & preferences</p>
      </Link>
    </div>
  );

  const StatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Active Sites Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
            <FiGlobe className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {stats.activeSites} / {stats.sitesLimit}
          </span>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {loading.stats ? '...' : stats.activeSites}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Active Sites</p>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
            style={{ width: `${getSitesPercentage()}%` }}
          ></div>
        </div>
      </div>

      {/* Storage Used Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
            <FiHardDrive className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {formatBytes(stats.storageUsed)}
          </span>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {loading.stats ? '...' : getStoragePercentage().toFixed(1)}%
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Storage Used</p>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              getStoragePercentage() > 90 ? 'bg-gradient-to-r from-red-500 to-pink-500' :
              getStoragePercentage() > 75 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
              'bg-gradient-to-r from-green-500 to-emerald-500'
            }`}
            style={{ width: `${getStoragePercentage()}%` }}
          ></div>
        </div>
      </div>

      {/* Total Visitors Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
            <FiUsers className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Last 30 days
          </span>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {loading.analytics ? '...' : formatNumber(stats.totalVisitors)}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Total Visitors</p>
        <div className="flex items-center text-sm">
          <FiTrendingUp className="w-4 h-4 text-green-500 mr-1" />
          <span className="text-green-600 dark:text-green-400 font-medium">+12.5%</span>
          <span className="text-gray-500 dark:text-gray-400 ml-2">from last month</span>
        </div>
      </div>

      {/* Bandwidth Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
            <FiActivity className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            This month
          </span>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {loading.stats ? '...' : formatBytes(stats.bandwidthUsed)}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Bandwidth Used</p>
        <div className="flex items-center text-sm">
          <FiClock className="w-4 h-4 text-blue-500 mr-1" />
          <span className="text-blue-600 dark:text-blue-400 font-medium">On track</span>
          <span className="text-gray-500 dark:text-gray-400 ml-2">for monthly limit</span>
        </div>
      </div>
    </div>
  );

  const RecentSites = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Sites</h2>
        <Link
          href="/dashboard/sites"
          className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
        >
          View all
          <FiChevronRight className="w-4 h-4" />
        </Link>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Site Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Visitors
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Storage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading.sites ? (
              Array(3).fill(0).map((_, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
                  </td>
                </tr>
              ))
            ) : sites.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <div className="text-gray-500 dark:text-gray-400">
                    <FiFolder className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No sites yet</p>
                    <p className="mb-6">Create your first site to get started</p>
                    <Link
                      href="/dashboard/sites/create"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <FiPlus className="w-4 h-4" />
                      Create Site
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              sites.slice(0, 5).map((site) => (
                <tr key={site._id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-primary-100 to-cyan-100 dark:from-primary-900/20 dark:to-cyan-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400">
                        <FiGlobe className="w-5 h-5" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {site.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {site.publicUrl ? (
                            <a 
                              href={site.publicUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1"
                            >
                              {new URL(site.publicUrl).hostname}
                              <FiArrowUpRight className="w-3 h-3" />
                            </a>
                          ) : (
                            'No URL yet'
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      site.status === 'active' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                        : site.status === 'pending'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }`}>
                      {site.status.charAt(0).toUpperCase() + site.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {site.analytics?.totalHits ? formatNumber(site.analytics.totalHits) : '0'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {formatBytes(site.quotaUsed || 0)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {site.updatedAt ? new Date(site.updatedAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/sites/${site._id}`}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 transition-colors p-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg"
                        title="View site"
                      >
                        <FiEye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/dashboard/sites/${site._id}/analytics`}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        title="Analytics"
                      >
                        <FiBarChart2 className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/dashboard/sites/${site._id}/settings`}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        title="Settings"
                      >
                        <FiSettings className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const AnalyticsCharts = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Visitors Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Visitor Traffic</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Last 30 days</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-primary-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Visitors</span>
            </div>
          </div>
        </div>
        <div className="h-64">
          <Line 
            data={visitorsChartData} 
            options={{
              ...chartsOptions,
              plugins: {
                ...chartsOptions.plugins,
                legend: { display: false }
              }
            }} 
          />
        </div>
      </div>

      {/* Bandwidth & Storage Charts */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bandwidth Usage</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Last 12 months</p>
            </div>
          </div>
          <div className="h-48">
            <Bar 
              data={bandwidthChartData} 
              options={{
                ...chartsOptions,
                scales: {
                  ...chartsOptions.scales,
                  y: {
                    ...chartsOptions.scales.y,
                    ticks: {
                      callback: function(value) {
                        return value + ' MB';
                      }
                    }
                  }
                }
              }} 
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Storage Overview</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total: {formatBytes(stats.storageLimit)}</p>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatBytes(stats.storageUsed)}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-32 h-32">
              <Doughnut 
                data={storageChartData} 
                options={{
                  responsive: true,
                  cutout: '70%',
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const value = context.raw;
                          const total = context.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = Math.round((value / total) * 100);
                          return `${formatBytes(value)} (${percentage}%)`;
                        }
                      }
                    }
                  }
                }} 
              />
            </div>
            <div className="flex-1">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Used</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatBytes(stats.storageUsed)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary-500 to-cyan-500"
                      style={{ width: `${getStoragePercentage()}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Available</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatBytes(Math.max(0, stats.storageLimit - stats.storageUsed))}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gray-300 dark:bg-gray-600"
                      style={{ width: `${100 - getStoragePercentage()}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              {getStoragePercentage() > 80 && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <FiAlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-300">
                      <p className="font-medium">Storage running low</p>
                      <p>Consider deleting unused files or upgrading your plan.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const QuickTips = () => (
    <div className="bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-primary-900/10 dark:to-cyan-900/10 rounded-2xl border border-primary-200 dark:border-primary-800 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-r from-primary-500 to-cyan-500 text-white">
          <FiZap className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Tips</h3>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <FiStar className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Need more storage?</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              StaticHost is completely free! If you need more resources, consider optimizing your files or creating multiple accounts.
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <FiUpload className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Upload methods</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You can upload via ZIP files, Git repositories, or drag-and-drop. No build steps required!
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <FiAlertCircle className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Platform status</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This is a free platform maintained by <strong>VeronDev</strong>. For issues or suggestions, visit the GitHub repository.
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t border-primary-200 dark:border-primary-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Need help?</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Check our documentation or contact support</p>
          </div>
          <a
            href="https://github.com/VeronDev/static-host-platform"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors text-sm font-medium"
          >
            GitHub
          </a>
        </div>
      </div>
    </div>
  );

  if (loading.user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-primary-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard - StaticHost</title>
        <meta name="description" content="Your StaticHost dashboard - manage your static sites, view analytics, and monitor usage." />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/" className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary-600 to-cyan-600 flex items-center justify-center">
                    <span className="text-white font-bold">S</span>
                  </div>
                  StaticHost
                </Link>
                <div className="ml-10 flex items-baseline space-x-4">
                  <span className="px-3 py-2 rounded-md text-sm font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                    Dashboard
                  </span>
                  <Link
                    href="/dashboard/sites"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Sites
                  </Link>
                  <Link
                    href="/dashboard/analytics"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Analytics
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Settings
                  </Link>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={fetchDashboardData}
                  disabled={Object.values(loading).some(l => l)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh data"
                >
                  <FiRefreshCw className={`w-5 h-5 ${Object.values(loading).some(l => l) ? 'animate-spin' : ''}`} />
                </button>
                
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || 'User'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email || ''}</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary-500 to-cyan-500 flex items-center justify-center text-white font-medium">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Banner */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {user?.name?.split(' ')[0] || 'there'}! 👋
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Here's what's happening with your static sites today.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <QuickActions />
          </div>

          {/* Stats Cards */}
          <div className="mb-8">
            <StatsCards />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Charts */}
            <div className="lg:col-span-2 space-y-8">
              {/* Analytics Charts */}
              <div>
                <AnalyticsCharts />
              </div>

              {/* Recent Sites */}
              <div>
                <RecentSites />
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-8">
              {/* Quick Tips */}
              <QuickTips />

              {/* Platform Status */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Platform Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">System Status</span>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      Operational
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">API Response</span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">~120ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Uptime</span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">99.9%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Active Users</span>
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400">1,247 online</span>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    Platform by <strong>VeronDev</strong> • Free & Open Source
                  </p>
                </div>
              </div>

              {/* Storage Alert */}
              {getStoragePercentage() > 80 && (
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 rounded-2xl border border-yellow-200 dark:border-yellow-800 p-6">
                  <div className="flex items-start gap-3">
                    <FiAlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">Storage Alert</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-4">
                        You've used {getStoragePercentage().toFixed(1)}% of your storage. Consider deleting unused files.
                      </p>
                      <Link
                        href="/dashboard/sites"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                      >
                        Manage Files
                        <FiChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-12 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <p>© {new Date().getFullYear()} StaticHost. Free platform by <strong>VeronDev</strong>.</p>
                <p className="mt-1">All features included at no cost.</p>
              </div>
              <div className="flex items-center gap-6">
                <a
                  href="https://github.com/VeronDev/static-host-platform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  GitHub
                </a>
                <Link
                  href="/terms"
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Terms
                </Link>
                <Link
                  href="/privacy"
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Privacy
                </Link>
                <button
                  onClick={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    router.push('/auth/login');
                  }}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}