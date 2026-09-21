// Utility to safely clean up stale, accumulated tab IDs without breaking current active tabs
function clearOldTabs() {
  if (typeof window === 'undefined') return 'Not in browser environment';

  const activeTabs = JSON.parse(localStorage.getItem('activeTabs') || '[]');
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Filter out only the tabs that are older than 24 hours
  const validTabs = activeTabs.filter(tabId => {
    // Extract timestamp from your format: tab_timestamp_random
    const parts = tabId.split('_');
    if (parts.length < 2) return false; // Remove malformed strings
    
    const timestamp = parseInt(parts[1], 10);
    // Keep the tab if it's less than 24 hours old OR if it cannot be parsed
    return isNaN(timestamp) ? false : (now - timestamp) < twentyFourHours;
  });

  const removedCount = activeTabs.length - validTabs.length;

  if (removedCount > 0) {
    localStorage.setItem('activeTabs', JSON.stringify(validTabs));
    console.log(`Cleaned up ${removedCount} stale tab IDs. Remaining: ${validTabs.length}`);
  }

  return `Removed ${removedCount} stale tab IDs.`;
}

// Auto-run safe cleanup on file load without wiping active tabs
if (typeof window !== 'undefined') {
  clearOldTabs();
}

export { clearOldTabs };