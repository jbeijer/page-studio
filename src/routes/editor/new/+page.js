// Client-side load function
export function load({ url, data }) {
  console.log('Client load function for /editor/new/ running with data:', data);

  // Create a consistent data object regardless of where the data comes from
  return {
    // Get format from URL query parameter or from server data
    format: url.searchParams.get('format') || data?.format || 'A4',
    // Pass any flags from server-side
    isServerSideMinimal: data?.isServerSideMinimal || false,
    isNewDocument: true,
    // Add a timestamp to ensure the URL is unique if needed
    timestamp: Date.now()
  };
}

// Explicitly mark this as client-side rendering only
export const ssr = false;
export const csr = true;

// No prerendering
export const prerender = false;

// Handle errors
export const handleError = ({ error }) => {
  console.error('New document route error:', error);
  
  if (error.message && (
      error.message.includes('is not defined') ||
      error.message.includes('Cannot read properties') ||
      error.message.includes('is not a function') ||
      error.message.includes('Failed to fetch')
  )) {
    return {
      isClientError: true,
      format: 'A4',
      message: 'Client-side initialization error',
      error: 'There was a problem creating a new document. Please try refreshing the page.'
    };
  }
  
  return {
    isClientError: true,
    format: 'A4',
    message: 'Error creating document',
    error: error.message
  };
};