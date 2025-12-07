import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiSearch,
  FiFilter,
  FiEye,
  FiEdit,
  FiTrash2,
  FiPlay,
  FiPause,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiGlobe,
  FiUser,
  FiCalendar,
  FiHardDrive,
  FiBarChart2,
  FiRefreshCw,
  FiExternalLink,
  FiCheck,
  FiX,
  FiMoreVertical
} from 'react-icons/fi';

export default function AdminSites() {
  const router = useRouter();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    suspended: 0,
    error: 0,
    storageUsed: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [selectedSites, setSelectedSites] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [user, setUser] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    // Check admin authentication
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token) {
      router.push('/auth/login');
      return;
    }
    
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Check if user is admin
      if (!parsedUser.roles?.includes('admin')) {
        router.push('/dashboard');
        return;
      }
    }
    
    fetchSites();
    fetchStats();
  }, [router, pagination.page, filters]);

  const fetchSites = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      }).toString();
      
      const response = await fetch(`/api/admin/sites?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSites(data.sites || []);
        setPagination(prev => ({
          ...prev,
          total: data.total || 0,
          totalPages: data.totalPages || 0
        }));
      } else if (response.status === 403) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.sites || {});
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedSites.length === 0) return;
    
    const token = localStorage.getItem('token');
    const action = bulkAction;
    
    try {
      setActionLoading({ [action]: true });
      
      const response = await fetch('/api/admin/sites/bulk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          siteIds: selectedSites
        })
      });
      
      if (response.ok) {
        // Refresh data
        fetchSites();
        fetchStats();
        setSelectedSites([]);
        setBulkAction('');
        alert(`Successfully ${action}ed ${selectedSites.length} site(s)`);
      } else {
        const data = await response.json();
        alert(`Error: ${data.error || 'Failed to perform bulk action'}`);
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      alert('Network error. Please try again.');
    } finally {
      setActionLoading({ [action]: false });
    }
  };

  const handleSiteAction = async (siteId, action) => {
    const token = localStorage.getItem('token');
    
    try {
      setActionLoading({ [siteId]: true });
      
      const response = await fetch(`/api/admin/sites/${siteId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        // Refresh data
        fetchSites();
        fetchStats();
        alert(`Site ${action}d successfully`);
      } else {
        const data = await response.json();
        alert(`Error: ${data.error || 'Failed to perform action'}`);
      }
    } catch (error) {
      console.error('Site action error:', error);
      alert('Network error. Please try again.');
    } finally {
      setActionLoading({ [siteId]: false });
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
      active: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: <FiCheck className="w-3 h-3" /> },
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: <FiAlertCircle className="w-3 h-3" /> },
      suspended: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: <FiPause className="w-3 h-3" /> },
      error: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: <FiX className="w-3 h-3" /> },
      deleted: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: <FiTrash2 className="w-3 h-3" /> }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const StatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Total Sites</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.suspended}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Suspended</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.error}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Error</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatBytes(stats.storageUsed)}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Storage Used</div>
      </div>
    </div>
  );

  const BulkActions = () => (
    selectedSites.length > 0 && (
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <FiAlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-300">
                {selectedSites.length} site(s) selected
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Choose an action to perform on all selected sites
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select action</option>
              <option value="activate">Activate</option>
              <option value="suspend">Suspend</option>
              <option value="delete">Delete</option>
            </select>
            
            <button
              onClick={handleBulkAction}
              disabled={!bulkAction || actionLoading[bulkAction]}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading[bulkAction] ? 'Processing...' : 'Apply'}
            </button>
            
            <button
              onClick={() => setSelectedSites([])}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    )
  );

  return (
    <>
      <Head>
        <title>Admin - Sites Management | StaticHost</title>
        <meta name="description" content="Admin dashboard for managing all static sites on StaticHost platform" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Admin Header */}
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
                  <Link
                    href="/admin"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <span className="px-3 py-2 rounded-md text-sm font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                    Sites
                  </span>
                  <Link
                    href="/admin/users"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Users
                  </Link>
                  <Link
                    href="/admin/audit"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Audit Log
                  </Link>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    fetchSites();
                    fetchStats();
                  }}
                  disabled={loading}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || 'Admin'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Administrator</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center text-white font-medium">
                      A
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sites Management</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Manage all static sites hosted on the platform
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  User Dashboard
                </Link>
                <Link
                  href="/dashboard/sites/create"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Create New Site
                </Link>
              </div>
            </div>
            
            <StatsCards />
          </div>

          {/* Filters */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search sites by name, URL, or owner..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              {/* Filter Toggle */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <FiFilter className="w-4 h-4" />
                  Filters
                  {Object.values(filters).filter(v => v && v !== 'createdAt' && v !== 'desc').length > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-primary-600 rounded-full">
                      {Object.values(filters).filter(v => v && v !== 'createdAt' && v !== 'desc').length}
                    </span>
                  )}
                </button>
                
                {/* Sort */}
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="createdAt">Newest First</option>
                  <option value="updatedAt">Recently Updated</option>
                  <option value="name">Name A-Z</option>
                  <option value="quotaUsed">Largest Storage</option>
                </select>
              </div>
            </div>
            
            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspended</option>
                      <option value="error">Error</option>
                      <option value="deleted">Deleted</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => {
                          setFilters({
                            search: '',
                            status: '',
                            sortBy: 'createdAt',
                            sortOrder: 'desc'
                          });
                          setShowFilters(false);
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Clear Filters
                      </button>
                      <button
                        onClick={() => setShowFilters(false)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bulk Actions */}
          <BulkActions />

          {/* Sites Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  All Sites ({pagination.total})
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {pagination.limit} per page
                </div>
              </div>
            </div>
            
            {/* Table Content */}
            {loading ? (
              // Loading Skeleton
              <div className="p-6">
                {Array(5).fill(0).map((_, index) => (
                  <div key={index} className="animate-pulse mb-4">
                    <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : sites.length === 0 ? (
              // Empty State
              <div className="p-12 text-center">
                <div className="inline-flex p-4 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 mb-4">
                  <FiGlobe className="w-12 h-12" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No sites found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {filters.search || filters.status ? 
                    'Try changing your search or filters' : 
                    'No sites have been created yet'}
                </p>
                {filters.search || filters.status ? (
                  <button
                    onClick={() => {
                      setFilters({
                        search: '',
                        status: '',
                        sortBy: 'createdAt',
                        sortOrder: 'desc'
                      });
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <Link
                    href="/dashboard/sites/create"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Create First Site
                  </Link>
                )}
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={selectedSites.length === sites.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSites(sites.map(s => s._id));
                              } else {
                                setSelectedSites([]);
                              }
                            }}
                            className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Site
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Owner
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Storage
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {sites.map((site) => (
                        <tr 
                          key={site._id} 
                          className={`hover:bg-gray-50 dark:hover:bg-gray-900/50 ${
                            selectedSites.includes(site._id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedSites.includes(site._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSites([...selectedSites, site._id]);
                                } else {
                                  setSelectedSites(selectedSites.filter(id => id !== site._id));
                                }
                              }}
                              className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-primary-100 to-cyan-100 dark:from-primary-900/20 dark:to-cyan-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400">
                                <FiGlobe className="w-5 h-5" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {site.name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {site.slug}
                                </div>
                                {site.publicUrl && (
                                  <a
                                    href={site.publicUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1 mt-1"
                                  >
                                    {new URL(site.publicUrl).hostname}
                                    <FiExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <FiUser className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {site.owner?.name || 'Unknown'}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {site.owner?.email || 'No email'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(site.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <FiHardDrive className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900 dark:text-white">
                                {formatBytes(site.quotaUsed || 0)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(site.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/dashboard/sites/${site._id}`}
                                className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="View"
                              >
                                <FiEye className="w-4 h-4" />
                              </Link>
                              
                              {site.status === 'active' ? (
                                <button
                                  onClick={() => handleSiteAction(site._id, 'suspend')}
                                  disabled={actionLoading[site._id]}
                                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                                  title="Suspend"
                                >
                                  <FiPause className="w-4 h-4" />
                                </button>
                              ) : site.status === 'suspended' ? (
                                <button
                                  onClick={() => handleSiteAction(site._id, 'activate')}
                                  disabled={actionLoading[site._id]}
                                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                                  title="Activate"
                                >
                                  <FiPlay className="w-4 h-4" />
                                </button>
                              ) : null}
                              
                              <button
                                onClick={() => handleSiteAction(site._id, 'delete')}
                                disabled={actionLoading[site._id]}
                                className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                                title="Delete"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                              
                              <Link
                                href={`/dashboard/sites/${site._id}/analytics`}
                                className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="Analytics"
                              >
                                <FiBarChart2 className="w-4 h-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>{' '}
                      of <span className="font-medium">{pagination.total}</span> sites
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <FiChevronLeft className="w-5 h-5" />
                      </button>
                      
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.page - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                            className={`px-3 py-1 rounded-lg transition-colors ${
                              pagination.page === pageNum
                                ? 'bg-primary-600 text-white'
                                : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page === pagination.totalPages}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <FiChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Admin Notes */}
          <div className="mt-8 p-6 bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-primary-900/10 dark:to-cyan-900/10 border border-primary-200 dark:border-primary-800 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-gradient-to-r from-primary-500 to-cyan-500 text-white">
                <FiAlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Admin Guidelines
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white mb-1">Site Management</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Activate sites after manual review</li>
                      <li>Suspend sites violating terms</li>
                      <li>Delete abandoned sites after 30 days</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white mb-1">User Communication</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Notify users before suspension</li>
                      <li>Provide clear reasons for actions</li>
                      <li>Contact: verondev@example.com</li>
                    </ul>
                  </div>
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
                <p>© {new Date().getFullYear()} StaticHost. Admin Dashboard for <strong>VeronDev</strong>.</p>
                <p className="mt-1">Platform Owner: VeronDev (GitHub: VeronDev)</p>
              </div>
              <div className="flex items-center gap-6">
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