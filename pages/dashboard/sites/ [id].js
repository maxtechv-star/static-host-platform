import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiGlobe,
  FiBarChart2,
  FiSettings,
  FiUpload,
  FiFolder,
  FiFileText,
  FiHardDrive,
  FiCalendar,
  FiUsers,
  FiEye,
  FiCopy,
  FiExternalLink,
  FiEdit,
  FiTrash2,
  FiPlay,
  FiPause,
  FiRefreshCw,
  FiChevronLeft,
  FiAlertCircle,
  FiCheck,
  FiX,
  FiClock,
  FiHash,
  FiCode,
  FiGitPullRequest,
  FiDownload
} from 'react-icons/fi';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
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
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function SiteDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [files, setFiles] = useState([]);
  const [analytics, setAnalytics] = useState({
    daily: [],
    monthly: [],
    topPages: [],
    referrers: []
  });
  const [uploadHistory, setUploadHistory] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deployType, setDeployType] = useState('zip');

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    if (id) {
      fetchSiteData();
    }
  }, [id, router]);

  const fetchSiteData = async () => {
    const token = localStorage.getItem('token');
    
    try {
      // Fetch site details
      const siteResponse = await fetch(`/api/sites/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (siteResponse.ok) {
        const siteData = await siteResponse.json();
        setSite(siteData);
      }

      // Fetch site files
      const filesResponse = await fetch(`/api/sites/${id}/files`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (filesResponse.ok) {
        const filesData = await filesResponse.json();
        setFiles(filesData.files || []);
      }

      // Fetch site analytics
      const analyticsResponse = await fetch(`/api/analytics/site/${id}/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData);
      }

      // Fetch upload history
      const historyResponse = await fetch(`/api/sites/${id}/uploads`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setUploadHistory(historyData.uploads || []);
      }
    } catch (error) {
      console.error('Error fetching site data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'green', label: 'Active', icon: FiCheck },
      pending: { color: 'yellow', label: 'Pending', icon: FiClock },
      suspended: { color: 'red', label: 'Suspended', icon: FiX },
      error: { color: 'red', label: 'Error', icon: FiAlertCircle },
      deleted: { color: 'gray', label: 'Deleted', icon: FiX }
    };

    const config = statusConfig[status] || { color: 'gray', label: status, icon: FiAlertCircle };
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-${config.color}-100 dark:bg-${config.color}-900/30 text-${config.color}-800 dark:text-${config.color}-300`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  const handleActivateSite = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`/api/sites/${id}/activate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchSiteData();
        if (window.StaticHost) {
          window.StaticHost.showToast('Site activated successfully', 'success');
        }
      }
    } catch (error) {
      console.error('Error activating site:', error);
      if (window.StaticHost) {
        window.StaticHost.showToast('Failed to activate site', 'error');
      }
    }
  };

  const handleDeactivateSite = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`/api/sites/${id}/deactivate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchSiteData();
        if (window.StaticHost) {
          window.StaticHost.showToast('Site deactivated successfully', 'success');
        }
      }
    } catch (error) {
      console.error('Error deactivating site:', error);
      if (window.StaticHost) {
        window.StaticHost.showToast('Failed to deactivate site', 'error');
      }
    }
  };

  const handleDeleteSite = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`/api/sites/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        if (window.StaticHost) {
          window.StaticHost.showToast('Site deleted successfully', 'success');
        }
        router.push('/dashboard/sites');
      }
    } catch (error) {
      console.error('Error deleting site:', error);
      if (window.StaticHost) {
        window.StaticHost.showToast('Failed to delete site', 'error');
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    if (window.StaticHost) {
      window.StaticHost.showToast('Copied to clipboard', 'success');
    }
  };

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Site Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
              <FiUsers className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.daily.reduce((sum, day) => sum + day.uniqueVisitors, 0).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Visitors (30d)</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
              <FiEye className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.daily.reduce((sum, day) => sum + day.pageviews, 0).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Pageviews (30d)</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
              <FiHardDrive className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatBytes(site?.quotaUsed || 0)}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Storage Used</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
              <FiHash className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {files.length}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Files</p>
        </div>
      </div>

      {/* Site Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Site Information</h3>
        </div>
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Site Name
                  </label>
                  <p className="text-gray-900 dark:text-white">{site?.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Site ID
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-300">
                      {site?._id}
                    </code>
                    <button
                      onClick={() => copyToClipboard(site?._id || '')}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      title="Copy ID"
                    >
                      <FiCopy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Created
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {site?.createdAt ? formatDate(site.createdAt) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Public URL
                  </label>
                  <div className="flex items-center gap-2">
                    {site?.publicUrl ? (
                      <>
                        <a
                          href={site.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                        >
                          {site.publicUrl}
                          <FiExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => copyToClipboard(site.publicUrl)}
                          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                          title="Copy URL"
                        >
                          <FiCopy className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">No URL yet</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Deployment Type
                  </label>
                  <p className="text-gray-900 dark:text-white capitalize">
                    {site?.deploymentType || 'Manual'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Deployed
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {site?.lastDeployed ? formatDate(site.lastDeployed) : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Visitor Analytics</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Last 30 days</p>
          </div>
        </div>
        <div className="h-64">
          <Line 
            data={{
              labels: analytics.daily.map(day => day.date.split('-').slice(1).join('/')),
              datasets: [
                {
                  label: 'Visitors',
                  data: analytics.daily.map(day => day.uniqueVisitors),
                  borderColor: 'rgb(99, 102, 241)',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  fill: true,
                  tension: 0.4
                },
                {
                  label: 'Pageviews',
                  data: analytics.daily.map(day => day.pageviews),
                  borderColor: 'rgb(16, 185, 129)',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  fill: true,
                  tension: 0.4
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top',
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
            }}
          />
        </div>
      </div>

      {/* Recent Uploads */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Uploads</h3>
          <Link
            href={`/dashboard/sites/${id}/files`}
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          >
            View all files
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  File
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {files.slice(0, 5).map((file, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FiFileText className="w-5 h-5 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-900 dark:text-white">{file.path}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatBytes(file.size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(file.uploadedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        const url = `${site.publicUrl}/${file.path}`;
                        window.open(url, '_blank');
                      }}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 mr-4"
                    >
                      View
                    </button>
                    <button
                      onClick={() => copyToClipboard(`${site.publicUrl}/${file.path}`)}
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                    >
                      Copy URL
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const FilesTab = () => (
    <div className="space-y-6">
      {/* File Browser */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">File Browser</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {files.length} files, {formatBytes(files.reduce((sum, file) => sum + file.size, 0))} total
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDeployModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <FiUpload className="w-4 h-4" />
              Upload Files
            </button>
            <button
              onClick={fetchSiteData}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Refresh"
            >
              <FiRefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Modified
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {files.map((file, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {file.path.endsWith('.html') ? (
                        <FiCode className="w-5 h-5 text-blue-500 mr-3" />
                      ) : file.path.endsWith('.css') ? (
                        <FiCode className="w-5 h-5 text-purple-500 mr-3" />
                      ) : file.path.endsWith('.js') ? (
                        <FiCode className="w-5 h-5 text-yellow-500 mr-3" />
                      ) : (
                        <FiFileText className="w-5 h-5 text-gray-400 mr-3" />
                      )}
                      <span className="text-sm text-gray-900 dark:text-white">{file.path}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatBytes(file.size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                      {file.path.split('.').pop() || 'file'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(file.uploadedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const url = `${site.publicUrl}/${file.path}`;
                          window.open(url, '_blank');
                        }}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                        title="View file"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => copyToClipboard(`${site.publicUrl}/${file.path}`)}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                        title="Copy URL"
                      >
                        <FiCopy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          // Download file
                          const url = `${site.publicUrl}/${file.path}`;
                          window.open(url, '_blank');
                        }}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                        title="Download"
                      >
                        <FiDownload className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Methods */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
              <FiUpload className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">ZIP Upload</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Upload a ZIP file containing your static site files. We'll extract and deploy them automatically.
          </p>
          <button
            onClick={() => {
              setDeployType('zip');
              setShowDeployModal(true);
            }}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            Upload ZIP
          </button>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-xl border border-purple-200 dark:border-purple-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <FiGitPullRequest className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Git Deploy</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Connect a Git repository. We'll automatically deploy when you push changes to your repository.
          </p>
          <button
            onClick={() => {
              setDeployType('git');
              setShowDeployModal(true);
            }}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
          >
            Connect Git
          </button>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-xl border border-green-200 dark:border-green-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <FiFolder className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manual Upload</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Upload individual files or drag and drop them directly. Perfect for quick updates and small changes.
          </p>
          <button
            onClick={() => {
              setDeployType('manual');
              setShowDeployModal(true);
            }}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-700 transition-colors"
          >
            Upload Files
          </button>
        </div>
      </div>
    </div>
  );

  const AnalyticsTab = () => (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {analytics.daily.reduce((sum, day) => sum + day.uniqueVisitors, 0).toLocaleString()}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Visitors (30d)</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {analytics.daily.reduce((sum, day) => sum + day.pageviews, 0).toLocaleString()}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Pageviews (30d)</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {(analytics.daily.reduce((sum, day) => sum + day.pageviews, 0) / 
              Math.max(analytics.daily.reduce((sum, day) => sum + day.uniqueVisitors, 0), 1)).toFixed(1)}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Pages per Visitor</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {formatBytes(analytics.monthly.reduce((sum, month) => sum + month.bandwidth, 0))}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Bandwidth (30d)</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Daily Traffic</h3>
          <div className="h-64">
            <Line 
              data={{
                labels: analytics.daily.map(day => day.date.split('-').slice(1).join('/')),
                datasets: [
                  {
                    label: 'Visitors',
                    data: analytics.daily.map(day => day.uniqueVisitors),
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, grid: { drawBorder: false } },
                  x: { grid: { display: false } }
                }
              }}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Pages</h3>
          <div className="space-y-3">
            {analytics.topPages.slice(0, 5).map((page, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm text-gray-900 dark:text-white truncate">{page.path}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {page.uniqueVisitors.toLocaleString()} visitors
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {page.hits.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Referrers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Referrers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Visitors
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pageviews
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {analytics.referrers.slice(0, 10).map((referrer, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white truncate max-w-xs">
                      {referrer.referrer === '' ? 'Direct' : referrer.referrer}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {referrer.uniqueVisitors.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {referrer.hits.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const SettingsTab = () => (
    <div className="space-y-6">
      {/* Site Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Site Settings</h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Site Name
            </label>
            <input
              type="text"
              defaultValue={site?.name}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Site Description
            </label>
            <textarea
              defaultValue={site?.description || ''}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Describe your site..."
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Analytics Tracking
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enable visitor tracking for this site
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Custom Domain (Coming Soon)
            </label>
            <input
              type="text"
              disabled
              placeholder="example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Custom domain support is coming in a future update.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            Save Changes
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
            <FiAlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Danger Zone</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Deactivate Site</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Temporarily take your site offline
              </p>
            </div>
            <button
              onClick={site?.status === 'active' ? handleDeactivateSite : handleActivateSite}
              className={`px-4 py-2 rounded-lg transition-colors ${
                site?.status === 'active'
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {site?.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Delete Site</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Permanently delete this site and all its files
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Site
            </button>
          </div>
        </div>
      </div>

      {/* Site Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Technical Information</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Site ID</span>
            <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-300">
              {site?._id}
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Storage Path</span>
            <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-300">
              {site?.storagePath}
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Created</span>
            <span className="text-sm text-gray-900 dark:text-white">{formatDate(site?.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Last Updated</span>
            <span className="text-sm text-gray-900 dark:text-white">{formatDate(site?.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-primary-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Loading site details...</p>
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Site Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">The site you're looking for doesn't exist or you don't have access to it.</p>
          <Link
            href="/dashboard/sites"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <FiChevronLeft className="w-5 h-5" />
            Back to Sites
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{site.name} - StaticHost</title>
        <meta name="description" content={`Manage ${site.name} on StaticHost`} />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link href="/dashboard/sites" className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  <FiChevronLeft className="w-5 h-5" />
                  Back to Sites
                </Link>
                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-100 to-cyan-100 dark:from-primary-900/20 dark:to-cyan-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400">
                    <FiGlobe className="w-4 h-4" />
                  </div>
                  <div>
                    <h1 className="font-semibold text-gray-900 dark:text-white">{site.name}</h1>
                    {site.publicUrl && (
                      <a
                        href={site.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                      >
                        {new URL(site.publicUrl).hostname}
                        <FiExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {getStatusBadge(site.status)}
                <button
                  onClick={fetchSiteData}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Refresh"
                >
                  <FiRefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiGlobe className="w-4 h-4" />
                  Overview
                </div>
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'files'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiFolder className="w-4 h-4" />
                  Files
                </div>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analytics'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiBarChart2 className="w-4 h-4" />
                  Analytics
                </div>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiSettings className="w-4 h-4" />
                  Settings
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'files' && <FilesTab />}
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <FiAlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Site</h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete <strong>{site.name}</strong>? This action cannot be undone. All site files and analytics data will be permanently deleted.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSite}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Site
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deploy Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-gradient-to-r from-primary-500 to-cyan-500 text-white">
                  <FiUpload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Deploy Files</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {deployType === 'zip' && 'Upload a ZIP file containing your static site'}
                    {deployType === 'git' && 'Connect a Git repository for automatic deployment'}
                    {deployType === 'manual' && 'Upload individual files to your site'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeployModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {deployType === 'zip' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
                  <FiUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Drag and drop your ZIP file here, or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".zip"
                    className="hidden"
                    id="zip-upload"
                  />
                  <label
                    htmlFor="zip-upload"
                    className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer"
                  >
                    Select ZIP File
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                    Maximum file size: 100MB. File must contain an index.html in the root.
                  </p>
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FiAlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">Important</p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        StaticHost does not run build steps. Upload pre-built static files only. If your ZIP contains package.json with build scripts, it will be rejected.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {deployType === 'git' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Git Repository URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://github.com/username/repository.git"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Branch
                  </label>
                  <input
                    type="text"
                    defaultValue="main"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FiGitPullRequest className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Git Integration</p>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        We'll automatically deploy when you push to the selected branch. Only static files will be served - no build steps are executed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {deployType === 'manual' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
                  <FiUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Drag and drop files here, or click to browse
                  </p>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer"
                  >
                    Select Files
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                    Maximum file size: 10MB per file. Allowed: HTML, CSS, JS, images, fonts, etc.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <FiCheck className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">HTML, CSS, JS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiCheck className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Images (PNG, JPG, SVG)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiCheck className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Fonts (WOFF, TTF)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiX className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">No PHP, Python, etc.</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeployModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Handle deployment
                  setShowDeployModal(false);
                  if (window.StaticHost) {
                    window.StaticHost.showToast('Deployment started', 'success');
                  }
                }}
                className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                Deploy Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}