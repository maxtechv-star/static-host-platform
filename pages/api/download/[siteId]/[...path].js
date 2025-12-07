import Site from '../../../../models/Site';
import s3Service from '../../../../lib/s3';
import pathModule from 'path';

export default async function handler(req, res) {
  const { method } = req;
  const { siteId, path } = req.query;

  if (!siteId) {
    return res.status(400).json({ error: 'Site ID is required' });
  }

  try {
    switch (method) {
      case 'GET':
        await handleGet(req, res, siteId, path);
        break;

      case 'HEAD':
        await handleHead(req, res, siteId, path);
        break;

      default:
        res.setHeader('Allow', ['GET', 'HEAD']);
        res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Download API error:', error);
    
    if (error.message.includes('not found') || error.message.includes('NoSuchKey')) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req, res, siteId, filePathArray) {
  try {
    // Verify site exists and is active
    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    if (site.status !== 'active') {
      return res.status(403).json({ 
        error: 'Site is not active',
        status: site.status 
      });
    }

    // Construct file path
    const filePath = Array.isArray(filePathArray) ? 
                    filePathArray.join('/') : 
                    (filePathArray || '');
    
    // Default to index.html if no file specified
    const finalPath = filePath === '' ? 'index.html' : filePath;
    
    // Security: Prevent directory traversal
    if (finalPath.includes('..') || finalPath.includes('//')) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    // Get file from S3
    const fileContent = await s3Service.getFile(siteId, finalPath);
    
    if (!fileContent) {
      // Try with index.html if not found
      if (finalPath !== 'index.html') {
        const indexContent = await s3Service.getFile(siteId, 'index.html');
        if (indexContent) {
          return serveFile(res, indexContent, 'index.html');
        }
      }
      
      // Return 404
      return res.status(404).json({ 
        error: 'File not found',
        path: finalPath 
      });
    }

    // Serve the file
    return serveFile(res, fileContent, finalPath);

  } catch (error) {
    console.error('Download file error:', error);
    
    if (error.message.includes('NoSuchKey')) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.status(500).json({ error: 'Failed to serve file' });
  }
}

async function handleHead(req, res, siteId, filePathArray) {
  try {
    // Verify site exists and is active
    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    if (site.status !== 'active') {
      return res.status(403).json({ 
        error: 'Site is not active',
        status: site.status 
      });
    }

    // Construct file path
    const filePath = Array.isArray(filePathArray) ? 
                    filePathArray.join('/') : 
                    (filePathArray || '');
    
    // Default to index.html if no file specified
    const finalPath = filePath === '' ? 'index.html' : filePath;
    
    // Security: Prevent directory traversal
    if (finalPath.includes('..') || finalPath.includes('//')) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    // Get file metadata from S3
    const metadata = await s3Service.getFileMetadata(siteId, finalPath);
    
    if (!metadata) {
      // Try with index.html if not found
      if (finalPath !== 'index.html') {
        const indexMetadata = await s3Service.getFileMetadata(siteId, 'index.html');
        if (indexMetadata) {
          return sendMetadata(res, indexMetadata, 'index.html');
        }
      }
      
      return res.status(404).end();
    }

    // Send metadata
    return sendMetadata(res, metadata, finalPath);

  } catch (error) {
    console.error('HEAD request error:', error);
    res.status(500).end();
  }
}

function serveFile(res, content, filePath) {
  const ext = pathModule.extname(filePath).toLowerCase();
  
  // Set content type based on file extension
  const contentType = getContentType(ext);
  res.setHeader('Content-Type', contentType);
  
  // Set cache headers
  if (ext === '.html' || ext === '.htm') {
    // HTML files cache for 1 hour
    res.setHeader('Cache-Control', 'public, max-age=3600');
  } else if (['.css', '.js', '.json', '.xml'].includes(ext)) {
    // Static assets cache for 1 week
    res.setHeader('Cache-Control', 'public, max-age=604800');
  } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp'].includes(ext)) {
    // Images cache for 1 year
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (['.woff', '.woff2', '.ttf', '.eot', '.otf'].includes(ext)) {
    // Fonts cache for 1 year
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    // Default cache for 1 hour
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
  
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // CORS headers (allow all origins for public sites)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  
  // Send file content
  res.status(200).send(content);
}

function sendMetadata(res, metadata, filePath) {
  const ext = pathModule.extname(filePath).toLowerCase();
  const contentType = getContentType(ext);
  
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', metadata.size);
  res.setHeader('Last-Modified', metadata.lastModified.toUTCString());
  res.setHeader('ETag', metadata.etag);
  
  // Set cache headers
  if (ext === '.html' || ext === '.htm') {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  } else if (['.css', '.js', '.json', '.xml'].includes(ext)) {
    res.setHeader('Cache-Control', 'public, max-age=604800');
  } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp'].includes(ext)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  
  res.status(200).end();
}

function getContentType(ext) {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    
    // Images
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
    
    // Fonts
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'font/otf',
    
    // Media
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    
    // Documents
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.csv': 'text/csv'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

export const config = {
  api: {
    responseLimit: '50mb',
    bodyParser: false,
  },
};