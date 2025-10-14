import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const uploadDir = path.join(process.cwd(), 'hr-assistant-data');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify user is authenticated
    const token = req.cookies.token || req.cookies.employeeToken;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    jwt.verify(token, process.env.JWT_SECRET);

    const { filename } = req.query;
    if (!filename) {
      return res.status(400).json({ error: 'Filename required' });
    }

    const filePath = path.join(uploadDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileContent = fs.readFileSync(filePath);
    const stats = fs.statSync(filePath);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stats.size);
    
    res.send(fileContent);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
}