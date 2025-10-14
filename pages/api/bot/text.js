import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const uploadDir = path.join(process.cwd(), 'hr-assistant-data');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    const { filename, content } = req.body;

    if (!filename || !content) {
      return res.status(400).json({ error: 'Filename and content are required' });
    }

    // Create the file
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, content, 'utf8');

    // Create metadata file
    const metadata = {
      name: filename,
      description: '',
      size: Buffer.byteLength(content, 'utf8'),
      uploadedAt: new Date().toISOString(),
      uploadedBy: user.empid || user.id,
    };

    const metadataPath = path.join(uploadDir, `${filename}.meta.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    res.status(200).json({ 
      message: 'Content saved successfully',
      filename 
    });

  } catch (error) {
    console.error('Text save error:', error);
    res.status(500).json({ error: 'Save failed' });
  }
}