// Client-side load function
export function load({ params, data }) {
  // Get the slug parameter
  const { slug } = params;
  
  // Pass along any server-side data
  return {
    slug,
    isServerSide: data?.isServerSide || false,
    documentData: data?.documentData || null
  };
}

// Explicitly mark this as client-side rendering only
export const ssr = false;
export const csr = true;

// No prerendering
export const prerender = false;

// Make sure we handle client-side errors
export const handleError = ({ error, status }) => {
  console.error('Route error:', error, status);
  
  // Check if this is a document data fetch error
  if (error.message && error.message.includes('Failed to fetch')) {
    return {
      slug: error.slug || null,
      isClientError: true,
      message: 'Document could not be loaded',
      status: 404,
      error: 'The document you requested could not be found or loaded'
    };
  }
  
  if (error.message && (
      error.message.includes('is not defined') ||
      error.message.includes('Cannot read properties') ||
      error.message.includes('is not a function')
  )) {
    return {
      slug: error.slug || null,
      isClientError: true,
      message: 'Client-side initialization error',
      status: 500,
      error: 'There was a problem initializing the editor. Please try refreshing the page.'
    };
  }
  
  return {
    slug: error.slug || null,
    isClientError: true,
    message: 'Error loading document',
    status,
    error: error.message
  };
};