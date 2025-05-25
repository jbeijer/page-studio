/**
 * SvelteKit server hooks for handling errors and requests
 */

/**
 * Handle server-side errors
 * @param {Object} options - Error options
 * @param {Error} options.error - The error that occurred
 * @param {Object} options.event - The request event
 * @returns {Object} Error response
 */
export function handleError({ error, event }) {
  console.error('Server error:', error);
  console.error('Error path:', event.url.pathname);
  
  // Common error messages that indicate client-side only resources are being accessed
  const clientSideErrorMessages = [
    'is not defined',
    'Cannot read properties',
    'is not a function',
    'document is not defined',
    'window is not defined',
    'localStorage is not defined',
    'indexedDB is not defined',
    'navigator is not defined'
  ];
  
  // Check if this is a document route error
  if (event.url.pathname.includes('/editor/')) {
    // For data loading errors, provide minimal data structure
    if (event.url.pathname.includes('__data.json')) {
      // Extract the format from the URL if possible
      const format = event.url.searchParams.get('format') || 'A4';
      
      // Extract the path to determine if this is the new document route
      const pathParts = event.url.pathname.split('/').filter(Boolean);
      const isNewDocument = pathParts.length >= 2 && pathParts[1] === 'new';
      
      console.log(`Server error handler providing fallback data for ${event.url.pathname}`);
      
      // Return a valid data structure that the client can use
      return {
        data: {
          isServerSideMinimal: true,
          isNewDocument: isNewDocument,
          format: format,
          slug: isNewDocument ? 'new' : (pathParts[1] || null),
          isErrorResponse: true
        },
        status: 200
      };
    }
    
    // For regular document route errors, return a success to allow client to handle
    return {
      message: 'Document will be loaded client-side',
      status: 200
    };
  }
  
  // Check for specific client-side error patterns
  const errorMessage = error.message || '';
  if (clientSideErrorMessages.some(msg => errorMessage.includes(msg))) {
    console.log('Server detected client-side API access error, returning safe response');
    return {
      message: 'Client-side resources not available on server',
      status: 200
    };
  }
  
  // General error response
  return {
    message: 'An unexpected error occurred',
    status: 500
  };
}

/**
 * Pre-process requests before they hit routes
 */
export async function handle({ event, resolve }) {
  const { url } = event;
  
  // Special handling for document data requests
  if (url.pathname.includes('__data.json') && url.pathname.includes('/editor/')) {
    // Return a lightweight data object for all document data routes
    
    // Extract potential slug from path - fix for /editor/new/ route
    const pathParts = url.pathname.split('/').filter(Boolean);
    let slug = null;
    
    // Handle special cases for different routes
    if (pathParts.length >= 2) {
      if (pathParts[1] === 'new') {
        // This is the /editor/new/ route
        slug = 'new';
        console.log('Server: Handling /editor/new/ route data request');
      } else {
        // This is the /editor/[slug]/ route
        slug = pathParts[1];
        console.log(`Server: Handling /editor/${slug}/ route data request`);
      }
    }
    
    // Add special flags for the new document route
    const isNewDocument = slug === 'new';
    
    // Create the response data object
    const responseData = {
      // Add a flag indicating this is a server-side minimal response
      isServerSideMinimal: true,
      
      // Add route-specific flags
      isNewDocument: isNewDocument,
      
      // Pass any URL parameters that might be needed client-side
      format: url.searchParams.get('format') || 'A4',
      
      // Pass the correctly extracted slug
      slug: slug
    };
    
    console.log('Server: Returning data for route:', url.pathname);
    
    return new Response(JSON.stringify({
      type: 'data',
      data: responseData
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },
      status: 200
    });
  }
  
  // For regular document routes (not data), ensure client-side rendering
  if (url.pathname.startsWith('/editor/')) {
    // Extract the path to determine if this is the new document route
    const pathParts = url.pathname.split('/').filter(Boolean);
    const isNewDocument = pathParts.length >= 2 && pathParts[1] === 'new';
    
    try {
      // Special handling for /editor/new route which seems to have persistent issues
      if (isNewDocument) {
        console.log('Server: Handling /editor/new route with careful error management');
      }
      
      return await resolve(event, {
        // Use ssr: false to ensure client-side rendering
        ssr: false,
        // Transform HTML to avoid server rendering
        transformPageChunk: ({ html }) => html
      });
    } catch (error) {
      console.error('Error handling editor route:', error);
      
      // Use specific fallback for /editor/new route
      if (isNewDocument) {
        // Use a simpler inline fallback for /editor/new route
        console.log('Serving fallback for /editor/new');
        
        // Get format from URL
        const format = url.searchParams.get('format') || 'A4';
        
        return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PageStudio Editor - New Document</title>
  
  <!-- Emergency shell styles -->
  <style>
    body { font-family: sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
    .loading-container { display: flex; justify-content: center; align-items: center; height: 100vh; }
    .loading-content { text-align: center; max-width: 500px; padding: 2rem; background-color: white; 
                       border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .spinner { display: inline-block; width: 50px; height: 50px; border: 4px solid rgba(0,0,0,.1); 
             border-radius: 50%; border-top-color: #3b82f6; animation: spin 1s infinite; 
             margin-bottom: 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .btn { display: inline-block; padding: 0.5rem 1rem; color: white; background-color: #3b82f6; 
          border-radius: 0.25rem; text-decoration: none; }
  </style>
</head>

<body>
  <div id="app">
    <div class="loading-container">
      <div class="loading-content">
        <div class="spinner"></div>
        <h1>Creating New ${format} Document</h1>
        <p>Please wait while we prepare your document...</p>
        <a href="/" class="btn">Return to Home</a>
      </div>
    </div>
  </div>
  
  <script>
    // After a short delay, try to redirect through normal navigation
    setTimeout(() => {
      window.location.href = '/';
    }, 3000);
  </script>
</body>
</html>`, {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-store'
          },
          status: 200
        });
      }
      // Return a more complete HTML shell that includes scripts to load the client-side app
      return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PageStudio Editor</title>
  <!-- Include SvelteKit's client-side scripts -->
  <script type="module" src="/_app/immutable/entry/start.js"></script>
  <!-- Emergency shell styles -->
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif; }
    .loading-container { display: flex; justify-content: center; align-items: center; height: 100vh; }
    .loading-content { text-align: center; max-width: 500px; padding: 2rem; }
    .spinner { display: inline-block; width: 50px; height: 50px; border: 4px solid rgba(0,0,0,.1); border-radius: 50%; border-top-color: #3b82f6; animation: spin 1s ease-in-out infinite; margin-bottom: 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="app">
    <!-- Loading placeholder -->
    <div class="loading-container">
      <div class="loading-content">
        <div class="spinner"></div>
        <h1>Loading PageStudio Editor</h1>
        <p>Please wait while we prepare your document...</p>
      </div>
    </div>
  </div>
  
  <!-- Setup data for client hydration -->
  <script>
    // Mark this as an emergency shell
    window.__EMERGENCY_SHELL__ = true;
    
    // Format from URL
    const urlParams = new URLSearchParams(window.location.search);
    const format = urlParams.get('format') || 'A4';
    
    // Provide emergency fallback data
    window.__SVELTEKIT_DATA = {
      type: 'data',
      nodes: [
        // Root node data
        {},
        // Current route data
        { 
          format: format,
          isEmergencyFallback: true 
        }
      ]
    };
  </script>
</body>
</html>`, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store'
        },
        status: 200
      });
    }
  }
  
  // Normal request processing for all other routes
  return await resolve(event);
}