const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class ValidationService {
    constructor() {
        this.maxFileSize = parseInt(process.env.MAX_UPLOAD_SIZE) || 100 * 1024 * 1024; // 100MB
        this.allowedExtensions = [
            // HTML
            '.html', '.htm',
            // CSS
            '.css',
            // JavaScript
            '.js', '.mjs',
            // Images
            '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.bmp', '.tiff',
            // Fonts
            '.woff', '.woff2', '.ttf', '.eot', '.otf',
            // Media
            '.mp3', '.mp4', '.webm', '.ogg', '.wav', '.avi', '.mov',
            // Documents
            '.pdf', '.txt', '.md', '.json', '.xml', '.csv',
            // Archives (for extraction only)
            '.zip'
        ];
        
        this.bannedExtensions = [
            '.php', '.py', '.rb', '.pl', '.sh', '.exe', '.bat', '.cmd', '.ps1',
            '.jar', '.war', '.ear', '.dll', '.so', '.dylib', '.bin'
        ];
        
        this.bannedFiles = [
            '.htaccess',
            '.htpasswd',
            'wp-config.php',
            'config.json',
            '.env',
            'package.json',
            'composer.json',
            'requirements.txt',
            'Pipfile',
            'Gemfile',
            'webpack.config.js',
            'vite.config.js',
            'next.config.js',
            'nuxt.config.js'
        ];
        
        this.buildIndicators = [
            { file: 'package.json', script: 'build' },
            { file: 'composer.json', indicator: 'autoload' },
            { file: 'requirements.txt', indicator: null },
            { file: 'Pipfile', indicator: null },
            { file: 'Gemfile', indicator: null },
            { file: 'webpack.config.js', indicator: null },
            { file: 'vite.config.js', indicator: null },
            { file: 'next.config.js', indicator: null },
            { file: 'nuxt.config.js', indicator: null },
            { file: 'gatsby-config.js', indicator: null },
            { file: 'vue.config.js', indicator: null },
            { file: 'angular.json', indicator: null },
            { file: 'Makefile', indicator: null },
            { file: 'CMakeLists.txt', indicator: null }
        ];
        
        this.staticFolders = ['public', 'dist', 'build', 'out', '_site', 'docs'];
    }
    
    // Validate uploaded file
    validateFile(file) {
        const errors = [];
        
        // Check file size
        if (file.size > this.maxFileSize) {
            errors.push(`File too large: ${file.name} (${this.formatBytes(file.size)}) exceeds maximum size of ${this.formatBytes(this.maxFileSize)}`);
        }
        
        // Get file extension
        const extension = path.extname(file.name).toLowerCase();
        
        // Check for banned extensions
        if (this.bannedExtensions.includes(extension)) {
            errors.push(`File type not allowed: ${file.name} (${extension}) is not permitted for security reasons`);
        }
        
        // Check for banned filenames
        const filename = path.basename(file.name);
        if (this.bannedFiles.includes(filename.toLowerCase())) {
            errors.push(`File not allowed: ${filename} is not permitted for security reasons`);
        }
        
        // Check for suspicious patterns
        if (filename.startsWith('.') && filename !== '.htaccess') {
            // Allow .well-known for SSL verification
            if (!filename.startsWith('.well-known')) {
                errors.push(`Hidden file not allowed: ${filename}`);
            }
        }
        
        // Check for path traversal attempts
        if (file.name.includes('..') || file.name.includes('//')) {
            errors.push(`Invalid file path: ${file.name} contains path traversal characters`);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            extension,
            filename
        };
    }
    
    // Validate ZIP file contents
    async validateZipFile(zipBuffer, zipFilename) {
        const errors = [];
        const warnings = [];
        const files = [];
        let hasIndexHtml = false;
        let requiresBuild = false;
        let buildReason = '';
        
        try {
            const zip = new AdmZip(zipBuffer);
            const zipEntries = zip.getEntries();
            
            // Check total uncompressed size
            let totalSize = 0;
            for (const entry of zipEntries) {
                if (!entry.isDirectory) {
                    totalSize += entry.header.size;
                }
            }
            
            if (totalSize > this.maxFileSize) {
                errors.push(`ZIP contents too large: ${this.formatBytes(totalSize)} exceeds maximum size of ${this.formatBytes(this.maxFileSize)}`);
            }
            
            // Check each file in the ZIP
            for (const entry of zipEntries) {
                if (entry.isDirectory) continue;
                
                const filePath = entry.entryName;
                const fileName = path.basename(filePath);
                const extension = path.extname(fileName).toLowerCase();
                
                // Check for banned extensions
                if (this.bannedExtensions.includes(extension)) {
                    errors.push(`Banned file type in ZIP: ${filePath} (${extension})`);
                    continue;
                }
                
                // Check for banned files
                if (this.bannedFiles.includes(fileName.toLowerCase())) {
                    // Special handling for package.json - check if it has build scripts
                    if (fileName.toLowerCase() === 'package.json') {
                        try {
                            const content = entry.getData().toString('utf8');
                            const packageJson = JSON.parse(content);
                            
                            if (packageJson.scripts && packageJson.scripts.build) {
                                requiresBuild = true;
                                buildReason = 'package.json contains build script';
                            }
                            
                            // Check for dependencies that require build
                            if (packageJson.dependencies || packageJson.devDependencies) {
                                warnings.push('ZIP contains package.json with dependencies - ensure this is a pre-built static site');
                            }
                        } catch (e) {
                            // Invalid JSON, treat as regular banned file
                            errors.push(`Invalid package.json in ZIP: ${filePath}`);
                        }
                    } else {
                        errors.push(`Banned file in ZIP: ${filePath}`);
                    }
                    continue;
                }
                
                // Check for build indicators
                for (const indicator of this.buildIndicators) {
                    if (fileName.toLowerCase() === indicator.file.toLowerCase()) {
                        if (indicator.file === 'package.json') {
                            // Already handled above
                        } else {
                            requiresBuild = true;
                            buildReason = `${indicator.file} found - this indicates a build process is required`;
                        }
                        break;
                    }
                }
                
                // Check for index.html
                if (fileName.toLowerCase() === 'index.html') {
                    // Check if it's in root or static folder
                    const dir = path.dirname(filePath);
                    if (dir === '' || dir === '.' || this.staticFolders.some(folder => dir.startsWith(folder))) {
                        hasIndexHtml = true;
                    }
                }
                
                // Check for suspicious PHP-like files
                if (extension === '' && fileName.includes('.php')) {
                    warnings.push(`Suspicious file in ZIP: ${filePath} - ensure this is not executable code`);
                }
                
                // Add to valid files list
                files.push({
                    path: filePath,
                    size: entry.header.size,
                    extension
                });
            }
            
            // Check if we found index.html
            if (!hasIndexHtml) {
                // Look for index.html in static folders
                let foundInStaticFolder = false;
                for (const entry of zipEntries) {
                    if (entry.isDirectory) continue;
                    
                    const fileName = path.basename(entry.entryName).toLowerCase();
                    const dir = path.dirname(entry.entryName).toLowerCase();
                    
                    if (fileName === 'index.html') {
                        // Check if it's in a recognized static folder
                        const parentDir = dir.split('/')[0];
                        if (this.staticFolders.includes(parentDir)) {
                            hasIndexHtml = true;
                            foundInStaticFolder = true;
                            warnings.push(`index.html found in ${parentDir}/ folder. Ensure your site is configured to serve from this directory.`);
                            break;
                        }
                    }
                }
                
                if (!hasIndexHtml) {
                    errors.push('No index.html found in root directory or recognized static folders (public/, dist/, build/)');
                }
            }
            
            // Check for too many files (potential abuse)
            if (files.length > 10000) {
                errors.push(`Too many files: ${files.length} files exceeds maximum of 10,000 files`);
            }
            
            // Check for build requirements
            if (requiresBuild) {
                errors.push(`This appears to require a build process: ${buildReason}. Please upload pre-built static files instead.`);
            }
            
            return {
                valid: errors.length === 0,
                errors,
                warnings,
                files,
                totalSize,
                hasIndexHtml,
                requiresBuild
            };
            
        } catch (error) {
            errors.push(`Invalid ZIP file: ${error.message}`);
            return {
                valid: false,
                errors,
                warnings: [],
                files: [],
                totalSize: 0,
                hasIndexHtml: false,
                requiresBuild: false
            };
        }
    }
    
    // Validate Git repository for static site
    async validateGitRepo(repoUrl, tempPath) {
        const errors = [];
        const warnings = [];
        let hasIndexHtml = false;
        let requiresBuild = false;
        let buildReason = '';
        
        try {
            // List files in the repository
            const { stdout } = await execPromise(`find "${tempPath}" -type f -name "*" | head -1000`);
            const files = stdout.trim().split('\n').filter(f => f);
            
            // Check for build indicators
            for (const file of files) {
                const fileName = path.basename(file).toLowerCase();
                
                // Check for package.json
                if (fileName === 'package.json') {
                    try {
                        const content = fs.readFileSync(file, 'utf8');
                        const packageJson = JSON.parse(content);
                        
                        if (packageJson.scripts && packageJson.scripts.build) {
                            requiresBuild = true;
                            buildReason = 'package.json contains build script';
                            
                            // Check for common static site generators
                            if (packageJson.dependencies) {
                                const deps = Object.keys(packageJson.dependencies);
                                if (deps.includes('next') || deps.includes('gatsby') || deps.includes('vuepress')) {
                                    buildReason = `Detected ${deps.find(d => ['next', 'gatsby', 'vuepress'].includes(d))} - requires build process`;
                                }
                            }
                        }
                    } catch (e) {
                        // Could not read/parse package.json
                    }
                }
                
                // Check for other build indicators
                for (const indicator of this.buildIndicators) {
                    if (indicator.file === 'package.json') continue;
                    
                    if (fileName === indicator.file.toLowerCase()) {
                        requiresBuild = true;
                        buildReason = `${indicator.file} found - requires build process`;
                        break;
                    }
                }
                
                // Check for index.html
                if (fileName === 'index.html') {
                    const relativePath = path.relative(tempPath, file);
                    const dir = path.dirname(relativePath);
                    
                    if (dir === '' || dir === '.' || this.staticFolders.some(folder => dir.startsWith(folder))) {
                        hasIndexHtml = true;
                    }
                }
            }
            
            // Check for index.html in static folders if not in root
            if (!hasIndexHtml) {
                for (const folder of this.staticFolders) {
                    const staticFolderPath = path.join(tempPath, folder);
                    if (fs.existsSync(staticFolderPath)) {
                        const indexPath = path.join(staticFolderPath, 'index.html');
                        if (fs.existsSync(indexPath)) {
                            hasIndexHtml = true;
                            warnings.push(`index.html found in ${folder}/ folder. Ensure your site is configured to serve from this directory.`);
                            break;
                        }
                    }
                }
            }
            
            if (!hasIndexHtml) {
                errors.push('No index.html found in root directory or recognized static folders (public/, dist/, build/)');
            }
            
            if (requiresBuild) {
                errors.push(`This repository requires a build process: ${buildReason}. Please provide a pre-built static site or use the output from your build process.`);
                
                // Provide helpful suggestions
                warnings.push('Tip: Run your build command locally (e.g., npm run build) and upload the output folder (dist/, build/, out/) as a ZIP file.');
                warnings.push('For Next.js: Use `next export` to generate static files');
                warnings.push('For React/Vue: Build your project and upload the dist/ folder');
            }
            
            // Check for suspicious files
            const suspiciousFiles = files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return this.bannedExtensions.includes(ext);
            });
            
            if (suspiciousFiles.length > 0) {
                warnings.push(`Found ${suspiciousFiles.length} files with potentially unsafe extensions`);
            }
            
            return {
                valid: errors.length === 0,
                errors,
                warnings,
                hasIndexHtml,
                requiresBuild,
                buildReason,
                fileCount: files.length
            };
            
        } catch (error) {
            errors.push(`Failed to validate repository: ${error.message}`);
            return {
                valid: false,
                errors,
                warnings: [],
                hasIndexHtml: false,
                requiresBuild: false,
                fileCount: 0
            };
        }
    }
    
    // Validate site name/slug
    validateSiteName(name) {
        const errors = [];
        const slug = this.generateSlug(name);
        
        if (!name || name.trim().length < 2) {
            errors.push('Site name must be at least 2 characters long');
        }
        
        if (name.length > 50) {
            errors.push('Site name cannot exceed 50 characters');
        }
        
        // Check for invalid characters
        const invalidChars = name.match(/[<>:"\/\\|?*]/g);
        if (invalidChars) {
            errors.push(`Site name contains invalid characters: ${invalidChars.join(', ')}`);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            slug
        };
    }
    
    // Generate URL slug from name
    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 50);
    }
    
    // Format bytes to human readable
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    
    // Check if file is static asset
    isStaticAsset(filename) {
        const ext = path.extname(filename).toLowerCase();
        return this.allowedExtensions.includes(ext);
    }
    
    // Sanitize filename
    sanitizeFilename(filename) {
        return filename
            .replace(/[<>:"\/\\|?*]/g, '-')
            .replace(/\.\./g, '')
            .replace(/^\.+/, '')
            .trim();
    }
    
    // Validate file path for security
    validateFilePath(filePath) {
        const errors = [];
        
        // Check for path traversal
        if (filePath.includes('..') || filePath.includes('//')) {
            errors.push('Path contains traversal characters');
        }
        
        // Check for absolute paths
        if (path.isAbsolute(filePath)) {
            errors.push('Absolute paths are not allowed');
        }
        
        // Check for control characters
        if (/[\x00-\x1F\x7F]/.test(filePath)) {
            errors.push('Path contains control characters');
        }
        
        // Check length
        if (filePath.length > 500) {
            errors.push('Path too long (max 500 characters)');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    // Check if content is HTML (for index.html validation)
    isHtmlContent(content) {
        if (typeof content !== 'string') return false;
        
        const trimmed = content.trim();
        return trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html');
    }
}

// Singleton instance
const validationService = new ValidationService();

module.exports = validationService;