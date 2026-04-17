import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { addSSEClient, removeSSEClient, getPendingCount } from '@/lib/notificationEmitter';

export default async function handler(req, res) {
  // Only allow GET requests for SSE
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const { token } = cookie.parse(req.headers.cookie || '');
    if (!token) {
      console.log('SSE: No token provided');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.empid || decoded.id;
    
    if (!userId) {
      console.log('SSE: No user ID found in token');
      return res.status(401).json({ error: 'Invalid token' });
    }

    // console.log(`SSE: Setting up connection for user ${userId}`);

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Add client to notification emitter (this will also send pending notifications)
    addSSEClient(userId, res);
    // console.log(`SSE: Client ${userId} added to emitter`);
    
    // Log current connected clients
    const stats = require('@/lib/notificationEmitter').getSSEStats();
    // console.log(`SSE: Total connected clients: ${stats.clientCount}`);
    // console.log(`SSE: Connected users: ${stats.connectedUsers.join(', ')}`);
    
    // Get pending notifications count
    const { getPendingCount } = require('@/lib/notificationEmitter');
    const pendingCount = getPendingCount(userId);
    // console.log(`SSE: User ${userId} has ${pendingCount} pending notifications`);
    
    // Send updated connection message
    res.write(`data: ${JSON.stringify({
      id: 'sse-connected',
      type: 'system',
      status: 'connected',
      title: 'Real-time notifications connected',
      message: `You will now receive instant notifications${pendingCount > 0 ? ` (${pendingCount} pending delivered)` : ''}`,
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Test notification after 2 seconds - REMOVED
    // Real notifications will be sent via other APIs

    // Keep connection alive with periodic heartbeat
    const heartbeatInterval = setInterval(() => {
      try {
        res.write(`data: ${JSON.stringify({
          id: 'heartbeat',
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        })}\n\n`);
      } catch (error) {
        // console.error(`SSE: Heartbeat error for user ${userId}:`, error);
        clearInterval(heartbeatInterval);
        removeSSEClient(userId);
      }
    }, 30000); // Send heartbeat every 30 seconds

    // Handle client disconnect
    req.on('close', () => {
      // console.log(`SSE: Client ${userId} connection closed`);
      clearInterval(heartbeatInterval);
      removeSSEClient(userId);
    });

    req.on('error', (error) => {
      // console.error(`SSE: Connection error for user ${userId}:`, error);
      clearInterval(heartbeatInterval);
      removeSSEClient(userId);
    });

  } catch (error) {
    // console.error('SSE: Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

// Disable Next.js body parsing for SSE
export const config = {
  api: {
    bodyParser: false,
  },
};