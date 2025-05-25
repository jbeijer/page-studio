<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  // Prevent SSR
  export const ssr = false;
  
  /**
   * Redirect immediately to the new document route
   * This route serves as a convenience redirect to the /editor/new route
   * which will create a new document and then redirect to its slug-based URL
   */
  onMount(() => {
    // Redirect to the "new" route which will create a new document with A4 format
    goto('/editor/new?format=A4', { replaceState: true });
  });
</script>

<div class="h-screen flex flex-col items-center justify-center">
  <div class="text-center">
    <h1 class="text-2xl font-bold mb-4">Redirecting...</h1>
    <p>Please wait while we redirect you to the editor...</p>
    <!-- Loading spinner -->
    <div class="mt-4 inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
  </div>
</div>