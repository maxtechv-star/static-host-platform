import React, { useState, useRef, useEffect } from 'react';

const FileUpload = ({ 
  siteId, 
  onUploadComplete, 
  onUploadError, 
  maxSize = 100 * 1024 * 1024, // 100MB default
  allowedTypes = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.txt', '.json', '.xml', '.ico'],
  multiple = true,
  showProgress = true,
  showFileList = true,
  uploadType = 'file' // 'file', 'zip', 'git'
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [gitUrl, setGitUrl] = useState('');
  const [gitBranch, setGitBranch] = useState('main');
  const [gitLoading, setGitLoading] = useState(false);
  
  const fileInputRef = useRef(null);
  const dropAreaRef = useRef(null);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file) => {
    const maxSizeBytes = maxSize;
    
    // Check file size
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File "${file.name}" is too large (${formatBytes(file.size)}). Maximum size is ${formatBytes(maxSizeBytes)}.`
      };
    }

    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      return {
        valid: false,
        error: `File type "${fileExtension}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    // Check for banned file types
    const bannedExtensions = ['.php', '.py', '.rb', '.pl', '.sh', '.exe', '.bat', '.cmd', '.ps1'];
    if (bannedExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error: `File type "${fileExtension}" is not permitted for security reasons.`
      };
    }

    // Check for suspicious filenames
    const bannedFiles = ['.htaccess', 'wp-config.php', 'config.json', '.env', 'package.json'];
    if (bannedFiles.includes(file.name.toLowerCase())) {
      return {
        valid: false,
        error: `File "${file.name}" is not permitted for security reasons.`
      };
    }

    return { valid: true };
  };

  const handleFileSelect = (selectedFiles) => {
    const newFiles = Array.from(selectedFiles);
    const validatedFiles = [];
    const errors = [];

    newFiles.forEach(file => {
      const validation = validateFile(file);
      if (validation.valid) {
        validatedFiles.push({
          file,
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'pending',
          progress: 0
        });
      } else {
        errors.push(validation.error);
      }
    });

    if (errors.length > 0) {
      setError(errors.join('\n'));
    }

    if (validatedFiles.length > 0) {
      setFiles(prev => [...prev, ...validatedFiles]);
      setError('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles);
    }
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      setError('Please select files to upload.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError('');

    const formData = new FormData();
    
    // Add files to FormData
    files.forEach(file => {
      formData.append('files', file.file);
    });

    // Add metadata
    formData.append('siteId', siteId);
    formData.append('uploadType', uploadType);

    try {
      const response = await fetch(`/api/sites/${siteId}/upload-file`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Update file statuses
      setFiles(prev => prev.map(file => ({
        ...file,
        status: 'completed',
        progress: 100
      })));

      if (onUploadComplete) {
        onUploadComplete(data);
      }

    } catch (error) {
      setError(error.message);
      setFiles(prev => prev.map(file => ({
        ...file,
        status: 'error'
      })));
      
      if (onUploadError) {
        onUploadError(error);
      }
    } finally {
      setUploading(false);
    }
  };

  const uploadZip = async () => {
    if (files.length === 0) {
      setError('Please select a ZIP file to upload.');
      return;
    }

    const zipFile = files[0];
    if (!zipFile.name.toLowerCase().endsWith('.zip')) {
      setError('Please select a ZIP file.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError('');

    const formData = new FormData();
    formData.append('file', zipFile.file);
    formData.append('siteId', siteId);

    try {
      const response = await fetch(`/api/sites/${siteId}/upload-zip`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ZIP upload failed');
      }

      // Update file status
      setFiles(prev => prev.map(file => ({
        ...file,
        status: 'completed',
        progress: 100
      })));

      if (onUploadComplete) {
        onUploadComplete(data);
      }

    } catch (error) {
      setError(error.message);
      setFiles(prev => prev.map(file => ({
        ...file,
        status: 'error'
      })));
      
      if (onUploadError) {
        onUploadError(error);
      }
    } finally {
      setUploading(false);
    }
  };

  const cloneGitRepo = async () => {
    if (!gitUrl.trim()) {
      setError('Please enter a Git repository URL.');
      return;
    }

    setGitLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/sites/${siteId}/git-clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoUrl: gitUrl.trim(),
          branch: gitBranch.trim() || 'main',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Git clone failed');
      }

      if (onUploadComplete) {
        onUploadComplete(data);
      }

      // Clear form
      setGitUrl('');
      setGitBranch('main');

    } catch (error) {
      setError(error.message);
      
      if (onUploadError) {
        onUploadError(error);
      }
    } finally {
      setGitLoading(false);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'uploading':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'error':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'uploading':
        return (
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs for different upload methods */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-8">
          <button
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${uploadType === 'file' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            onClick={() => {
              setUploadType('file');
              setFiles([]);
              setError('');
            }}
          >
            File Upload
          </button>
          <button
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${uploadType === 'zip' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            onClick={() => {
              setUploadType('zip');
              setFiles([]);
              setError('');
            }}
          >
            ZIP Upload
          </button>
          <button
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${uploadType === 'git' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            onClick={() => {
              setUploadType('git');
              setFiles([]);
              setError('');
            }}
          >
            Git Clone
          </button>
        </div>
      </div>

      {/* File/ZIP Upload Area */}
      {(uploadType === 'file' || uploadType === 'zip') && (
        <>
          <div
            ref={dropAreaRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
            className={`upload-zone ${dragActive ? 'dragover' : ''} cursor-pointer transition-all`}
          >
            <div className="upload-icon">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="upload-text">
              <span className="font-semibold text-primary-600 dark:text-primary-400">Click to upload</span> or drag and drop
            </div>
            <div className="upload-hint">
              {uploadType === 'zip' 
                ? 'ZIP file containing your static site (max 100MB)'
                : `Static files (${allowedTypes.join(', ')}) up to ${formatBytes(maxSize)}`
              }
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple={uploadType === 'file' && multiple}
              accept={uploadType === 'zip' ? '.zip' : allowedTypes.join(',')}
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>

          {/* File List */}
          {showFileList && files.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Selected Files ({files.length})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map(file => (
                  <div
                    key={file.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${getStatusColor(file.status)}`}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(file.status)}
                      <div>
                        <div className="font-medium text-sm">{file.name}</div>
                        <div className="text-xs opacity-75">{formatBytes(file.size)}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {showProgress && file.status === 'uploading' && (
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          ></div>
                        </div>
                      )}
                      
                      <button
                        onClick={() => removeFile(file.id)}
                        disabled={uploading}
                        className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Git Clone Form */}
      {uploadType === 'git' && (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              <span>Supported: GitHub, GitLab, Bitbucket, and other public Git repositories</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Clone a public Git repository. The repository must contain static files (no build required).
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Git Repository URL
              </label>
              <input
                type="text"
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
                placeholder="https://github.com/username/repository.git"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Examples: https://github.com/user/repo.git, git@github.com:user/repo.git
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Branch (optional)
              </label>
              <input
                type="text"
                value={gitBranch}
                onChange={(e) => setGitBranch(e.target.value)}
                placeholder="main"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-300">Upload Error</h4>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1 whitespace-pre-line">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Upload Progress */}
      {showProgress && uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300">Uploading...</span>
            <span className="font-medium text-gray-900 dark:text-white">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex gap-3">
        {uploadType === 'git' ? (
          <button
            onClick={cloneGitRepo}
            disabled={gitLoading || !gitUrl.trim()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {gitLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Cloning Repository...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                Clone Repository
              </>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={uploadType === 'zip' ? uploadZip : uploadFiles}
              disabled={uploading || files.length === 0}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {uploadType === 'zip' ? 'Upload ZIP' : 'Upload Files'}
                </>
              )}
            </button>
            
            {files.length > 0 && (
              <button
                onClick={() => setFiles([])}
                disabled={uploading}
                className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Clear All
              </button>
            )}
          </>
        )}
      </div>
      
      {/* Upload Guidelines */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Upload Guidelines
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
          <li>• Ensure your site has an <code>index.html</code> file in the root or in a <code>public/</code>, <code>dist/</code>, or <code>build/</code> folder</li>
          <li>• Maximum file size: {formatBytes(maxSize)} per upload</li>
          <li>• No server-side code (PHP, Python, etc.) is allowed</li>
          <li>• No build processes are run on our servers</li>
          <li>• For Git repositories: Only public repositories are supported</li>
          <li>• The repository must contain pre-built static files</li>
        </ul>
        
        {uploadType === 'git' && (
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              <strong>Note:</strong> If your repository requires a build process (has package.json with build script, webpack.config.js, etc.), 
              you'll need to build it locally and upload the output folder as a ZIP file instead.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;