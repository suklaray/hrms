import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const { token } = cookie.parse(req.headers.cookie || '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.empid || decoded.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const notifications = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // Last 1 hour

    // Check for recent tasks assigned to this user
    const recentTasks = await prisma.tasks.findMany({
      where: {
        assigned_to: userId,
        created_at: {
          gte: oneHourAgo
        }
      },
      include: {
        creator: {
          select: { name: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    recentTasks.forEach(task => {
      notifications.push({
        id: `new-task-${task.id}`,
        type: 'task',
        status: 'new',
        priority: 1,
        title: 'New Task Assigned!',
        message: `📋 You have been assigned a new task: "${task.title}"\n\n👤 Assigned by: ${task.creator.name}\n📅 Deadline: ${new Date(task.deadline).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric'
        })}\n\n📍 View in Task Management`,
        bgColor: 'bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600',
        borderColor: 'border-blue-300/80',
        autoDismiss: false,
        timestamp: task.created_at.toISOString()
      });
    });

    // Check for recent leave status updates
    const recentLeaveUpdates = await prisma.leave_requests.findMany({
      where: {
        empid: userId,
        applied_at: {
          gte: oneHourAgo
        },
        status: {
          in: ['Approved', 'Rejected']
        }
      },
      orderBy: { applied_at: 'desc' }
    });

    recentLeaveUpdates.forEach(leave => {
      notifications.push({
        id: `leave-${leave.status.toLowerCase()}-${leave.id}`,
        type: 'leave',
        status: leave.status.toLowerCase(),
        title: `Leave ${leave.status}!`,
        message: leave.status === 'Approved' 
          ? `🎉 Your leave request has been approved!\n\n📅 From: ${new Date(leave.from_date).toLocaleDateString()}\n📅 To: ${new Date(leave.to_date).toLocaleDateString()}\n📝 Type: ${leave.leave_type}\n\n📍 View details in Leave Management`
          : `😔 Your leave request has been rejected.\n\n📅 From: ${new Date(leave.from_date).toLocaleDateString()}\n📅 To: ${new Date(leave.to_date).toLocaleDateString()}\n📝 Type: ${leave.leave_type}\n\n📍 View details in Leave Management`,
        bgColor: leave.status === 'Approved' 
          ? 'bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600'
          : 'bg-gradient-to-br from-red-400 via-red-500 to-red-600',
        borderColor: leave.status === 'Approved' ? 'border-green-300/80' : 'border-red-300/80',
        autoDismiss: false,
        timestamp: leave.applied_at.toISOString()
      });
    });

 
   // Check for recently added holidays from calendar_events
const recentHolidays = await prisma.calendar_events.findMany({
  where: {
    event_type: 'holiday', // 👈 filter only holidays
    event_date: {
      gte: now // upcoming holidays
    },
    created_at: {
      gte: oneHourAgo // recently added
    },
    OR: [
      { visible_to: 'all' },
      { visible_to: userId } // if you support user-specific visibility
    ]
  },
  orderBy: {
    event_date: 'asc'
  }
});

recentHolidays.forEach(event => {
  notifications.push({
    id: `holiday-${event.id}`,
    type: 'holiday',
    status: 'upcoming',
    priority: 2,
    title: '🎉 Upcoming Holiday!',
    message: `🏖️ ${event.title}\n\n📅 Date: ${new Date(event.event_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}${event.description ? `\n\n📝 ${event.description}` : ''}`,
    bgColor: 'bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-500',
    borderColor: 'border-yellow-300/80',
    autoDismiss: false,
    timestamp: event.created_at?.toISOString() // ✅ safe
  });
});
// Check for recent payroll generation
const recentPayrolls = await prisma.payroll.findMany({
  where: {
    empid: userId,
    generated_on: {
      gte: oneHourAgo
    }
  },
  orderBy: { generated_on: 'desc' }
});

recentPayrolls.forEach(payroll => {
  notifications.push({
    id: `salary-${payroll.id}`,
    type: 'payroll',
    status: payroll.payslip_status?.toLowerCase() || 'generated',
    priority: 1,
    title: '💰 Salary Processed!',
    message: `💵 Your salary for ${payroll.month} ${payroll.year} has been processed.\n\n📊 Status: ${payroll.status}\n\n📍 Check payslip in Payroll section`,
    bgColor: 'bg-gradient-to-br from-green-400 via-lime-500 to-emerald-600',
    borderColor: 'border-green-300/80',
    autoDismiss: false,
    timestamp: payroll.generated_on.toISOString()
  });
});
    // Sort notifications by timestamp (newest first)
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // console.log(`Recent notifications check for ${userId}: found ${notifications.length} notifications`);

    return res.status(200).json({ 
      success: true, 
      notifications,
      count: notifications.length
    });

  } catch (error) {
    console.error('Recent notifications check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}