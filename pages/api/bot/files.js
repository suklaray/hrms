import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const uploadDir = path.join(process.cwd(), 'hr-assistant-data');

export default async function handler(req, res) {
  try {
    // Verify user is superadmin
    const token = req.cookies.token || req.cookies.employeeToken;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.method === 'GET') {
      // List all files
      if (!fs.existsSync(uploadDir)) {
        return res.status(200).json({ files: [] });
      }

      const files = fs.readdirSync(uploadDir)
        .filter(file => !file.endsWith('.meta.json'))
        .map(filename => {
          const metadataPath = path.join(uploadDir, `${filename}.meta.json`);
          let metadata = { name: filename, size: 0, uploadedAt: new Date().toISOString() };
          
          if (fs.existsSync(metadataPath)) {
            try {
              metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            } catch (error) {
              console.error('Error reading metadata:', error);
            }
          } else {
            // Get file stats if no metadata
            const filePath = path.join(uploadDir, filename);
            const stats = fs.statSync(filePath);
            metadata.size = stats.size;
            metadata.uploadedAt = stats.mtime.toISOString();
          }

          return metadata;
        })
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

      res.status(200).json({ files });

    } else if (req.method === 'DELETE') {
      // Delete file
      const { filename } = req.body;
      
      if (!filename) {
        return res.status(400).json({ error: 'Filename required' });
      }

      const filePath = path.join(uploadDir, filename);
      const metadataPath = path.join(uploadDir, `${filename}.meta.json`);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }

      res.status(200).json({ message: 'File deleted successfully' });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Files API error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}