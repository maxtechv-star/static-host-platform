const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');
const AdmZip = require('adm-zip');

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.S3_BUCKET = 'test-bucket';
process.env.S3_KEY = 'test-key';
process.env.S3_SECRET = 'test-secret';
process.env.MAX_UPLOAD_SIZE = '10485760'; // 10MB
process.env.MAX_SITES_PER_USER = '5';

// Mock S3 service
jest.mock('../lib/s3', () => {
  return {
    uploadFile: jest.fn().mockResolvedValue({
      success: true,
      url: 'https://test.com/file.txt'
    }),
    uploadFileBuffer: jest.fn().mockResolvedValue({
      success: true,
      url: 'https://test.com/file.txt'
    }),
    deleteFile: jest.fn().mockResolvedValue({ success: true }),
    listFiles: jest.fn().mockResolvedValue({ files: [] }),
    isValidStaticFile: jest.fn().mockReturnValue(true)
  };
});

// Mock email service
jest.mock('../lib/email', () => {
  return {
    sendSiteActivationEmail: jest.fn().mockResolvedValue({ success: true }),
    sendVerificationEmail: jest.fn().mockResolvedValue({ success: true })
  };
});

// Mock git clone service
jest.mock('../lib/git-clone', () => {
  return {
    cloneRepository: jest.fn().mockResolvedValue({
      success: true,
      tempPath: '/tmp/test-repo',
      repoInfo: { fileCount: 2, hasBuildConfig: false }
    }),
    checkForStaticSite: jest.fn().mockResolvedValue({
      hasIndexHtml: true,
      requiresBuild: false
    }),
    getStaticSiteFiles: jest.fn().mockResolvedValue({
      success: true,
      files: [
        {
          path: 'index.html',
          content: Buffer.from('<html>Test</html>'),
          size: 20
        },
        {
          path: 'style.css',
          content: Buffer.from('body { color: red; }'),
          size: 25
        }
      ],
      totalSize: 45
    }),
    cleanupTemp: jest.fn().mockResolvedValue()
  };
});

let app;
let mongod;
let db;
let testUserId;
let testSiteId;
let authToken;

beforeAll(async () => {
  // Start in-memory MongoDB
  mongod = await MongoMemoryServer.create();
  const mongoUri = mongod.getUri();
  process.env.MONGO_URI = mongoUri;
  
  // Initialize app after setting env vars
  app = require('../pages/api/sites/[id]/upload-zip');
  
  // Get database connection
  const dbLib = require('../lib/db');
  await dbLib.connect();
  db = dbLib;
  
  // Create test user
  const usersCollection = await db.getCollection('users');
  const userResult = await usersCollection.insertOne({
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hashedpassword',
    roles: ['user'],
    emailVerified: true,
    createdAt: new Date(),
    quota: {
      maxSites: 5,
      maxStorage: 100 * 1024 * 1024,
      usedSites: 0,
      usedStorage: 0
    }
  });
  testUserId = userResult.insertedId;
  
  // Create test site
  const sitesCollection = await db.getCollection('sites');
  const siteResult = await sitesCollection.insertOne({
    ownerId: testUserId,
    name: 'Test Site',
    slug: 'test-site',
    status: 'pending',
    quotaUsed: 0,
    fileCount: 0,
    createdAt: new Date()
  });
  testSiteId = siteResult.insertedId.toString();
  
  // Generate auth token
  const AuthService = require('../lib/auth');
  authToken = AuthService.generateToken({
    _id: testUserId,
    email: 'test@example.com',
    name: 'Test User',
    roles: ['user']
  });
});

afterAll(async () => {
  if (mongod) {
    await mongod.stop();
  }
  if (db) {
    await db.close();
  }
});

beforeEach(async () => {
  // Clear all collections before each test
  const collections = await db.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
  
  // Re-create test data
  const usersCollection = await db.getCollection('users');
  const userResult = await usersCollection.insertOne({
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hashedpassword',
    roles: ['user'],
    emailVerified: true,
    createdAt: new Date(),
    quota: {
      maxSites: 5,
      maxStorage: 100 * 1024 * 1024,
      usedSites: 0,
      usedStorage: 0
    }
  });
  testUserId = userResult.insertedId;
  
  const sitesCollection = await db.getCollection('sites');
  const siteResult = await sitesCollection.insertOne({
    ownerId: testUserId,
    name: 'Test Site',
    slug: 'test-site',
    status: 'pending',
    quotaUsed: 0,
    fileCount: 0,
    createdAt: new Date()
  });
  testSiteId = siteResult.insertedId.toString();
  
  // Reset mocks
  jest.clearAllMocks();
});

