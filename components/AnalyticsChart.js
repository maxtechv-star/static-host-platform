import React, { useState, useEffect, useRef } from 'react';
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
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

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

const AnalyticsChart = ({ 
  siteId, 
  chartType = 'line', 
  metric = 'hits', 
  timeRange = '30d',
  height = 300,
  showTitle = true,
  showLegend = true,
  interactive = true
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState({});
  const chartRef = useRef(null);

  const chartTypes = {
    line: Line,
    bar: Bar,
    pie: Pie,
    doughnut: Doughnut
  };

  const ChartComponent = chartTypes[chartType] || Line;

  useEffect(() => {
    fetchAnalyticsData();
  }, [siteId, timeRange, metric]);

  useEffect(() => {
    if (data) {
      prepareChartData();
    }
  }, [data, chartType, metric]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const endpoint = siteId 
        ? `/api/analytics/site/${siteId}/${timeRange}`
        : `/api/analytics/platform/${timeRange}`;
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = () => {
    if (!data || !data.daily) {
      return;
    }

    const isDaily = timeRange === '1d' || timeRange === '7d' || timeRange === '30d';
    const labels = isDaily 
      ? data.daily.map(item => {
          const date = new Date(item.date);
          return timeRange === '1d' 
            ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        })
      : data.monthly.map(item => {
          const [year, month] = item.month.split('-');
          return new Date(year, month - 1).toLocaleDateString([], { month: 'short', year: 'numeric' });
        });

    const dataset = isDaily ? data.daily : data.monthly;
    
    let datasets = [];
    
    if (chartType === 'line' || chartType === 'bar') {
      if (metric === 'all' || metric === 'hits') {
        datasets.push({
          label: 'Page Views',
          data: dataset.map(item => item.hits),
          borderColor: '#4f46e5',
          backgroundColor: chartType === 'bar' ? '#4f46e5' : 'rgba(79, 70, 229, 0.1)',
          borderWidth: 2,
          fill: chartType === 'line',
          tension: 0.4
        });
      }
      
      if (metric === 'all' || metric === 'visitors') {
        datasets.push({
          label: 'Unique Visitors',
          data: dataset.map(item => item.uniqueVisitors),
          borderColor: '#10b981',
          backgroundColor: chartType === 'bar' ? '#10b981' : 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          fill: chartType === 'line',
          tension: 0.4
        });
      }
      
      if (metric === 'bandwidth') {
        datasets.push({
          label: 'Bandwidth (MB)',
          data: dataset.map(item => (item.bandwidth || 0) / (1024 * 1024)),
          borderColor: '#f59e0b',
          backgroundColor: chartType === 'bar' ? '#f59e0b' : 'rgba(245, 158, 11, 0.1)',
          borderWidth: 2,
          fill: chartType === 'line',
          tension: 0.4
        });
      }
    } else if (chartType === 'pie' || chartType === 'doughnut') {
      // For pie/doughnut charts, use different data
      if (data.topPages && data.topPages.length > 0) {
        const pageData = data.topPages.slice(0, 5);
        const colors = [
          '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'
        ];
        
        setChartData({
          labels: pageData.map(item => {
            const path = item.path.length > 20 ? item.path.substring(0, 20) + '...' : item.path;
            return `${path} (${item.hits})`;
          }),
          datasets: [{
            data: pageData.map(item => item.hits),
            backgroundColor: colors,
            borderColor: colors.map(color => color + '80'),
            borderWidth: 1
          }]
        });
        return;
      }
    }

    setChartData({
      labels,
      datasets
    });
  };

  const getChartOptions = () => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: showLegend && (chartType === 'line' || chartType === 'bar'),
          position: 'top',
          labels: {
            color: '#6b7280',
            font: {
              size: 12
            },
            usePointStyle: true,
            padding: 20
          }
        },
        title: {
          display: showTitle,
          text: getChartTitle(),
          color: '#111827',
          font: {
            size: 16,
            weight: '600'
          },
          padding: {
            top: 10,
            bottom: 30
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#111827',
          bodyColor: '#374151',
          borderColor: '#e5e7eb',
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            label: (context) => {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                if (metric === 'bandwidth') {
                  label += context.parsed.y.toFixed(2) + ' MB';
                } else {
                  label += context.parsed.y.toLocaleString();
                }
              }
              return label;
            }
          }
        }
      },
      scales: chartType === 'line' || chartType === 'bar' ? {
        x: {
          grid: {
            color: '#e5e7eb',
            drawBorder: false
          },
          ticks: {
            color: '#6b7280',
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#e5e7eb',
            drawBorder: false
          },
          ticks: {
            color: '#6b7280',
            callback: (value) => {
              if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'K';
              }
              return value;
            }
          }
        }
      } : undefined,
      interaction: {
        intersect: false,
        mode: 'nearest'
      },
      animation: {
        duration: 750,
        easing: 'easeInOutQuart'
      }
    };

    // Dark mode adjustments
    const isDarkMode = document.documentElement.classList.contains('dark');
    if (isDarkMode) {
      baseOptions.plugins.title.color = '#f9fafb';
      baseOptions.plugins.legend.labels.color = '#d1d5db';
      baseOptions.plugins.tooltip.backgroundColor = 'rgba(31, 41, 55, 0.95)';
      baseOptions.plugins.tooltip.titleColor = '#f9fafb';
      baseOptions.plugins.tooltip.bodyColor = '#d1d5db';
      baseOptions.plugins.tooltip.borderColor = '#4b5563';
      
      if (baseOptions.scales) {
        baseOptions.scales.x.grid.color = '#374151';
        baseOptions.scales.x.ticks.color = '#9ca3af';
        baseOptions.scales.y.grid.color = '#374151';
        baseOptions.scales.y.ticks.color = '#9ca3af';
      }
    }

    return baseOptions;
  };

  const getChartTitle = () => {
    if (!siteId) {
      return 'Platform Analytics';
    }
    
    const metricLabels = {
      'hits': 'Page Views',
      'visitors': 'Unique Visitors',
      'bandwidth': 'Bandwidth Usage',
      'all': 'Traffic Overview'
    };
    
    const rangeLabels = {
      '1d': 'Last 24 Hours',
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days',
      '90d': 'Last 90 Days',
      '1y': 'Last Year'
    };
    
    return `${metricLabels[metric]} - ${rangeLabels[timeRange] || timeRange}`;
  };

  const exportChart = (format = 'png') => {
    if (!chartRef.current) return;
    
    const chart = chartRef.current;
    const link = document.createElement('a');
    link.download = `analytics-chart-${Date.now()}.${format}`;
    link.href = chart.toBase64Image();
    link.click();
  };

  const getSummaryStats = () => {
    if (!data || !data.summary) return null;
    
    return {
      totalHits: data.summary.totalHits || 0,
      uniqueVisitors: data.summary.uniqueVisitors || 0,
      avgHitsPerVisitor: data.summary.hitsPerVisitor || 0,
      bandwidth: data.summary.bandwidth || 0
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="text-center">
          <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full inline-block mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 dark:text-red-400 font-medium">Failed to load analytics</p>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
          <button
            onClick={fetchAnalyticsData}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || (!data.daily && !data.monthly && !data.topPages)) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="text-center">
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full inline-block mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400">No analytics data available</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {siteId ? 'This site has no analytics data yet.' : 'No platform analytics data available.'}
          </p>
        </div>
      </div>
    );
  }

  const summary = getSummaryStats();

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {summary && (chartType === 'line' || chartType === 'bar') && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Views</div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
              {summary.totalHits.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              All time
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Unique Visitors</div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
              {summary.uniqueVisitors.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              All time
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Views/Visitor</div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
              {summary.avgHitsPerVisitor.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Average
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Bandwidth</div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
              {(summary.bandwidth / (1024 * 1024 * 1024)).toFixed(2)} GB
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              All time
            </div>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getChartTitle()}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {siteId ? 'Site analytics' : 'Platform-wide analytics'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => window.location.href = `${window.location.pathname}?range=${e.target.value}`}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            
            <select
              value={chartType}
              onChange={(e) => window.location.href = `${window.location.pathname}?type=${e.target.value}`}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="line">Line Chart</option>
              <option value="bar">Bar Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="doughnut">Doughnut Chart</option>
            </select>
            
            <button
              onClick={() => exportChart('png')}
              className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
              title="Export as PNG"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Chart */}
        <div style={{ height: `${height}px`, position: 'relative' }}>
          {Object.keys(chartData).length > 0 ? (
            <ChartComponent
              ref={chartRef}
              data={chartData}
              options={getChartOptions()}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">No data available for this chart type</p>
            </div>
          )}
        </div>

        {/* Additional Info */}
        {(chartType === 'pie' || chartType === 'doughnut') && data.topPages && data.topPages.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Top Pages</h4>
            <div className="space-y-2">
              {data.topPages.slice(0, 5).map((page, index) => {
                const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colors[index] || '#6b7280' }}
                      ></div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs">
                        {page.path}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {page.hits.toLocaleString()} views
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Data Source Info */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Data updated: {data.timestamp ? new Date(data.timestamp).toLocaleString() : 'Recently'}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={fetchAnalyticsData}
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                Refresh Data
              </button>
              <a
                href={siteId ? `/api/analytics/site/${siteId}/export?format=csv` : '/api/analytics/platform/export?format=csv'}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 font-medium"
                download
              >
                Export CSV
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics (for line/bar charts) */}
      {(chartType === 'line' || chartType === 'bar') && data.referrers && data.referrers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Referrers</h4>
          <div className="space-y-3">
            {data.referrers.slice(0, 5).map((referrer, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs">
                    {referrer.referrer === '' ? 'Direct' : referrer.referrer}
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {referrer.hits.toLocaleString()} referrals
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsChart;