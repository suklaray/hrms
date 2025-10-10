import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

export const config = {
  api: {
    bodyParser: false,
  },
};

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

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
    });

    const [fields, files] = await form.parse(req);
    const file = files.file[0];
    const description = fields.description?.[0] || '';

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Create metadata file
    const metadata = {
      name: file.originalFilename,
      description,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user.empid || user.id,
    };

    const metadataPath = path.join(uploadDir, `${file.originalFilename}.meta.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    // Rename uploaded file to original name
    const finalPath = path.join(uploadDir, file.originalFilename);
    fs.renameSync(file.filepath, finalPath);

    res.status(200).json({ 
      message: 'File uploaded successfully',
      filename: file.originalFilename 
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
}