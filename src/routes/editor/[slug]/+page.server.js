// Handle editor page on server side
export function load({ params }) {
  // Get the slug parameter
  const { slug } = params;

  return {
    slug,
    // Flag to indicate server-side rendering, client will handle actual loading
    isServerSide: true,
    // Add additional metadata to prevent undefined errors
    documentData: null
  };
}

// Explicitly mark all document routes as client-side only
export const ssr = false;
export const csr = true;

// Page not suitable for prerendering
export const prerender = false;

// Handle any server-side errors with a silent response
export function handleError() {
  // Return a successful response with minimal data
  // Client-side will handle the actual data loading
  return {
    slug: null,
    isServerSide: true,
    documentData: null
  };
}