const simpleGit = require('simple-git');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const os = require('os');
const crypto = require('crypto');

class GitCloneService {
    constructor() {
        this.git = simpleGit();
        this.tempDir = path.join(os.tmpdir(), 'statichost-git');
        
        // Ensure temp directory exists
        this.ensureTempDir();
    }
    
    async ensureTempDir() {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (error) {
            console.error('Error creating temp directory:', error);
        }
    }
    
    // Generate unique temp directory for cloning
    generateTempPath() {
        const randomId = crypto.randomBytes(8).toString('hex');
        return path.join(this.tempDir, `clone-${randomId}`);
    }
    
    // Validate Git URL
    validateGitUrl(url) {
        const patterns = [
            // GitHub
            /^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+(\.git)?$/,
            /^git@github\.com:[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+(\.git)?$/,
            
            // GitLab
            /^https:\/\/gitlab\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+(\.git)?$/,
            
            // Bitbucket
            /^https:\/\/bitbucket\.org\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+(\.git)?$/,
            
            // Generic Git URLs
            /^https?:\/\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9_.-\/]+(\.git)?$/,
            /^git@[a-zA-Z0-9.-]+:[a-zA-Z0-9_.-\/]+(\.git)?$/
        ];
        
        // Check if URL matches any pattern
        const isValid = patterns.some(pattern => pattern.test(url));
        
        if (!isValid) {
            return {
                valid: false,
                error: 'Invalid Git URL format. Supported: GitHub, GitLab, Bitbucket, and other public Git repositories'
            };
        }
        
        // Additional security checks
        if (url.includes('file://') || url.includes('../') || url.includes('~')) {
            return {
                valid: false,
                error: 'Git URL contains potentially unsafe patterns'
            };
        }
        
        return { valid: true };
    }
    
    // Clone repository
    async cloneRepository(repoUrl, options = {}) {
        const tempPath = this.generateTempPath();
        const startTime = Date.now();
        
        console.log(`Cloning repository: ${repoUrl} to ${tempPath}`);
        
        try {
            // Validate URL
            const urlValidation = this.validateGitUrl(repoUrl);
            if (!urlValidation.valid) {
                throw new Error(urlValidation.error);
            }
            
            // Create temp directory
            await fs.mkdir(tempPath, { recursive: true });
            
            // Clone options
            const cloneOptions = {
                '--depth': 1, // Shallow clone
                '--single-branch': true
            };
            
            // Add branch if specified
            if (options.branch) {
                cloneOptions['--branch'] = options.branch;
            }
            
            // Clone repository
            await this.git.clone(repoUrl, tempPath, cloneOptions);
            
            const cloneTime = Date.now() - startTime;
            console.log(`Repository cloned successfully in ${cloneTime}ms`);
            
            // Get repository info
            const repoInfo = await this.getRepositoryInfo(tempPath);
            
            return {
                success: true,
                tempPath,
                repoInfo,
                cloneTime
            };
            
        } catch (error) {
            console.error('Git clone error:', error);
            
            // Cleanup on error
            await this.cleanupTemp(tempPath).catch(() => {});
            
            // Provide user-friendly error messages
            let userMessage = error.message;
            
            if (error.message.includes('Authentication failed')) {
                userMessage = 'Authentication failed. Please ensure the repository is public or provide a public repository URL.';
            } else if (error.message.includes('Repository not found')) {
                userMessage = 'Repository not found. Please check the URL and ensure the repository exists and is accessible.';
            } else if (error.message.includes('could not read Username')) {
                userMessage = 'Authentication required. Please use a public repository URL or ensure the repository is publicly accessible.';
            } else if (error.message.includes('exited with code 128')) {
                userMessage = 'Git operation failed. The repository might be private, deleted, or the URL might be incorrect.';
            }
            
            throw new Error(`Failed to clone repository: ${userMessage}`);
        }
    }
    