describe('ZIP Upload API', () => {
  test('should upload valid ZIP file', async () => {
    // Create a test ZIP file with static site
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from('<html><body>Test</body></html>'));
    zip.addFile('style.css', Buffer.from('body { color: red; }'));
    const zipBuffer = zip.toBuffer();
    
    const response = await request(app)
      .post(`/api/sites/${testSiteId}/upload-zip`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', zipBuffer, 'site.zip');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('ZIP uploaded successfully');
  });
  
  test('should reject ZIP without index.html', async () => {
    const zip = new AdmZip();
    zip.addFile('readme.txt', Buffer.from('No index.html here'));
    const zipBuffer = zip.toBuffer();
    
    const response = await request(app)
      .post(`/api/sites/${testSiteId}/upload-zip`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', zipBuffer, 'site.zip');
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('index.html');
  });
  
  test('should reject ZIP with build configuration', async () => {
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from('<html>Test</html>'));
    zip.addFile('package.json', Buffer.from(JSON.stringify({
      scripts: { build: 'npm run build' }
    })));
    const zipBuffer = zip.toBuffer();
    
    const response = await request(app)
      .post(`/api/sites/${testSiteId}/upload-zip`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', zipBuffer, 'site.zip');
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('build process');
  });
  
  test('should reject ZIP with malicious files', async () => {
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from('<html>Test</html>'));
    zip.addFile('malicious.php', Buffer.from('<?php system($_GET["cmd"]); ?>'));
    const zipBuffer = zip.toBuffer();
    
    const response = await request(app)
      .post(`/api/sites/${testSiteId}/upload-zip`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', zipBuffer, 'site.zip');
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('not permitted');
  });
  
  test('should reject ZIP exceeding size limit', async () => {
    // Create a large file (exceeds 10MB limit)
    const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from('<html>Test</html>'));
    zip.addFile('large.bin', Buffer.from(largeContent));
    const zipBuffer = zip.toBuffer();
    
    const response = await request(app)
      .post(`/api/sites/${testSiteId}/upload-zip`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', zipBuffer, 'site.zip');
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('too large');
  });
  
  test('should require authentication', async () => {
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from('<html>Test</html>'));
    const zipBuffer = zip.toBuffer();
    
    const response = await request(app)
      .post(`/api/sites/${testSiteId}/upload-zip`)
      .attach('file', zipBuffer, 'site.zip');
    
    expect(response.status).toBe(401);
    expect(response.body.error).toContain('token');
  });
  
  test('should only allow site owner to upload', async () => {
    // Create another user
    const usersCollection = await db.getCollection('users');
    const otherUser = await usersCollection.insertOne({
      email: 'other@example.com',
      name: 'Other User',
      passwordHash: 'hashed',
      roles: ['user'],
      emailVerified: true
    });
    
    const AuthService = require('../lib/auth');
    const otherToken = AuthService.generateToken({
      _id: otherUser.insertedId,
      email: 'other@example.com',
      name: 'Other User',
      roles: ['user']
    });
    
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from('<html>Test</html>'));
    const zipBuffer = zip.toBuffer();
    
    const response = await request(app)
      .post(`/api/sites/${testSiteId}/upload-zip`)
      .set('Authorization', `Bearer ${otherToken}`)
      .attach('file', zipBuffer, 'site.zip');
    
    expect(response.status).toBe(403);
    expect(response.body.error).toContain('not authorized');
  });
});

