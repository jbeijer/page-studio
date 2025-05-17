// Error handling for fetch operations
let isFetchErrorHandled = false;

// Global error handler for fetch operations
window.addEventListener('error', function(event) {
  if (event.message.includes('Failed to fetch') && !isFetchErrorHandled) {
    isFetchErrorHandled = true;
    
    console.warn('Network error detected. This is likely because the development server is not running.');
    
    // Only show this warning once per session
    const lastErrorShown = sessionStorage.getItem('lastFetchErrorShown');
    const now = Date.now();
    
    if (!lastErrorShown || (now - parseInt(lastErrorShown)) > 300000) { // 5 minutes
      console.info('You can safely ignore WebSocket warning messages when using this app.');
      sessionStorage.setItem('lastFetchErrorShown', now.toString());
    }
  }
});

// When the app is loaded
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    console.log('PageStudio app loaded');
    
    // Add any app initialization code here
    
    // Disable HMR-related warnings in console
    const originalConsoleWarn = console.warn;
    console.warn = function() {
      if (
        arguments[0] && 
        typeof arguments[0] === 'string' && 
        (
          arguments[0].includes('WebSocket') || 
          arguments[0].includes('HMR') ||
          arguments[0].includes('Failed to fetch')
        )
      ) {
        // Ignore WebSocket/HMR-related warnings
        return;
      }
      
      // Call the original warn method for other warnings
      originalConsoleWarn.apply(console, arguments);
    };
  });
}