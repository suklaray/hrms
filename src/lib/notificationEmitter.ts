// Global notification event emitter for SSE
class NotificationEmitter {
  clients: Map<string, Set<any>> = new Map();
  pendingNotifications: Map<string, any[]> = new Map();

  constructor() {
    this.clients = new Map();
    this.pendingNotifications = new Map();
  }

  // Add a client connection
  addClient(userId: string | number, res: any) {
    const key = String(userId);
    if (!this.clients.has(key)) {
      this.clients.set(key, new Set());
    }
    this.clients.get(key)!.add(res);

    // Send any pending notifications for this user
    this.sendPendingNotifications(key);

    // Clean up on client disconnect
    res.on("close", () => {
      const userClients = this.clients.get(key);
      if (userClients) {
        userClients.delete(res);
        if (userClients.size === 0) {
          this.clients.delete(key);
        }
      }
    });
  }

  // Send pending notifications to a newly connected user
  sendPendingNotifications(userId: string | number) {
    const key = String(userId);
    const pending = this.pendingNotifications.get(key);
    if (pending && pending.length > 0) {
      const userClients = this.clients.get(key);
      if (userClients && userClients.size > 0) {
        pending.forEach((notification) => {
          for (const client of Array.from(userClients)) {
            try {
              client.write(`data: ${JSON.stringify(notification)}\n\n`);
            } catch {
              userClients.delete(client);
            }
          }
        });
        // Clear pending notifications after sending
        this.pendingNotifications.delete(key);
      }
    }
  }

  // Remove a client connection
  removeClient(userId: string | number, res?: any) {
    const key = String(userId);
    if (res) {
      const userClients = this.clients.get(key);
      if (userClients) {
        userClients.delete(res);
        if (userClients.size === 0) {
          this.clients.delete(key);
        }
      }
    } else {
      this.clients.delete(key);
    }
  }

  // Send notification to specific user
  sendToUser(userId: string | number, notification: any) {
    const key = String(userId);
    const userClients = this.clients.get(key);
    if (userClients && userClients.size > 0) {
      let delivered = false;
      for (const client of Array.from(userClients)) {
        try {
          client.write(`data: ${JSON.stringify(notification)}\n\n`);
          delivered = true;
        } catch {
          userClients.delete(client);
        }
      }
      if (userClients.size === 0) {
        this.clients.delete(key);
      }
      if (!delivered) {
        this.addPendingNotification(key, notification);
      }
      return delivered;
    } else {
      // User not connected, store as pending notification
      this.addPendingNotification(key, notification);
      return false;
    }
  }

  // Add notification to pending queue
  addPendingNotification(userId: string | number, notification: any) {
    const key = String(userId);
    if (!this.pendingNotifications.has(key)) {
      this.pendingNotifications.set(key, []);
    }
    const pending = this.pendingNotifications.get(key)!;

    // Avoid duplicates
    const exists = pending.some((n: any) => n.id === notification.id);
    if (!exists) {
      pending.push(notification);

      // Limit pending notifications to prevent memory issues (keep last 10)
      if (pending.length > 10) {
        pending.shift();
      }
    }
  }

  // Send notification to all connected clients
  sendToAll(notification: any) {
    let successCount = 0;

    for (const [userId, userClients] of this.clients.entries()) {
      for (const client of Array.from(userClients)) {
        try {
          client.write(`data: ${JSON.stringify(notification)}\n\n`);
          successCount++;
        } catch {
          userClients.delete(client);
        }
      }
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }

    return successCount;
  }

  // Get connected client count
  getClientCount() {
    let total = 0;
    for (const userClients of this.clients.values()) {
      total += userClients.size;
    }
    return total;
  }

  // Get connected user IDs
  getConnectedUsers() {
    return Array.from(this.clients.keys());
  }

  // Get pending notifications count for a user
  getPendingCount(userId: string | number) {
    const key = String(userId);
    const pending = this.pendingNotifications.get(key);
    return pending ? pending.length : 0;
  }
}

// Create global instance
const notificationEmitter = new NotificationEmitter();

// Export functions for use in other APIs
export const sendNotificationToUser = (userId: any, notification: any) => {
  return notificationEmitter.sendToUser(userId, notification);
};

export const sendNotificationToAll = (notification: any) => {
  return notificationEmitter.sendToAll(notification);
};

export const addSSEClient = (userId: any, res: any) => {
  return notificationEmitter.addClient(userId, res);
};

export const removeSSEClient = (userId: any, res?: any) => {
  return notificationEmitter.removeClient(userId, res);
};

export const getSSEStats = () => {
  return {
    clientCount: notificationEmitter.getClientCount(),
    connectedUsers: notificationEmitter.getConnectedUsers(),
  };
};

export const getPendingCount = (userId: any) => {
  return notificationEmitter.getPendingCount(userId);
};

export default notificationEmitter;