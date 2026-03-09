import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

export default async function handler(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (req.method === 'POST') {
      const { tasks_completed, tasks_tomorrow, issues } = req.body;
      
      if (!tasks_completed || !tasks_tomorrow) {
        return res.status(400).json({ error: 'Tasks completed and tomorrow tasks are required' });
      }

      // Check if report already exists for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingReport = await prisma.daily_work_reports.findFirst({
        where: {
          empid: decoded.empid,
          report_date: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      if (existingReport) {
        // Update existing report
        const updatedReport = await prisma.daily_work_reports.update({
          where: { id: existingReport.id },
          data: {
            tasks_completed,
            tasks_tomorrow,
            issues: issues || null
          }
        });
        return res.status(200).json({ message: 'Work report updated successfully', report: updatedReport });
      } else {
        // Create new report
        const newReport = await prisma.daily_work_reports.create({
          data: {
            empid: decoded.empid,
            tasks_completed,
            tasks_tomorrow,
            issues: issues || null
          }
        });
        return res.status(201).json({ message: 'Work report submitted successfully', report: newReport });
      }
    }

    if (req.method === 'GET') {
      const reports = await prisma.daily_work_reports.findMany({
        where: { empid: decoded.empid },
        orderBy: { report_date: 'desc' },
        take: 10
      });
      return res.status(200).json(reports);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Work report error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}