describe('Git Clone API', () => {
  test('should clone valid git repository', async () => {
    const response = await request(app)
      .post(`/api/sites/${testSiteId}/git-clone`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        repoUrl: 'https://github.com/example/static-site.git',
        branch: 'main'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('cloned successfully');
  });
  
  test('should reject repository requiring build', async () => {
    // Mock git clone service to return repo with build requirements
    const gitCloneService = require('../lib/git-clone');
    gitCloneService.checkForStaticSite.mockResolvedValueOnce({
      hasIndexHtml: true,
      requiresBuild: true,
      buildReason: 'package.json contains build script'
    });
    
    const response = await request(app)
      .post(`/api/sites/${testSiteId}/git-clone`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        repoUrl: 'https://github.com/example/react-app.git',
        branch: 'main'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('build process');
  });
  
  test('should reject invalid git URL', async () => {
    const response = await request(app)
      .post(`/api/sites/${testSiteId}/git-clone`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        repoUrl: 'invalid-url',
        branch: 'main'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid Git URL');
  });
  
  test('should accept repository with index.html in static folder', async () => {
    // Mock to return site with index.html in public folder
    const gitCloneService = require('../lib/git-clone');
    gitCloneService.checkForStaticSite.mockResolvedValueOnce({
      hasIndexHtml: true,
      foundInStaticFolder: true,
      staticFolderName: 'public',
      requiresBuild: false
    });
    
    const response = await request(app)
      .post(`/api/sites/${testSiteId}/git-clone`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        repoUrl: 'https://github.com/example/static-site.git',
        branch: 'main'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.warnings).toBeDefined();
  });
});

describe('File Upload API', () => {
  test('should upload single file', async () => {
    const response = await request(app)
      .post(`/api/sites/${testSiteId}/upload-file`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from('<html>Test</html>'), 'index.html');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
  
  test('should reject file with banned extension', async () => {
    const response = await request(app)
      .post(`/api/sites/${testSiteId}/upload-file`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from('<?php echo "test"; ?>'), 'malicious.php');
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('not allowed');
  });
  
  test('should reject file with suspicious name', async () => {
    const response = await request(app)
      .post(`/api/sites/${testSiteId}/upload-file`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from('test'), '.htaccess');
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('not permitted');
  });
  
  test('should upload multiple files', async () => {
    const response = await request(app)
      .post(`/api/sites/${testSiteId}/upload-file`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('files', Buffer.from('<html>Test</html>'), 'index.html')
      .attach('files', Buffer.from('body { color: red; }'), 'style.css')
      .attach('files', Buffer.from('console.log("test")'), 'script.js');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.files).toHaveLength(3);
  });
});

describe('Upload Validation', () => {
  test('should validate file size', () => {
    const validation = require('../lib/validation');
    
    const validFile = {
      name: 'test.html',
      size: 1024 * 1024 // 1MB
    };
    
    const invalidFile = {
      name: 'test.html',
      size: 20 * 1024 * 1024 // 20MB
    };
    
    const validResult = validation.validateFile(validFile);
    const invalidResult = validation.validateFile(invalidFile);
    
    expect(validResult.valid).toBe(true);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors[0]).toContain('too large');
  });
  
  test('should validate file extensions', () => {
    const validation = require('../lib/validation');
    
    const validFiles = [
      { name: 'index.html', size: 1000 },
      { name: 'style.css', size: 1000 },
      { name: 'script.js', size: 1000 },
      { name: 'image.png', size: 1000 },
      { name: 'document.pdf', size: 1000 }
    ];
    
    const invalidFiles = [
      { name: 'malicious.php', size: 1000 },
      { name: 'script.exe', size: 1000 },
      { name: 'backdoor.sh', size: 1000 },
      { name: 'virus.bat', size: 1000 }
    ];
    
    validFiles.forEach(file => {
      const result = validation.validateFile(file);
      expect(result.valid).toBe(true);
    });
    
    invalidFiles.forEach(file => {
      const result = validation.validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('not allowed');
    });
  });
  
  test('should validate banned filenames', () => {
    const validation = require('../lib/validation');
    
    const bannedFiles = [
      { name: '.htaccess', size: 1000 },
      { name: 'wp-config.php', size: 1000 },
      { name: 'config.json', size: 1000 },
      { name: '.env', size: 1000 },
      { name: 'package.json', size: 1000 }
    ];
    
    bannedFiles.forEach(file => {
      const result = validation.validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('not permitted');
    });
  });
});

describe('Site Activation', () => {
  test('should activate site after successful upload', async () => {
    // First upload a valid ZIP
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from('<html><body>Test</body></html>'));
    const zipBuffer = zip.toBuffer();
    
    const uploadResponse = await request(app)
      .post(`/api/sites/${testSiteId}/upload-zip`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', zipBuffer, 'site.zip');
    
    expect(uploadResponse.status).toBe(200);
    
    // Now activate the site
    const activateApp = require('../pages/api/sites/[id]/activate');
    const activateResponse = await request(activateApp)
      .post(`/api/sites/${testSiteId}/activate`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(activateResponse.status).toBe(200);
    expect(activateResponse.body.success).toBe(true);
    
    // Verify site status changed to active
    const sitesCollection = await db.getCollection('sites');
    const site = await sitesCollection.findOne({ _id: new ObjectId(testSiteId) });
    expect(site.status).toBe('active');
  });
  
  test('should send activation email', async () => {
    const emailService = require('../lib/email');
    
    // Activate site
    const activateApp = require('../pages/api/sites/[id]/activate');
    const response = await request(activateApp)
      .post(`/api/sites/${testSiteId}/activate`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(emailService.sendSiteActivationEmail).toHaveBeenCalled();
  });
  
  test('should not activate site with no files', async () => {
    const activateApp = require('../pages/api/sites/[id]/activate');
    const response = await request(activateApp)
      .post(`/api/sites/${testSiteId}/activate`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('no files');
  });
});

describe('Quota Management', () => {
  test('should enforce storage quota', async () => {
    // Mock user with limited storage
    const usersCollection = await db.getCollection('users');
    await usersCollection.updateOne(
      { _id: testUserId },
      { $set: { 'quota.maxStorage': 1000 } } // 1KB limit
    );
    
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from('x'.repeat(2000))); // 2KB file
    const zipBuffer = zip.toBuffer();
    
    const response = await request(app)
      .post(`/api/sites/${testSiteId}/upload-zip`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', zipBuffer, 'site.zip');
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('quota');
  });
  
  test('should enforce site count quota', async () => {
    // Mock user with 0 remaining sites
    const usersCollection = await db.getCollection('users');
    await usersCollection.updateOne(
      { _id: testUserId },
      { $set: { 'quota.usedSites': 5, 'quota.maxSites': 5 } }
    );
    
    // Try to upload to a new site
    const sitesCollection = await db.getCollection('sites');
    const newSite = await sitesCollection.insertOne({
      ownerId: testUserId,
      name: 'New Site',
      slug: 'new-site',
      status: 'pending'
    });
    const newSiteId = newSite.insertedId.toString();
    
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from('<html>Test</html>'));
    const zipBuffer = zip.toBuffer();
    
    const response = await request(app)
      .post(`/api/sites/${newSiteId}/upload-zip`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', zipBuffer, 'site.zip');
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('site limit');
  });
});

describe('Error Handling', () => {
  test('should handle corrupted ZIP files', async () => {
    const corruptBuffer = Buffer.from('This is not a valid ZIP file');
    
    const response = await request(app)
      .post(`/api/sites/${testSiteId}/upload-zip`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', corruptBuffer, 'site.zip');
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid ZIP');
  });
  
  test('should handle S3 upload errors', async () => {
    // Mock S3 to throw error
    const s3Service = require('../lib/s3');
    s3Service.uploadFileBuffer.mockRejectedValueOnce(new Error('S3 upload failed'));
    
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from('<html>Test</html>'));
    const zipBuffer = zip.toBuffer();
    
    const response = await request(app)
      .post(`/api/sites/${testSiteId}/upload-zip`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', zipBuffer, 'site.zip');
    
    expect(response.status).toBe(500);
    expect(response.body.error).toContain('Failed to upload');
  });
  
  test('should handle non-existent site', async () => {
    const nonExistentSiteId = new ObjectId().toString();
    
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from('<html>Test</html>'));
    const zipBuffer = zip.toBuffer();
    
    const response = await request(app)
      .post(`/api/sites/${nonExistentSiteId}/upload-zip`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', zipBuffer, 'site.zip');
    
    expect(response.status).toBe(404);
    expect(response.body.error).toContain('not found');
  });
});