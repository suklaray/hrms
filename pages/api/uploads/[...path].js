import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { path: filePath } = req.query;
  const fullPath = path.join(process.cwd(), 'public', 'uploads', ...filePath);

  if (!fs.existsSync(fullPath)) {
    const defaultImagePath = path.join(process.cwd(), 'public', 'images', 'profile.png');
    if (fs.existsSync(defaultImagePath)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      const fileStream = fs.createReadStream(defaultImagePath);
      return fileStream.pipe(res);
    }
    return res.status(404).json({ error: 'File not found' });
  }

  const stat = fs.statSync(fullPath);
  if (!stat.isFile()) {
    return res.status(404).json({ error: 'Not a file' });
  }

  const ext = path.extname(fullPath).toLowerCase();
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  
  const fileStream = fs.createReadStream(fullPath);
  fileStream.pipe(res);
}