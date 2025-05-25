// Handle editor page on server side
export function load({ url }) {
  try {
    // Get format from URL parameters for server-side handling
    const format = url.searchParams.get('format') || 'A4';
    
    return {
      format,
      // Flag to indicate server-side rendering
      isServerSide: true
    };
  } catch (error) {
    console.error('Error in /editor/new load function:', error);
    // Return minimal data to avoid 500 errors
    return {
      format: 'A4',
      isServerSide: true,
      isErrorRecovery: true
    };
  }
}

// Explicitly mark document routes as client-side only
export const ssr = false;
export const csr = true;

// Page not suitable for prerendering
export const prerender = false;

// Handle any server-side errors with a silent response
export function handleError() {
  // Return a successful response with minimal data
  // Client-side will handle the actual data loading
  return {
    format: 'A4',
    isServerSide: true
  };
}