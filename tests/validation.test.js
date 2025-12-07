const validation = require('../lib/validation');
const path = require('path');
const fs = require('fs').promises;
const AdmZip = require('adm-zip');

// Mock environment variables
process.env.MAX_UPLOAD_SIZE = '10485760'; // 10MB
process.env.MAX_SITES_PER_USER = '5';

describe('File Validation', () => {
  test('should validate allowed file extensions', () => {
    const allowedFiles = [
      'index.html',
      'style.css',
      'script.js',
      'image.png',
      'logo.svg',
      'font.woff2',
      'video.mp4',
      'audio.mp3',
      'document.pdf',
      'data.json',
      'readme.md',
      'config.xml'
    ];
    
    allowedFiles.forEach(filename => {
      const result = validation.validateFile({
        name: filename,
        size: 1000
      });
      expect(result.valid).toBe(true);
    });
  });
  
  test('should reject banned file extensions', () => {
    const bannedFiles = [
      'backdoor.php',
      'malicious.exe',
      'virus.bat',
      'script.sh',
      'dangerous.jar',
      'trojan.dll',
      'exploit.py',
      'attack.rb',
      'malware.pl',
      'hack.ps1'
    ];
    
    bannedFiles.forEach(filename => {
      const result = validation.validateFile({
        name: filename,
        size: 1000
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('not allowed');
    });
  });
  
  test('should reject banned filenames', () => {
    const bannedFilenames = [
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
    
    bannedFilenames.forEach(filename => {
      const result = validation.validateFile({
        name: filename,
        size: 1000
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('not permitted');
    });
  });
  
  test('should reject path traversal attempts', () => {
    const maliciousPaths = [
      '../index.html',
      '../../script.js',
      '/etc/passwd',
      'folder/../../escape.html',
      '..\\windows.exe'
    ];
    
    maliciousPaths.forEach(filename => {
      const result = validation.validateFile({
        name: filename,
        size: 1000
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('path traversal');
    });
  });
  
  test('should reject files exceeding size limit', () => {
    const largeFile = {
      name: 'large.mp4',
      size: 15 * 1024 * 1024 // 15MB > 10MB limit
    };
    
    const result = validation.validateFile(largeFile);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('too large');
  });
  
  test('should accept valid files within size limit', () => {
    const validFile = {
      name: 'image.jpg',
      size: 5 * 1024 * 1024 // 5MB < 10MB limit
    };
    
    const result = validation.validateFile(validFile);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  test('should allow .well-known directory for SSL', () => {
    const sslFiles = [
      '.well-known/acme-challenge/token',
      '.well-known/security.txt',
      '.well-known/assetlinks.json'
    ];
    
    sslFiles.forEach(filename => {
      const result = validation.validateFile({
        name: filename,
        size: 1000
      });
      expect(result.valid).toBe(true);
    });
  });
});

describe('ZIP Validation', () => {
  let tempZipPath;
  
  beforeEach(() => {
    tempZipPath = path.join(__dirname, 'temp-test.zip');
  });
  
  afterEach(async () => {
    try {
      await fs.unlink(tempZipPath);
    } catch (error) {
      // File may not exist
    }
  });
  
  test('should validate ZIP with valid static site', async () => {
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from('<!DOCTYPE html><html><body>Test</body></html>'));
    zip.addFile('style.css', Buffer.from('body { margin: 0; }'));
    zip.addFile('script.js', Buffer.from('console.log("test")'));
    zip.addFile('images/logo.png', Buffer.from('fake-png-data'));
    
    const zipBuffer = zip.toBuffer();
    const result = await validation.validateZipFile(zipBuffer, 'site.zip');
    
    expect(result.valid).toBe(true);
    expect(result.hasIndexHtml).toBe(true);
    expect(result.requiresBuild).toBe(false);
    expect(result.files.length).toBe(4);
  });
  
  test('should reject ZIP without index.html', async () => {
    const zip = new AdmZip();
    zip.addFile('readme.txt', Buffer.from('No HTML here'));
    zip.addFile('data.json', Buffer.from('{}'));
    
    const zipBuffer = zip.toBuffer();
    const result = await validation.validateZipFile(zipBuffer, 'site.zip');
    
    expect(result.valid).toBe(false);
    expect(result.hasIndexHtml).toBe(false);
    expect(result.errors[0]).toContain('index.html');
  });
  
  test('should accept index.html in static folder', async () => {
    const zip = new AdmZip();
    zip.addFile('public/index.html', Buffer.from('<html>Test</html>'));
    zip.addFile('public/style.css', Buffer.from('body {}'));
    
    const zipBuffer = zip.toBuffer();
    const result = await validation.validateZipFile(zipBuffer, 'site.zip');
    
    expect(result.valid).toBe(true);
    expect(result.hasIndexHtml).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
  
  test('should reject ZIP with build configuration', async () => {
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from('<html>Test</html>'));
    zip.addFile('package.json', Buffer.from(JSON.stringify({
      name: 'test-app',
      scripts: {
        build: 'npm run build',
        start: 'npm start'
      },
      dependencies: {
        react: '^18.0.0',
        'react-dom': '^18.0.0'
      }
    })));
    
    const zipBuffer = zip.toBuffer();
    const result = await validation.validateZipFile(zipBuffer, 'site.zip');
    
    expect(result.valid).toBe(false);
    expect(result.requiresBuild).toBe(true);
    expect(result.errors[0]).toContain('build process');
  });
  
  test('should reject ZIP with executable files', async () => {
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from('<html>Test</html>'));
    zip.addFile('malicious.exe', Buffer.from('executable content'));
    zip.addFile('backdoor.php', Buffer.from('<?php system($_GET["cmd"]); ?>'));
    
    const zipBuffer = zip.toBuffer();
    const result = await validation.validateZipFile(zipBuffer, 'site.zip');
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('not permitted'))).toBe(true);
  });
  
  test('should reject ZIP with too many files', async () => {
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from('<html>Test</html>'));
    
    // Add 10001 files (exceeds limit)
    for (let i = 0; i < 10001; i++) {
      zip.addFile(`file${i}.txt`, Buffer.from(`Content ${i}`));
    }
    
    const zipBuffer = zip.toBuffer();
    const result = await validation.validateZipFile(zipBuffer, 'site.zip');
    
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Too many files');
  });
  
  test('should detect Next.js project', async () => {
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from('<html>Test</html>'));
    zip.addFile('package.json', Buffer.from(JSON.stringify({
      dependencies: {
        next: '^14.0.0',
        react: '^18.0.0'
      },
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start'
      }
    })));
    zip.addFile('next.config.js', Buffer.from('module.exports = {}'));
    
    const zipBuffer = zip.toBuffer();
    const result = await validation.validateZipFile(zipBuffer, 'site.zip');
    
    expect(result.valid).toBe(false);
    expect(result.requiresBuild).toBe(true);
  });
  
  test('should detect React project', async () => {
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from('<html>Test</html>'));
    zip.addFile('package.json', Buffer.from(JSON.stringify({
      dependencies: {
        'react-scripts': '^5.0.0'
      },
      scripts: {
        start: 'react-scripts start',
        build: 'react-scripts build'
      }
    })));
    
    const zipBuffer = zip.toBuffer();
    const result = await validation.validateZipFile(zipBuffer, 'site.zip');
    
    expect(result.valid).toBe(false);
    expect(result.requiresBuild).toBe(true);
  });
  
  test('should detect Vue.js project', async () => {
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from('<html>Test</html>'));
    zip.addFile('package.json', Buffer.from(JSON.stringify({
      dependencies: {
        vue: '^3.0.0'
      },
      scripts: {
        serve: 'vue-cli-service serve',
        build: 'vue-cli-service build'
      }
    })));
    zip.addFile('vue.config.js', Buffer.from('module.exports = {}'));
    
    const zipBuffer = zip.toBuffer();
    const result = await validation.validateZipFile(zipBuffer, 'site.zip');
    
    expect(result.valid).toBe(false);
    expect(result.requiresBuild).toBe(true);
  });
  
  test('should handle corrupted ZIP file', async () => {
    const corruptBuffer = Buffer.from('This is not a valid ZIP file');
    
    const result = await validation.validateZipFile(corruptBuffer, 'corrupt.zip');
    
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Invalid ZIP');
  });
  
  test('should calculate total ZIP size', async () => {
    const zip = new AdmZip();
    const file1Content = 'x'.repeat(1000);
    const file2Content = 'y'.repeat(2000);
    
    zip.addFile('file1.txt', Buffer.from(file1Content));
    zip.addFile('file2.txt', Buffer.from(file2Content));
    
    const zipBuffer = zip.toBuffer();
    const result = await validation.validateZipFile(zipBuffer, 'test.zip');
    
    expect(result.totalSize).toBe(3000);
  });
});

describe('Git Repository Validation', () => {
  // Mock filesystem for git validation tests
  let tempDir;
  
  beforeAll(async () => {
    tempDir = path.join(__dirname, 'temp-repo');
    await fs.mkdir(tempDir, { recursive: true });
  });
  
  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });
  
  beforeEach(async () => {
    // Clean temp directory
    const files = await fs.readdir(tempDir);
    for (const file of files) {
      await fs.unlink(path.join(tempDir, file));
    }
  });
  
  test('should validate git URL formats', () => {
    const gitCloneService = require('../lib/git-clone');
    
    const validUrls = [
      'https://github.com/user/repo.git',
      'https://github.com/user/repo',
      'git@github.com:user/repo.git',
      'https://gitlab.com/user/repo.git',
      'https://bitbucket.org/user/repo.git',
      'https://example.com/git/repo.git'
    ];
    
    const invalidUrls = [
      'invalid-url',
      'file:///local/path',
      'git@../relative/path',
      'ssh://root@server'
    ];
    
    validUrls.forEach(url => {
      const result = gitCloneService.validateGitUrl(url);
      expect(result.valid).toBe(true);
    });
    
    invalidUrls.forEach(url => {
      const result = gitCloneService.validateGitUrl(url);
      expect(result.valid).toBe(false);
    });
  });
  
  test('should detect static site in repository', async () => {
    // Create mock repository structure
    await fs.writeFile(path.join(tempDir, 'index.html'), '<html>Test</html>');
    await fs.writeFile(path.join(tempDir, 'style.css'), 'body {}');
    
    const result = await validation.validateGitRepo('https://github.com/test/repo', tempDir);
    
    expect(result.hasIndexHtml).toBe(true);
    expect(result.requiresBuild).toBe(false);
    expect(result.valid).toBe(true);
  });
  
  test('should detect build requirements in repository', async () => {
    // Create repository with package.json containing build script
    await fs.writeFile(path.join(tempDir, 'package.json'), JSON.stringify({
      scripts: {
        build: 'npm run build'
      }
    }));
    
    const result = await validation.validateGitRepo('https://github.com/test/repo', tempDir);
    
    expect(result.requiresBuild).toBe(true);
    expect(result.buildReason).toContain('build script');
  });
  
  test('should detect Next.js repository', async () => {
    await fs.writeFile(path.join(tempDir, 'package.json'), JSON.stringify({
      dependencies: {
        next: '^14.0.0'
      }
    }));
    
    const result = await validation.validateGitRepo('https://github.com/test/repo', tempDir);
    
    expect(result.requiresBuild).toBe(true);
  });
  
  test('should detect index.html in static folder', async () => {
    await fs.mkdir(path.join(tempDir, 'public'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'public', 'index.html'), '<html>Test</html>');
    
    const result = await validation.validateGitRepo('https://github.com/test/repo', tempDir);
    
    expect(result.hasIndexHtml).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('Site Name Validation', () => {
  test('should validate site names', () => {
    const validNames = [
      'My Site',
      'portfolio-2024',
      'blog_v2',
      'test123',
      'a'
    ];
    
    const invalidNames = [
      '', // Empty
      'a', // Too short (min 2 chars)
      'x'.repeat(51), // Too long
      'Site<Script>',
      'Bad/Name',
      'Invalid|Name',
      'Test"Name',
      'Question?',
      'Asterisk*'
    ];
    
    validNames.forEach(name => {
      const result = validation.validateSiteName(name);
      expect(result.valid).toBe(true);
    });
    
    invalidNames.forEach(name => {
      const result = validation.validateSiteName(name);
      expect(result.valid).toBe(false);
    });
  });
  
  test('should generate slugs from site names', () => {
    const testCases = [
      { name: 'My Test Site', expected: 'my-test-site' },
      { name: 'Portfolio 2024', expected: 'portfolio-2024' },
      { name: 'HELLO World!', expected: 'hello-world' },
      { name: 'Test---Site', expected: 'test-site' },
      { name: '   spaced   ', expected: 'spaced' }
    ];
    
    testCases.forEach(({ name, expected }) => {
      const result = validation.validateSiteName(name);
      expect(result.slug).toBe(expected);
    });
  });
});

describe('Build Detection', () => {
  test('should detect build configuration files', () => {
    const buildFiles = [
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
      'CMakeLists.txt'
    ];
    
    buildFiles.forEach(filename => {
      const zip = new AdmZip();
      zip.addFile('index.html', Buffer.from('<html>Test</html>'));
      zip.addFile(filename, Buffer.from('build config'));
      
      // Test through validateZipFile
      const zipBuffer = zip.toBuffer();
      
      // We can't easily test the async function here, but we can test the helper
      expect(validation.buildIndicators.some(ind => ind.file === filename)).toBe(true);
    });
  });
  
  test('should identify static assets', () => {
    const staticAssets = [
      'image.jpg',
      'style.css',
      'script.js',
      'font.woff2',
      'icon.svg',
      'data.json',
      'readme.md'
    ];
    
    const nonStaticAssets = [
      'script.php',
      'backend.py',
      'executable.exe'
    ];
    
    staticAssets.forEach(filename => {
      expect(validation.isStaticAsset(filename)).toBe(true);
    });
    
    nonStaticAssets.forEach(filename => {
      expect(validation.isStaticAsset(filename)).toBe(false);
    });
  });
});

describe('Security Validation', () => {
  test('should sanitize filenames', () => {
    const testCases = [
      { input: 'file<name>.txt', expected: 'file-name-.txt' },
      { input: '../etc/passwd', expected: 'etc-passwd' },
      { input: 'file|with|pipes', expected: 'file-with-pipes' },
      { input: 'file"with"quotes', expected: 'file-with-quotes' },
      { input: 'file?with?marks', expected: 'file-with-marks' },
      { input: 'file*with*stars', expected: 'file-with-stars' },
      { input: 'file:with:colons', expected: 'file-with-colons' },
      { input: '.hiddenfile', expected: 'hiddenfile' },
      { input: 'normal-file.txt', expected: 'normal-file.txt' }
    ];
    
    testCases.forEach(({ input, expected }) => {
      expect(validation.sanitizeFilename(input)).toBe(expected);
    });
  });
  
  test('should validate file paths', () => {
    const validPaths = [
      'index.html',
      'css/style.css',
      'js/main.js',
      'images/logo.png',
      'folder/subfolder/file.txt'
    ];
    
    const invalidPaths = [
      '../escape.html',
      '../../etc/passwd',
      'folder/../../../root',
      'C:\\Windows\\file.txt',
      '/absolute/path',
      'file\u0000with\u0000nulls.txt',
      'x'.repeat(501) // Too long
    ];
    
    validPaths.forEach(filePath => {
      const result = validation.validateFilePath(filePath);
      expect(result.valid).toBe(true);
    });
    
    invalidPaths.forEach(filePath => {
      const result = validation.validateFilePath(filePath);
      expect(result.valid).toBe(false);
    });
  });
  
  test('should detect HTML content', () => {
    const htmlContent = [
      '<!DOCTYPE html><html><body>Test</body></html>',
      '<html>\n<head>\n<title>Test</title>\n</head>\n</html>',
      '   <html>',
      '\n\n<html>'
    ];
    
    const nonHtmlContent = [
      'This is plain text',
      '{ "json": "data" }',
      '<?xml version="1.0"?>',
      '# Markdown header',
      '',
      '   '
    ];
    
    htmlContent.forEach(content => {
      expect(validation.isHtmlContent(content)).toBe(true);
    });
    
    nonHtmlContent.forEach(content => {
      expect(validation.isHtmlContent(content)).toBe(false);
    });
  });
});

describe('Helper Functions', () => {
  test('should format bytes correctly', () => {
    const testCases = [
      { bytes: 0, expected: '0 Bytes' },
      { bytes: 1024, expected: '1 KB' },
      { bytes: 1024 * 1024, expected: '1 MB' },
      { bytes: 1024 * 1024 * 1024, expected: '1 GB' },
      { bytes: 1024 * 1024 * 1024 * 1024, expected: '1 TB' },
      { bytes: 1500, expected: '1.46 KB' },
      { bytes: 1500000, expected: '1.43 MB' }
    ];
    
    testCases.forEach(({ bytes, expected }) => {
      expect(validation.formatBytes(bytes)).toBe(expected);
    });
  });
  
  test('should generate unique slugs', () => {
    const testCases = [
      'My Test Site',
      'HELLO WORLD',
      'Test---Site---Name',
      '   Trimmed   Name   ',
      'Special!@#$%Chars',
      'Multiple   Spaces',
      'UPPERCASE-LOWERCASE'
    ];
    
    testCases.forEach(name => {
      const result = validation.generateSlug(name);
      expect(result).toMatch(/^[a-z0-9-]+$/); // Only lowercase, numbers, hyphens
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result).not.toMatch(/^-|-$/); // No leading/trailing hyphens
      expect(result).not.toMatch(/--+/); // No multiple consecutive hyphens
    });
  });
});

describe('Edge Cases', () => {
  test('should handle empty ZIP file', async () => {
    const zip = new AdmZip();
    const zipBuffer = zip.toBuffer();
    
    const result = await validation.validateZipFile(zipBuffer, 'empty.zip');
    
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('index.html');
  });
  
  test('should handle ZIP with only directories', async () => {
    const zip = new AdmZip();
    zip.addFile('css/', Buffer.alloc(0)); // Directory entry
    zip.addFile('js/', Buffer.alloc(0));
    
    const zipBuffer = zip.toBuffer();
    const result = await validation.validateZipFile(zipBuffer, 'dirs-only.zip');
    
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('index.html');
  });
  
  test('should handle very long filenames', async () => {
    const longFilename = 'x'.repeat(300) + '.html';
    const zip = new AdmZip();
    zip.addFile(longFilename, Buffer.from('<html>Test</html>'));
    
    const zipBuffer = zip.toBuffer();
    const result = await validation.validateZipFile(zipBuffer, 'long-filenames.zip');
    
    // Should still work, but might have warnings
    expect(result.hasIndexHtml).toBe(true);
  });
  
  test('should handle nested directory structures', async () => {
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from('<html>Test</html>'));
    zip.addFile('assets/css/main.css', Buffer.from('body {}'));
    zip.addFile('assets/js/app.js', Buffer.from('console.log("test")'));
    zip.addFile('assets/images/logo.png', Buffer.from('fake'));
    zip.addFile('pages/about.html', Buffer.from('<h1>About</h1>'));
    zip.addFile('pages/contact.html', Buffer.from('<h1>Contact</h1>'));
    
    const zipBuffer = zip.toBuffer();
    const result = await validation.validateZipFile(zipBuffer, 'nested.zip');
    
    expect(result.valid).toBe(true);
    expect(result.files.length).toBe(6);
  });
});