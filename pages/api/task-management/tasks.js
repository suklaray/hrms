import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  console.log('=== Task Management API Debug ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Environment:', process.env.NODE_ENV);
  
  try {
    // Check JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not found in environment');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    console.log('JWT_SECRET exists');

    const cookies = cookie.parse(req.headers.cookie || '');
    console.log('Parsed cookies:', Object.keys(cookies));
    
    const { token } = cookies;
    if (!token) {
      console.error('No token found in cookies');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.log('Token found');

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully:', { empid: decoded.empid, role: decoded.role });
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError.message);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    console.log(' Looking up user in database...');
    const user = await prisma.users.findUnique({
      where: { empid: decoded.empid || decoded.id },
      select: { empid: true, role: true, name: true }
    });

    if (!user) {
      console.error('User not found in database for empid:', decoded.empid || decoded.id);
      return res.status(401).json({ error: 'User not found' });
    }
    console.log('User found:', user);

    if (!['hr', 'admin', 'superadmin'].includes(user.role)) {
      console.error(' User role not authorized:', user.role);
      return res.status(401).json({ error: 'Unauthorized role' });
    }
    console.log('User role authorized:', user.role);

    if (req.method === 'GET') {
      console.log('Processing GET request for employees...');
      
      let roleFilter = [];
      if (user.role === 'superadmin') {
        roleFilter = ['admin', 'hr', 'employee'];
      } else if (user.role === 'admin') {
        roleFilter = ['hr', 'employee'];
      } else if (user.role === 'hr') {
        roleFilter = ['employee'];
      }
      console.log('Role filter:', roleFilter);

      let whereClause = { 
        status: { not: 'Inactive' },
        OR: [
          { empid: user.empid },
          ...(roleFilter.length > 0 ? [{ role: { in: roleFilter } }] : [])
        ]
      };
      console.log('Where clause:', JSON.stringify(whereClause, null, 2));

      const employees = await prisma.users.findMany({
        where: whereClause,
        select: { empid: true, name: true, email: true, role: true, employee_type: true, position: true },
        orderBy: { name: 'asc' }
      });
      console.log('Found employees:', employees.length);

      return res.status(200).json({ employees });
    }

    if (req.method === 'POST') {
      console.log('Processing POST request for task creation...');
      const { title, description, assigned_to, priority, deadline } = req.body;
      
      console.log('Task data received:', {
        title: title?.length || 0,
        description: description?.length || 0,
        assigned_to,
        priority,
        deadline
      });

      if (!title?.trim()) {
        console.error('Missing title');
        return res.status(400).json({ error: 'Title is required' });
      }
      
      if (!assigned_to?.trim()) {
        console.error('Missing assigned_to');
        return res.status(400).json({ error: 'Assigned to is required' });
      }
      
      if (!priority) {
        console.error('Missing priority');
        return res.status(400).json({ error: 'Priority is required' });
      }
      
      if (!deadline) {
        console.error('Missing deadline');
        return res.status(400).json({ error: 'Deadline is required' });
      }

      // Validate date format
      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        console.error('Invalid deadline format:', deadline);
        return res.status(400).json({ error: 'Invalid deadline format' });
      }
      console.log('Deadline parsed:', deadlineDate);

      // Check if assigned user exists
      console.log('Checking if assigned user exists...');
      const assignedUser = await prisma.users.findUnique({
        where: { empid: assigned_to },
        select: { empid: true, name: true }
      });
      
      if (!assignedUser) {
        console.error('Assigned user not found:', assigned_to);
        return res.status(400).json({ error: 'Assigned user not found' });
      }
      console.log('Assigned user found:', assignedUser);

      console.log('Creating task in database...');
      const taskData = {
        title: title.trim(),
        description: description?.trim() || null,
        assigned_to,
        assigned_by: user.empid,
        priority,
        deadline: deadlineDate,
        status: 'Pending'
      };
      console.log('Task data to create:', taskData);

      const createdTask = await prisma.tasks.create({
        data: taskData
      });
      console.log('Task created successfully:', createdTask.id);

      return res.status(201).json({ message: 'Task created successfully', taskId: createdTask.id });
    }

    console.log('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('CRITICAL ERROR in Task Management API:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    console.error('Request method:', req.method);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    
    // Database specific errors
    if (error.code === 'P2002') {
      console.error('Database constraint violation');
      return res.status(400).json({ error: 'Database constraint violation' });
    }
    
    if (error.code === 'P2025') {
      console.error('Record not found');
      return res.status(404).json({ error: 'Record not found' });
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.message,
        stack: error.stack 
      })
    });
  }
}
