/**
 * Simple utility for logging navigation events.
 * This can be used for debugging in production.
 */

const logToStorage = (message) => {
  try {
    const logs = JSON.parse(localStorage.getItem('navLogs') || '[]');
    logs.push({
      timestamp: new Date().toISOString(),
      message,
      url: window.location.href,
      pathname: window.location.pathname
    });
    
    // Keep only the last 20 logs
    if (logs.length > 20) {
      logs.shift();
    }
    
    localStorage.setItem('navLogs', JSON.stringify(logs));
    console.log(`[Navigation] ${message}`);
  } catch (error) {
    console.error('Error logging navigation:', error);
  }
};

export const logNavigation = (from, to) => {
  logToStorage(`Navigation from ${from} to ${to}`);
};

export const logButtonClick = (buttonName) => {
  logToStorage(`Button clicked: ${buttonName}`);
};

export const logError = (error) => {
  logToStorage(`Error: ${error.message || error}`);
};

export const getNavigationLogs = () => {
  try {
    return JSON.parse(localStorage.getItem('navLogs') || '[]');
  } catch (error) {
    console.error('Error retrieving navigation logs:', error);
    return [];
  }
};

export const clearNavigationLogs = () => {
  localStorage.removeItem('navLogs');
};

export default {
  logNavigation,
  logButtonClick,
  logError,
  getNavigationLogs,
  clearNavigationLogs
}; 