    // Get repository information
    async getRepositoryInfo(repoPath) {
        try {
            const git = simpleGit(repoPath);
            
            const [remote, branches, log] = await Promise.all([
                git.remote(['-v']).catch(() => ''),
                git.branchLocal().catch(() => ({ current: '', branches: {} })),
                git.log({ maxCount: 1 }).catch(() => ({ latest: null }))
            ]);
            
            // Get list of files
            const files = await this.listFiles(repoPath);
            
            // Check for common static site configurations
            const hasPackageJson = files.some(f => f.endsWith('package.json'));
            const hasBuildConfig = this.checkForBuildConfig(repoPath, files);
            
            return {
                remote: remote.trim(),
                currentBranch: branches.current,
                latestCommit: log.latest ? {
                    hash: log.latest.hash,
                    date: log.latest.date,
                    message: log.latest.message,
                    author: log.latest.author_name
                } : null,
                fileCount: files.length,
                hasPackageJson,
                hasBuildConfig,
                files: files.slice(0, 100) // First 100 files for preview
            };
            
        } catch (error) {
            console.error('Error getting repo info:', error);
            return {
                remote: '',
                currentBranch: '',
                latestCommit: null,
                fileCount: 0,
                hasPackageJson: false,
                hasBuildConfig: false,
                files: []
            };
        }
    }
    
    // List files in repository
    async listFiles(repoPath, maxDepth = 4) {
        try {
            const { stdout } = await execPromise(
                `find "${repoPath}" -type f -maxdepth ${maxDepth} | sed "s|^${repoPath}/||"`,
                { shell: true }
            );
            
            return stdout.trim().split('\n').filter(f => f && !f.includes('.git/'));
        } catch (error) {
            console.error('Error listing files:', error);
            return [];
        }
    }
    
    // Check for build configuration files
    checkForBuildConfig(repoPath, files) {
        const buildConfigs = [
            'package.json',
            'composer.json',
            'requirements.txt',
            'Pipfile',
            'Gemfile',
            'webpack.config.js',
            'vite.config.js',
            'next.config.js',
            'nuxt.config.js',
            'gatsby-config.js',
            'vue.config.js',
            'angular.json',
            'Makefile',
            'CMakeLists.txt',
            'Gruntfile.js',
            'Gulpfile.js',
            'rollup.config.js',
            'parcel.config.js',
            'tsconfig.json',
            'babel.config.js',
            '.babelrc',
            'postcss.config.js',
            'tailwind.config.js'
        ];
        
        return files.some(file => 
            buildConfigs.some(config => 
                file.toLowerCase().endsWith(config.toLowerCase())
            )
        );
    }
    
