// Auto-logout scheduler
let schedulerInterval = null;

export function startAutoLogoutScheduler() {
  // Run every hour (3600000 ms)
  schedulerInterval = setInterval(async () => {
    try {
      console.log('Running auto-logout check...');
      
      // Call the auto-logout API
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/attendance/auto-logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      console.log('Auto-logout result:', result);
      
    } catch (error) {
      console.error('Auto-logout scheduler error:', error);
    }
  }, 3600000); // Run every hour
  
  console.log('Auto-logout scheduler started');
}

export function stopAutoLogoutScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('Auto-logout scheduler stopped');
  }
}