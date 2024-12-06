// Helper function to format "time ago"
function getTimeAgo(dateString) {
  if (!dateString) return 'N/A';

  const creationDate = new Date(dateString);
  const now = new Date();
  const diffMs = now - creationDate; // Difference in milliseconds
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
}

module.exports = getTimeAgo; // Export function