    // Check if repository contains static site files
    async checkForStaticSite(repoPath) {
        const validationService = require('./validation');
        
        try {
            const files = await this.listFiles(repoPath, 6); // Deeper search for static folders
            
            // Look for index.html
            let hasIndexHtml = false;
            let indexHtmlPath = '';
            
            // Check root first
            const rootIndexPath = path.join(repoPath, 'index.html');
            if (await this.fileExists(rootIndexPath)) {
                hasIndexHtml = true;
                indexHtmlPath = 'index.html';
            }
            
            // Check static folders
            const staticFolders = ['public', 'dist', 'build', 'out', '_site', 'docs', 'static'];
            let foundInStaticFolder = false;
            let staticFolderName = '';
            
            for (const folder of staticFolders) {
                const folderPath = path.join(repoPath, folder);
                if (await this.directoryExists(folderPath)) {
                    const indexPath = path.join(folderPath, 'index.html');
                    if (await this.fileExists(indexPath)) {
                        hasIndexHtml = true;
                        indexHtmlPath = path.join(folder, 'index.html');
                        foundInStaticFolder = true;
                        staticFolderName = folder;
                        break;
                    }
                }
            }
            
            // Check for build requirements
            let requiresBuild = false;
            let buildReason = '';
            let packageJsonInfo = null;
            
            // Check package.json for build scripts
            const packageJsonPath = path.join(repoPath, 'package.json');
            if (await this.fileExists(packageJsonPath)) {
                try {
                    const content = await fs.readFile(packageJsonPath, 'utf8');
                    const packageJson = JSON.parse(content);
                    
                    packageJsonInfo = {
                        name: packageJson.name,
                        version: packageJson.version,
                        scripts: packageJson.scripts || {}
                    };
                    
                    if (packageJson.scripts && packageJson.scripts.build) {
                        requiresBuild = true;
                        buildReason = 'package.json contains build script';
                        
                        // Check for specific frameworks
                        if (packageJson.dependencies) {
                            const deps = Object.keys(packageJson.dependencies);
                            const devDeps = packageJson.devDependencies ? Object.keys(packageJson.devDependencies) : [];
                            const allDeps = [...deps, ...devDeps];
                            
                            if (allDeps.includes('next')) {
                                buildReason = 'Next.js project detected - requires `next build` and `next export`';
                            } else if (allDeps.includes('gatsby')) {
                                buildReason = 'Gatsby project detected - requires `gatsby build`';
                            } else if (allDeps.includes('vuepress')) {
                                buildReason = 'VuePress project detected - requires `vuepress build`';
                            } else if (allDeps.includes('nuxt')) {
                                buildReason = 'Nuxt.js project detected - requires `nuxt generate`';
                            } else if (allDeps.includes('react-scripts')) {
                                buildReason = 'Create React App detected - requires `npm run build`';
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error parsing package.json:', error);
                }
            }
            
            // Check for other build configs
            const buildConfigFiles = files.filter(file => 
                validationService.buildIndicators.some(indicator => 
                    file.endsWith(indicator.file)
                )
            );
            
            if (buildConfigFiles.length > 0 && !requiresBuild) {
                requiresBuild = true;
                buildReason = `Build configuration files found: ${buildConfigFiles.join(', ')}`;
            }
            
            // Get total file count and size
            let totalSize = 0;
            let fileCount = 0;
            
            // Count files and calculate size (sampling for performance)
            const sampleFiles = files.slice(0, 100); // Check first 100 files
            for (const file of sampleFiles) {
                const fullPath = path.join(repoPath, file);
                try {
                    const stats = await fs.stat(fullPath);
                    if (stats.isFile()) {
                        totalSize += stats.size;
                        fileCount++;
                    }
                } catch (error) {
                    // Skip files we can't stat
                }
            }
            
            // Estimate total size (extrapolate from sample)
            const estimatedTotalSize = files.length > 0 ? 
                Math.round(totalSize * (files.length / sampleFiles.length)) : 
                totalSize;
            
            return {
                hasIndexHtml,
                indexHtmlPath,
                foundInStaticFolder,
                staticFolderName,
                requiresBuild,
                buildReason,
                packageJsonInfo,
                fileCount: files.length,
                estimatedSize: estimatedTotalSize,
                files: files.slice(0, 50) // First 50 files for display
            };
            
        } catch (error) {
            console.error('Error checking for static site:', error);
            throw error;
        }
    }
    
    // Get static site files for upload
    async getStaticSiteFiles(repoPath, staticFolder = '') {
        try {
            const sourcePath = staticFolder ? 
                path.join(repoPath, staticFolder) : 
                repoPath;
            
            if (!await this.directoryExists(sourcePath)) {
                throw new Error(`Static folder not found: ${staticFolder}`);
            }
            
            // Get all files recursively
            const files = [];
            await this.collectFiles(sourcePath, '', files);
            
            // Read file contents
            const fileContents = [];
            
            for (const file of files) {
                const fullPath = path.join(sourcePath, file);
                try {
                    const content = await fs.readFile(fullPath);
                    const stats = await fs.stat(fullPath);
                    
                    fileContents.push({
                        path: file,
                        fullPath: fullPath,
                        content: content,
                        size: stats.size,
                        mtime: stats.mtime
                    });
                } catch (error) {
                    console.error(`Error reading file ${file}:`, error);
                    // Skip files we can't read
                }
            }
            
            return {
                success: true,
                files: fileContents,
                totalSize: fileContents.reduce((sum, file) => sum + file.size, 0),
                fileCount: fileContents.length,
                sourcePath
            };
            
        } catch (error) {
            console.error('Error getting static site files:', error);
            throw error;
        }
    }
    
    // Collect files recursively
    async collectFiles(dir, relativePath, files) {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relPath = path.join(relativePath, entry.name);
                
                // Skip .git directory and other hidden/system files
                if (entry.name.startsWith('.') && entry.name !== '.well-known') {
                    continue;
                }
                
                if (entry.isDirectory()) {
                    await this.collectFiles(fullPath, relPath, files);
                } else if (entry.isFile()) {
                    files.push(relPath);
                }
            }
        } catch (error) {
            console.error(`Error collecting files from ${dir}:`, error);
        }
    }
    
    // Helper: Check if file exists
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            const stats = await fs.stat(filePath);
            return stats.isFile();
        } catch {
            return false;
        }
    }
    
    // Helper: Check if directory exists
    async directoryExists(dirPath) {
        try {
            await fs.access(dirPath);
            const stats = await fs.stat(dirPath);
            return stats.isDirectory();
        } catch {
            return false;
        }
    }
    
    // Cleanup temporary directory
    async cleanupTemp(tempPath) {
        try {
            if (tempPath && tempPath.startsWith(this.tempDir)) {
                await fs.rm(tempPath, { recursive: true, force: true });
                console.log(`Cleaned up temp directory: ${tempPath}`);
            }
        } catch (error) {
            console.error('Error cleaning up temp directory:', error);
        }
    }
    
    // Get helpful build instructions based on detected framework
    getBuildInstructions(packageJsonInfo, buildReason) {
        const instructions = [];
        
        if (buildReason.includes('Next.js')) {
            instructions.push(
                'For Next.js projects:',
                '1. Run `npm run build` (or `yarn build`)',
                '2. Run `npm run export` (or `next export`) to generate static files',
                '3. Upload the generated `out/` folder as a ZIP file'
            );
        } else if (buildReason.includes('Gatsby')) {
            instructions.push(
                'For Gatsby projects:',
                '1. Run `npm run build` (or `gatsby build`)',
                '2. Upload the generated `public/` folder as a ZIP file'
            );
        } else if (buildReason.includes('Create React App')) {
            instructions.push(
                'For Create React App projects:',
                '1. Run `npm run build`',
                '2. Upload the generated `build/` folder as a ZIP file'
            );
        } else if (buildReason.includes('Vue')) {
            instructions.push(
                'For Vue.js projects:',
                '1. Run `npm run build`',
                '2. Upload the generated `dist/` folder as a ZIP file'
            );
        } else if (buildReason.includes('Nuxt.js')) {
            instructions.push(
                'For Nuxt.js projects:',
                '1. Run `npm run generate`',
                '2. Upload the generated `dist/` folder as a ZIP file'
            );
        } else {
            instructions.push(
                'General instructions:',
                '1. Run your build command (e.g., `npm run build`, `yarn build`)',
                '2. Locate the generated static files (usually in `dist/`, `build/`, or `out/` folder)',
                '3. Upload that folder as a ZIP file'
            );
        }
        
        instructions.push(
            '',
            'Alternatively:',
            '- Use the ZIP upload option with your pre-built static files',
            '- Or use the file upload UI to upload individual files'
        );
        
        return instructions;
    }
}

// Singleton instance
const gitCloneService = new GitCloneService();

// Auto-cleanup on process exit
process.on('exit', () => {
    gitCloneService.cleanupTemp(gitCloneService.tempDir).catch(() => {});
});

process.on('SIGINT', () => {
    gitCloneService.cleanupTemp(gitCloneService.tempDir).catch(() => {});
    process.exit(0);
});

process.on('SIGTERM', () => {
    gitCloneService.cleanupTemp(gitCloneService.tempDir).catch(() => {});
    process.exit(0);
});

module.exports = gitCloneService;