import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiGlobe,
  FiFolder,
  FiPlus,
  FiSearch,
  FiFilter,
  FiMoreVertical,
  FiEye,
  FiBarChart2,
  FiSettings,
  FiTrash2,
  FiPlay,
  FiPause,
  FiEdit,
  FiCopy,
  FiExternalLink,
  FiChevronLeft,
  FiChevronRight,
  FiAlertCircle,
  FiHardDrive,
  FiCalendar,
  FiUsers,
  FiZap
} from 'react-icons/fi';

export default function Sites() {
  const router = useRouter();
  const [sites, setSites] = useState([]);
  const [filteredSites, setFilteredSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedSites, setSelectedSites] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    suspended: 0,
    totalStorage: 0
  });

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    fetchSites();
  }, [router]);

  useEffect(() => {
    // Filter and sort sites
    let filtered = [...sites];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(site =>
        site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (site.publicUrl && site.publicUrl.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(site => site.status === statusFilter);
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'name-asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'storage-desc':
        filtered.sort((a, b) => (b.quotaUsed || 0) - (a.quotaUsed || 0));
        break;
      case 'storage-asc':
        filtered.sort((a, b) => (a.quotaUsed || 0) - (b.quotaUsed || 0));
        break;
    }

    setFilteredSites(filtered);
  }, [sites, searchTerm, statusFilter, sortBy]);

  const fetchSites = async () => {
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
        
        // Calculate stats
        const statsData = {
          total: data.sites?.length || 0,
          active: data.sites?.filter(s => s.status === 'active').length || 0,
          pending: data.sites?.filter(s => s.status === 'pending').length || 0,
          suspended: data.sites?.filter(s => s.status === 'suspended').length || 0,
          totalStorage: data.sites?.reduce((sum, site) => sum + (site.quotaUsed || 0), 0) || 0
        };
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
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
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'green', label: 'Active' },
      pending: { color: 'yellow', label: 'Pending' },
      suspended: { color: 'red', label: 'Suspended' },
      error: { color: 'red', label: 'Error' },
      deleted: { color: 'gray', label: 'Deleted' }
    };

    const config = statusConfig[status] || { color: 'gray', label: status };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${config.color}-100 dark:bg-${config.color}-900/30 text-${config.color}-800 dark:text-${config.color}-300`}>
        {config.label}
      </span>
    );
  };

  const handleDeleteSite = async (siteId) => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`/api/sites/${siteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        // Remove site from state
        setSites(prev => prev.filter(site => site._id !== siteId));
        setSiteToDelete(null);
        setShowDeleteModal(false);
        
        // Show success message
        if (window.StaticHost) {
          window.StaticHost.showToast('Site deleted successfully', 'success');
        }
      }
    } catch (error) {
      console.error('Error deleting site:', error);
      if (window.StaticHost) {
        window.StaticHost.showToast('Failed to delete site', 'error');
      }
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedSites.length === 0) return;

    const token = localStorage.getItem('token');
    
    try {
      // Handle different bulk actions
      switch (bulkAction) {
        case 'activate':
          await Promise.all(selectedSites.map(siteId =>
            fetch(`/api/sites/${siteId}/activate`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            })
          ));
          break;
        
        case 'deactivate':
          await Promise.all(selectedSites.map(siteId =>
            fetch(`/api/sites/${siteId}/deactivate`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            })
          ));
          break;
        
        case 'delete':
          // Show confirmation for bulk delete
          if (window.StaticHost) {
            const confirmed = await window.StaticHost.confirm({
              title: 'Delete Multiple Sites',
              message: `Are you sure you want to delete ${selectedSites.length} site(s)? This action cannot be undone.`,
              type: 'danger',
              confirmText: 'Delete All',
              cancelText: 'Cancel'
            });
            
            if (!confirmed) return;
            
            await Promise.all(selectedSites.map(siteId =>
              fetch(`/api/sites/${siteId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              })
            ));
          }
          break;
      }
      
      // Refresh sites
      await fetchSites();
      setSelectedSites([]);
      setBulkAction('');
      
      // Show success message
      if (window.StaticHost) {
        window.StaticHost.showToast(`Bulk action "${bulkAction}" completed`, 'success');
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      if (window.StaticHost) {
        window.StaticHost.showToast('Failed to perform bulk action', 'error');
      }
    }
  };

  const toggleSiteSelection = (siteId) => {
    setSelectedSites(prev =>
      prev.includes(siteId)
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSites.length === paginatedSites.length) {
      setSelectedSites([]);
    } else {
      setSelectedSites(paginatedSites.map(site => site._id));
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedSites = filteredSites.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSites.length / itemsPerPage);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const StatsCards = () => (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
            <FiFolder className="w-5 h-5" />
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Total Sites</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
            <FiGlobe className="w-5 h-5" />
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Active</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400">
            <FiAlertCircle className="w-5 h-5" />
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Pending</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
            <FiPause className="w-5 h-5" />
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.suspended}</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Suspended</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
            <FiHardDrive className="w-5 h-5" />
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatBytes(stats.totalStorage)}</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Total Storage</p>
      </div>
    </div>
  );

  const SiteRow = ({ site }) => (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={selectedSites.includes(site._id)}
            onChange={() => toggleSiteSelection(site._id)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
          />
          <div className="ml-4 flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-primary-100 to-cyan-100 dark:from-primary-900/20 dark:to-cyan-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400">
            <FiGlobe className="w-5 h-5" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            <Link href={`/dashboard/sites/${site._id}`} className="hover:text-primary-600 dark:hover:text-primary-400">
              {site.name}
            </Link>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {site.slug}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {getStatusBadge(site.status)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900 dark:text-white">
          {formatBytes(site.quotaUsed || 0)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        {formatDate(site.createdAt)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex items-center gap-2">
          {site.publicUrl && (
            <a
              href={site.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="Visit site"
            >
              <FiExternalLink className="w-4 h-4" />
            </a>
          )}
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
          <div className="relative group">
            <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <FiMoreVertical className="w-4 h-4" />
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 hidden group-hover:block">
              <Link
                href={`/dashboard/sites/${site._id}/edit`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FiEdit className="w-4 h-4" />
                Edit
              </Link>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(site.publicUrl || '');
                  if (window.StaticHost) {
                    window.StaticHost.showToast('URL copied to clipboard', 'success');
                  }
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FiCopy className="w-4 h-4" />
                Copy URL
              </button>
              {site.status === 'active' ? (
                <button
                  onClick={() => handleDeactivateSite(site._id)}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-700 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                >
                  <FiPause className="w-4 h-4" />
                  Deactivate
                </button>
              ) : (
                <button
                  onClick={() => handleActivateSite(site._id)}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  <FiPlay className="w-4 h-4" />
                  Activate
                </button>
              )}
              <button
                onClick={() => {
                  setSiteToDelete(site);
                  setShowDeleteModal(true);
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <FiTrash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );

  const handleActivateSite = async (siteId) => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`/api/sites/${siteId}/activate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchSites();
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

  const handleDeactivateSite = async (siteId) => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`/api/sites/${siteId}/deactivate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchSites();
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

  return (
    <>
      <Head>
        <title>My Sites - StaticHost</title>
        <meta name="description" content="Manage your static sites on StaticHost" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/dashboard" className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  <FiChevronLeft className="w-5 h-5" />
                  Back to Dashboard
                </Link>
              </div>
              
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard/sites/create"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-lg hover:from-primary-700 hover:to-cyan-700 transition-all duration-200"
                >
                  <FiPlus className="w-4 h-4" />
                  New Site
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              My Sites
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage all your static sites in one place
            </p>
          </div>

          {/* Stats Cards */}
          <StatsCards />

          {/* Filters and Search */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search sites by name or URL..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <FiFilter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="storage-desc">Storage (High to Low)</option>
                  <option value="storage-asc">Storage (Low to High)</option>
                </select>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedSites.length > 0 && (
              <div className="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                      <FiZap className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-primary-900 dark:text-primary-300">
                        {selectedSites.length} site{selectedSites.length > 1 ? 's' : ''} selected
                      </p>
                      <p className="text-sm text-primary-700 dark:text-primary-400">
                        Choose an action to apply to all selected sites
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <select
                      value={bulkAction}
                      onChange={(e) => setBulkAction(e.target.value)}
                      className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Bulk Actions</option>
                      <option value="activate">Activate</option>
                      <option value="deactivate">Deactivate</option>
                      <option value="delete">Delete</option>
                    </select>

                    <button
                      onClick={handleBulkAction}
                      disabled={!bulkAction}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Apply
                    </button>

                    <button
                      onClick={() => setSelectedSites([])}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sites Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <svg className="animate-spin h-12 w-12 text-primary-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600 dark:text-gray-400">Loading your sites...</p>
              </div>
            ) : sites.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-6">
                  <FiFolder className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No sites yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  You haven't created any sites yet. Start by uploading your static files or connecting a Git repository.
                </p>
                <Link
                  href="/dashboard/sites/create"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-lg hover:from-primary-700 hover:to-cyan-700 transition-all duration-200"
                >
                  <FiPlus className="w-5 h-5" />
                  Create Your First Site
                </Link>
              </div>
            ) : filteredSites.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-6">
                  <FiSearch className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No matching sites</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  No sites found matching your search criteria. Try adjusting your filters.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedSites.length === paginatedSites.length && paginatedSites.length > 0}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Site
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
                      {paginatedSites.map((site) => (
                        <SiteRow key={site._id} site={site} />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(indexOfLastItem, filteredSites.length)}</span> of{' '}
                        <span className="font-medium">{filteredSites.length}</span> sites
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <FiChevronLeft className="w-5 h-5" />
                        </button>
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => goToPage(pageNum)}
                              className={`px-3 py-1 rounded-lg transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-primary-600 text-white'
                                  : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <FiChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Empty State Help */}
          {sites.length === 0 && !loading && (
            <div className="mt-8 bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-primary-900/10 dark:to-cyan-900/10 rounded-xl border border-primary-200 dark:border-primary-800 p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-gradient-to-r from-primary-500 to-cyan-500 text-white">
                  <FiZap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Getting Started</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Here are some things you can do with StaticHost:
                  </p>
                  <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <FiGlobe className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      Upload static HTML, CSS, and JavaScript files
                    </li>
                    <li className="flex items-center gap-2">
                      <FiUpload className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      Connect GitHub, GitLab, or Bitbucket repositories
                    </li>
                    <li className="flex items-center gap-2">
                      <FiBarChart2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      Get built-in analytics for your sites
                    </li>
                    <li className="flex items-center gap-2">
                      <FiGlobe className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      Global CDN with automatic SSL/TLS
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && siteToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <FiAlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Site</h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete <strong>{siteToDelete.name}</strong>? This action cannot be undone. All site files and analytics data will be permanently deleted.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSiteToDelete(null);
                  setShowDeleteModal(false);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSite(siteToDelete._id)}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Site
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}