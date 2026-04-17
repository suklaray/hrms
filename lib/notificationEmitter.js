// Global notification event emitter for SSE
class NotificationEmitter {
  constructor() {
    this.clients = new Map(); // Map of userId -> response objects
    this.pendingNotifications = new Map(); // Map of userId -> array of notifications
  }

  // Add a client connection
  addClient(userId, res) {
    // console.log(`SSE: Adding client ${userId}`);
    this.clients.set(userId, res);
    
    // Send any pending notifications for this user
    this.sendPendingNotifications(userId);
    
    // Clean up on client disconnect
    res.on('close', () => {
      // console.log(`SSE: Client ${userId} disconnected`);
      this.clients.delete(userId);
    });
  }

  // Send pending notifications to a newly connected user
  sendPendingNotifications(userId) {
    const pending = this.pendingNotifications.get(userId);
    if (pending && pending.length > 0) {
      // console.log(`SSE: Sending ${pending.length} pending notifications to ${userId}`);
      const client = this.clients.get(userId);
      if (client) {
        pending.forEach(notification => {
          try {
            client.write(`data: ${JSON.stringify(notification)}\n\n`);
          } catch (error) {
            console.error(`SSE: Error sending pending notification to ${userId}:`, error);
          }
        });
        // Clear pending notifications after sending
        this.pendingNotifications.delete(userId);
      }
    }
  }

  // Remove a client connection
  removeClient(userId) {
    // console.log(`SSE: Removing client ${userId}`);
    this.clients.delete(userId);
  }

  // Send notification to specific user
  sendToUser(userId, notification) {
    const client = this.clients.get(userId);
    if (client) {
      try {
        // console.log(`SSE: Sending notification to user ${userId}:`, notification.title);
        client.write(`data: ${JSON.stringify(notification)}\n\n`);
        return true;
      } catch (error) {
        // console.error(`SSE: Error sending to user ${userId}:`, error);
        this.clients.delete(userId);
        // Store as pending notification
        this.addPendingNotification(userId, notification);
        return false;
      }
    } else {
      // User not connected, store as pending notification
      // console.log(`SSE: User ${userId} not connected, storing as pending notification`);
      this.addPendingNotification(userId, notification);
      return false;
    }
  }

  // Add notification to pending queue
  addPendingNotification(userId, notification) {
    if (!this.pendingNotifications.has(userId)) {
      this.pendingNotifications.set(userId, []);
    }
    const pending = this.pendingNotifications.get(userId);
    
    // Avoid duplicates
    const exists = pending.some(n => n.id === notification.id);
    if (!exists) {
      pending.push(notification);
      // console.log(`SSE: Added pending notification for ${userId}:`, notification.title);
      
      // Limit pending notifications to prevent memory issues (keep last 10)
      if (pending.length > 10) {
        pending.shift();
      }
    }
  }

  // Send notification to all connected clients
  sendToAll(notification) {
    // console.log(`SSE: Broadcasting notification to ${this.clients.size} clients:`, notification.title);
    let successCount = 0;
    
    for (const [userId, client] of this.clients.entries()) {
      try {
        client.write(`data: ${JSON.stringify(notification)}\n\n`);
        successCount++;
      } catch (error) {
        console.error(`SSE: Error broadcasting to user ${userId}:`, error);
        this.clients.delete(userId);
      }
    }
    
    return successCount;
  }

  // Get connected client count
  getClientCount() {
    return this.clients.size;
  }

  // Get connected user IDs
  getConnectedUsers() {
    return Array.from(this.clients.keys());
  }

  // Get pending notifications count for a user
  getPendingCount(userId) {
    const pending = this.pendingNotifications.get(userId);
    return pending ? pending.length : 0;
  }
}

// Create global instance
const notificationEmitter = new NotificationEmitter();

// Export functions for use in other APIs
export const sendNotificationToUser = (userId, notification) => {
  return notificationEmitter.sendToUser(userId, notification);
};

export const sendNotificationToAll = (notification) => {
  return notificationEmitter.sendToAll(notification);
};

export const addSSEClient = (userId, res) => {
  return notificationEmitter.addClient(userId, res);
};

export const removeSSEClient = (userId) => {
  return notificationEmitter.removeClient(userId);
};

export const getSSEStats = () => {
  return {
    clientCount: notificationEmitter.getClientCount(),
    connectedUsers: notificationEmitter.getConnectedUsers()
  };
};

export const getPendingCount = (userId) => {
  return notificationEmitter.getPendingCount(userId);
};

export default notificationEmitter;