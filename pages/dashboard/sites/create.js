import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiUpload,
  FiGitPullRequest,
  FiFolder,
  FiGlobe,
  FiCheck,
  FiAlertCircle,
  FiChevronLeft,
  FiX,
  FiFile,
  FiZap,
  FiHelpCircle,
  FiExternalLink,
  FiClock,
  FiPackage,
  FiCloud,
  FiCode,
  FiEye
} from 'react-icons/fi';

export default function CreateSite() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState('zip'); // zip, git, manual
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [gitUrl, setGitUrl] = useState('');
  const [gitBranch, setGitBranch] = useState('main');
  const [validationResult, setValidationResult] = useState(null);
  const [siteCreated, setSiteCreated] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }
  }, [router]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Auto-generate slug from name
    if (name === 'name') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
      setFormData(prev => ({
        ...prev,
        slug
      }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Site name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Site name must be at least 2 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Site name cannot exceed 100 characters';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'URL slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    } else if (formData.slug.length < 2) {
      newErrors.slug = 'Slug must be at least 2 characters';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description cannot exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    switch (method) {
      case 'zip':
        if (selectedFiles.length === 0) {
          setErrors({ file: 'Please select a ZIP file to upload' });
          return false;
        }
        break;
      
      case 'git':
        if (!gitUrl.trim()) {
          setErrors({ gitUrl: 'Git repository URL is required' });
          return false;
        }
        // Basic URL validation
        if (!gitUrl.match(/^(https?:\/\/|git@).+\.git$/) && !gitUrl.includes('github.com') && !gitUrl.includes('gitlab.com')) {
          setErrors({ gitUrl: 'Please enter a valid Git repository URL' });
          return false;
        }
        break;
      
      case 'manual':
        if (selectedFiles.length === 0) {
          setErrors({ file: 'Please select at least one file to upload' });
          return false;
        }
        break;
    }
    
    return true;
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    if (method === 'zip') {
      // Only allow one ZIP file
      const zipFile = files.find(file => file.name.endsWith('.zip'));
      if (zipFile) {
        setSelectedFiles([zipFile]);
        setErrors({});
        
        // Validate ZIP file
        validateZipFile(zipFile);
      } else {
        setErrors({ file: 'Please select a ZIP file (.zip)' });
      }
    } else {
      // Manual upload - allow multiple files
      setSelectedFiles(files);
      setErrors({});
    }
  };

  const validateZipFile = (file) => {
    // Basic validation
    if (file.size > 100 * 1024 * 1024) { // 100MB
      setValidationResult({
        valid: false,
        message: 'ZIP file exceeds 100MB limit',
        details: [`File size: ${formatBytes(file.size)}`]
      });
      return;
    }

    setValidationResult({
      valid: true,
      message: 'ZIP file ready for upload',
      details: [
        `File: ${file.name}`,
        `Size: ${formatBytes(file.size)}`,
        '✓ Will be validated for static content'
      ]
    });
  };

  const handleGitUrlChange = (e) => {
    setGitUrl(e.target.value);
    setErrors({});
    
    // Auto-detect branch from URL
    const url = e.target.value;
    if (url.includes('github.com')) {
      setGitBranch('main');
    }
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      handleCreateSite();
    }
  };

  const handleCreateSite = async () => {
    setLoading(true);
    setUploadProgress(0);
    setUploadStatus('Creating site...');

    const token = localStorage.getItem('token');
    
    try {
      // First, create the site
      const siteResponse = await fetch('/api/sites', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!siteResponse.ok) {
        const error = await siteResponse.json();
        throw new Error(error.error || 'Failed to create site');
      }

      const siteData = await siteResponse.json();
      setSiteCreated(siteData.site);
      setUploadStatus('Site created, uploading files...');

      // Upload files based on method
      switch (method) {
        case 'zip':
          await uploadZipFile(siteData.site._id, token);
          break;
        
        case 'git':
          await connectGitRepository(siteData.site._id, token);
          break;
        
        case 'manual':
          await uploadManualFiles(siteData.site._id, token);
          break;
      }

      // Activate the site
      setUploadStatus('Activating site...');
      await activateSite(siteData.site._id, token);

    } catch (error) {
      console.error('Create site error:', error);
      setErrors({ submit: error.message });
      setLoading(false);
    }
  };

  const uploadZipFile = async (siteId, token) => {
    const formData = new FormData();
    formData.append('file', selectedFiles[0]);

    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
          setUploadStatus(`Uploading: ${progress}%`);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error('ZIP upload failed'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.open('POST', `/api/sites/${siteId}/upload-zip`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  };

  const connectGitRepository = async (siteId, token) => {
    setUploadStatus('Cloning repository...');
    setUploadProgress(30);

    try {
      const response = await fetch(`/api/sites/${siteId}/git-clone`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repoUrl: gitUrl,
          branch: gitBranch
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Git clone failed');
      }

      setUploadProgress(70);
      setUploadStatus('Repository cloned successfully');
    } catch (error) {
      throw error;
    }
  };

  const uploadManualFiles = async (siteId, token) => {
    setUploadStatus('Uploading files...');
    
    let uploadedCount = 0;
    const totalFiles = selectedFiles.length;

    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', file.webkitRelativePath || file.name);

      try {
        const response = await fetch(`/api/sites/${siteId}/upload-file`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        uploadedCount++;
        const progress = Math.round((uploadedCount / totalFiles) * 100);
        setUploadProgress(progress);
        setUploadStatus(`Uploading: ${uploadedCount}/${totalFiles} files`);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        // Continue with other files
      }
    }
  };

  const activateSite = async (siteId, token) => {
    setUploadStatus('Finalizing...');
    setUploadProgress(95);

    try {
      const response = await fetch(`/api/sites/${siteId}/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Site activation failed');
      }

      setUploadProgress(100);
      setUploadStatus('Site activated successfully!');
      
      // Redirect to site dashboard after delay
      setTimeout(() => {
        router.push(`/dashboard/sites/${siteId}`);
      }, 2000);
    } catch (error) {
      throw error;
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const Step1 = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Site Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border ${
            errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500'
          } rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors`}
          placeholder="My Portfolio"
          maxLength={100}
        />
        {errors.name && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <FiAlertCircle className="w-4 h-4" />
            {errors.name}
          </p>
        )}
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Choose a descriptive name for your site
        </p>
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Site URL *
        </label>
        <div className="flex items-center">
          <span className="px-4 py-3 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            https://statichost.dev/s/
          </span>
          <input
            type="text"
            id="slug"
            name="slug"
            value={formData.slug}
            onChange={handleInputChange}
            className={`flex-1 px-4 py-3 border ${
              errors.slug ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500'
            } rounded-r-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors`}
            placeholder="my-portfolio"
            maxLength={50}
          />
        </div>
        {errors.slug && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <FiAlertCircle className="w-4 h-4" />
            {errors.slug}
          </p>
        )}
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Only lowercase letters, numbers, and hyphens. This will be your site's URL.
        </p>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description (Optional)
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={3}
          className={`w-full px-4 py-3 border ${
            errors.description ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500'
          } rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors`}
          placeholder="A brief description of your site..."
          maxLength={500}
        />
        {errors.description && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <FiAlertCircle className="w-4 h-4" />
            {errors.description}
          </p>
        )}
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {formData.description.length}/500 characters
        </p>
      </div>
    </div>
  );

  const Step2 = () => (
    <div className="space-y-8">
      {/* Upload Method Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Choose Upload Method
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setMethod('zip')}
            className={`p-6 border-2 rounded-2xl text-left transition-all duration-200 ${
              method === 'zip'
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
            }`}
          >
            <div className={`p-3 rounded-xl inline-flex mb-4 ${
              method === 'zip'
                ? 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              <FiPackage className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">ZIP Upload</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Upload a ZIP file containing your static site
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMethod('git')}
            className={`p-6 border-2 rounded-2xl text-left transition-all duration-200 ${
              method === 'git'
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
            }`}
          >
            <div className={`p-3 rounded-xl inline-flex mb-4 ${
              method === 'git'
                ? 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              <FiGitPullRequest className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Git Repository</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Connect to GitHub, GitLab, or Bitbucket
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMethod('manual')}
            className={`p-6 border-2 rounded-2xl text-left transition-all duration-200 ${
              method === 'manual'
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
            }`}
          >
            <div className={`p-3 rounded-xl inline-flex mb-4 ${
              method === 'manual'
                ? 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              <FiUpload className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Manual Upload</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Upload individual files and folders
            </p>
          </button>
        </div>
      </div>

      {/* Method-specific Content */}
      {method === 'zip' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload ZIP File *
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-2xl hover:border-primary-400 dark:hover:border-primary-600 transition-colors">
              <div className="space-y-3 text-center">
                <FiPackage className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                  <label className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 focus-within:outline-none">
                    <span>Upload a ZIP file</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept=".zip"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  ZIP files up to 100MB. Must contain static files only.
                </p>
              </div>
            </div>
            
            {errors.file && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <FiAlertCircle className="w-4 h-4" />
                {errors.file}
              </p>
            )}

            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selected File:</h4>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FiPackage className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedFiles[0].name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatBytes(selectedFiles[0].size)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {validationResult && (
              <div className={`mt-4 p-4 rounded-xl ${
                validationResult.valid
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-start gap-3">
                  {validationResult.valid ? (
                    <FiCheck className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <FiAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className={`font-medium ${
                      validationResult.valid
                        ? 'text-green-800 dark:text-green-300'
                        : 'text-red-800 dark:text-red-300'
                    }`}>
                      {validationResult.message}
                    </p>
                    {validationResult.details && (
                      <ul className="mt-2 text-sm space-y-1">
                        {validationResult.details.map((detail, index) => (
                          <li key={index} className={
                            validationResult.valid
                              ? 'text-green-700 dark:text-green-400'
                              : 'text-red-700 dark:text-red-400'
                          }>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Requirements */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Important Requirements</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <li className="flex items-center gap-2">
                    <FiCheck className="w-4 h-4" />
                    ZIP must contain an index.html file in root or public/ folder
                  </li>
                  <li className="flex items-center gap-2">
                    <FiX className="w-4 h-4" />
                    No build steps or package.json with build scripts allowed
                  </li>
                  <li className="flex items-center gap-2">
                    <FiX className="w-4 h-4" />
                    No server-side scripts (PHP, Python, Ruby, etc.)
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="w-4 h-4" />
                    Only static files: HTML, CSS, JS, images, fonts
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {method === 'git' && (
        <div className="space-y-6">
          <div>
            <label htmlFor="gitUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Git Repository URL *
            </label>
            <input
              type="url"
              id="gitUrl"
              value={gitUrl}
              onChange={handleGitUrlChange}
              className={`w-full px-4 py-3 border ${
                errors.gitUrl ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500'
              } rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors`}
              placeholder="https://github.com/username/repository.git"
            />
            {errors.gitUrl && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <FiAlertCircle className="w-4 h-4" />
                {errors.gitUrl}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Supports GitHub, GitLab, Bitbucket, and other public Git repositories
            </p>
          </div>

          <div>
            <label htmlFor="gitBranch" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Branch (Optional)
            </label>
            <input
              type="text"
              id="gitBranch"
              value={gitBranch}
              onChange={(e) => setGitBranch(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-primary-500 focus:ring-2 transition-colors"
              placeholder="main"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Default: main or master
            </p>
          </div>

          {/* Git Requirements */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Git Repository Requirements</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <li className="flex items-center gap-2">
                    <FiCheck className="w-4 h-4" />
                    Repository must be publicly accessible
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="w-4 h-4" />
                    Must contain static files only
                  </li>
                  <li className="flex items-center gap-2">
                    <FiX className="w-4 h-4" />
                    No build steps or compilation required
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="w-4 h-4" />
                    Will automatically detect index.html
                  </li>
                  <li className="flex items-center gap-2">
                    <FiAlertCircle className="w-4 h-4" />
                    Large repositories may take longer to clone
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Examples */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Example URLs:</h4>
            <div className="space-y-2">
              <code className="block text-sm bg-gray-100 dark:bg-gray-900 p-2 rounded-lg text-gray-800 dark:text-gray-300">
                https://github.com/username/portfolio.git
              </code>
              <code className="block text-sm bg-gray-100 dark:bg-gray-900 p-2 rounded-lg text-gray-800 dark:text-gray-300">
                https://gitlab.com/username/project.git
              </code>
              <code className="block text-sm bg-gray-100 dark:bg-gray-900 p-2 rounded-lg text-gray-800 dark:text-gray-300">
                git@github.com:username/repository.git
              </code>
            </div>
          </div>
        </div>
      )}

      {method === 'manual' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload Files *
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-2xl hover:border-primary-400 dark:hover:border-primary-600 transition-colors">
              <div className="space-y-3 text-center">
                <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                  <label className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 focus-within:outline-none">
                    <span>Upload files</span>
                    <input
                      type="file"
                      className="sr-only"
                      multiple
                      webkitdirectory="true"
                      directory="true"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <p className="pl-1">or drag and drop a folder</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  HTML, CSS, JS, images, fonts up to 100MB total
                </p>
              </div>
            </div>
            
            {errors.file && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <FiAlertCircle className="w-4 h-4" />
                {errors.file}
              </p>
            )}

            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Selected Files ({selectedFiles.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
                  {selectedFiles.slice(0, 10).map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FiFile className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {file.name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatBytes(file.size)}
                      </span>
                    </div>
                  ))}
                  {selectedFiles.length > 10 && (
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2">
                      +{selectedFiles.length - 10} more files
                    </p>
                  )}
                </div>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Total size: {formatBytes(selectedFiles.reduce((total, file) => total + file.size, 0))}
                </div>
              </div>
            )}
          </div>

          {/* Manual Upload Tips */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">Upload Tips</h4>
                <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                  <li>• Include an index.html file in the root directory</li>
                  <li>• Folder structures are preserved during upload</li>
                  <li>• Upload the entire folder for best results</li>
                  <li>• Large uploads may take several minutes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.submit && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <FiAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-800 dark:text-red-300">
              {errors.submit}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const LoadingStep = () => (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {uploadStatus}
          </span>
          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
            {uploadProgress}%
          </span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary-500 to-cyan-500 transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      </div>

      {/* Site Created Info */}
      {siteCreated && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <FiCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
            <div>
              <h3 className="font-semibold text-green-800 dark:text-green-300">
                Site Created Successfully!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-400">
                {siteCreated.name}
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Site URL:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {siteCreated.publicUrl || 'Will be generated after upload'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                Processing
              </span>
            </div>
          </div>
        </div>
      )}

      {/* What's happening */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <FiZap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-blue-800 dark:text-blue-300">
            What's happening now?
          </h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              uploadProgress >= 25 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
            }`}>
              {uploadProgress >= 25 ? <FiCheck className="w-4 h-4" /> : '1'}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Creating site</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Setting up site infrastructure</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              uploadProgress >= 50 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
              uploadProgress >= 25 ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' :
              'bg-gray-100 dark:bg-gray-700 text-gray-400'
            }`}>
              {uploadProgress >= 50 ? <FiCheck className="w-4 h-4" /> : '2'}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Uploading files</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Transferring your static files</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              uploadProgress >= 75 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
              uploadProgress >= 50 ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' :
              'bg-gray-100 dark:bg-gray-700 text-gray-400'
            }`}>
              {uploadProgress >= 75 ? <FiCheck className="w-4 h-4" /> : '3'}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Processing files</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Validating and optimizing content</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              uploadProgress >= 100 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
              uploadProgress >= 75 ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' :
              'bg-gray-100 dark:bg-gray-700 text-gray-400'
            }`}>
              {uploadProgress >= 100 ? <FiCheck className="w-4 h-4" /> : '4'}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Activating site</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Making site live on CDN</p>
            </div>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <FiClock className="inline-block w-4 h-4 mr-1" />
          This may take a few minutes. Don't close this window.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Create New Site - StaticHost</title>
        <meta name="description" content="Create a new static site on StaticHost - upload ZIP files, connect Git repositories, or upload files manually." />
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
                  <Link
                    href="/dashboard"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/dashboard/sites"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Sites
                  </Link>
                  <span className="px-3 py-2 rounded-md text-sm font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                    New Site
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <div className="mb-8">
            <Link
              href="/dashboard/sites"
              className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <FiChevronLeft className="w-4 h-4" />
              Back to Sites
            </Link>
          </div>

          {/* Create Site Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Create New Site
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Upload static files or connect a Git repository
                  </p>
                </div>
                
                {/* Step Indicator */}
                {!loading && (
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    }`}>
                      1
                    </div>
                    <div className="w-12 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    }`}>
                      2
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form Content */}
            <div className="p-8">
              {loading ? (
                <LoadingStep />
              ) : (
                <>
                  {step === 1 && <Step1 />}
                  {step === 2 && <Step2 />}
                </>
              )}
            </div>

            {/* Footer */}
            {!loading && (
              <div className="px-8 py-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center justify-between">
                  <div>
                    {step === 2 && (
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Back
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Link
                      href="/dashboard/sites"
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </Link>
                    
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={loading}
                      className="px-6 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white font-medium rounded-lg hover:from-primary-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {step === 1 ? 'Continue' : 'Create Site'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Help Section */}
          {!loading && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FiHelpCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-semibold text-blue-800 dark:text-blue-300">Need Help?</h3>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
                  Check our documentation for detailed instructions on preparing your static site.
                </p>
                <a
                  href="https://github.com/VeronDev/static-host-platform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  View Documentation
                  <FiExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FiCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <h3 className="font-semibold text-green-800 dark:text-green-300">What's Allowed?</h3>
                </div>
                <ul className="text-sm text-green-700 dark:text-green-400 space-y-2">
                  <li>• HTML, CSS, JavaScript files</li>
                  <li>• Images, fonts, PDFs</li>
                  <li>• Static JSON/XML data</li>
                  <li>• No build steps required</li>
                </ul>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FiX className="w-6 h-6 text-red-600 dark:text-red-400" />
                  <h3 className="font-semibold text-red-800 dark:text-red-300">What's Not Allowed?</h3>
                </div>
                <ul className="text-sm text-red-700 dark:text-red-400 space-y-2">
                  <li>• Server-side scripts (PHP, Python, etc.)</li>
                  <li>• Build tools (Webpack, Gulp, etc.)</li>
                  <li>• Package.json with build scripts</li>
                  <li>• Executable files</li>
                </ul>
              </div>
            </div>
          )}

          {/* Platform Note */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              StaticHost is a <strong>free</strong> platform by <strong>VeronDev</strong>. 
              {' '}No credit card required. No hidden fees.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}