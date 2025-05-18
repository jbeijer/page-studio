/**
 * Page Recovery System
 * 
 * This module provides functionality for creating periodic snapshots
 * of canvas pages and recovering them in case of errors or data loss.
 */

// Storage key for recovery snapshots (prefixed with page ID)
const RECOVERY_STORAGE_KEY_PREFIX = 'pagestudio_recovery_';

// Default interval between snapshots (in milliseconds)
const DEFAULT_INTERVAL = 60000; // 1 minute

// Default retention period (in milliseconds)
const DEFAULT_RETENTION = 86400000; // 24 hours

// In-memory snapshot cache
let snapshotCache = {};

/**
 * Initialize page recovery system
 * @param {Object} options - Configuration options
 * @param {number} options.interval - Time between snapshots in milliseconds
 * @param {number} options.retention - Retention period in milliseconds
 * @param {boolean} options.enabled - Whether recovery system is enabled
 * @returns {Object} - Recovery system control object
 */
export function initializeRecovery(options = {}) {
  const config = {
    interval: options.interval || DEFAULT_INTERVAL,
    retention: options.retention || DEFAULT_RETENTION,
    enabled: options.enabled !== false // Enabled by default
  };
  
  let intervalId = null;
  let isRunning = false;
  let lastSnapshot = null;
  
  /**
   * Start taking periodic snapshots
   * @param {Function} snapshotFunction - Function that returns snapshot data
   * @param {string} pageId - Current page ID
   */
  function startSnapshots(snapshotFunction, pageId) {
    if (!config.enabled || !snapshotFunction || !pageId) {
      console.warn("Recovery snapshots not started: missing parameters or disabled");
      return;
    }
    
    // Stop any existing interval
    stopSnapshots();
    
    // Start a new interval
    isRunning = true;
    intervalId = setInterval(() => {
      try {
        if (!pageId) return;
        
        console.log(`Taking recovery snapshot for page ${pageId}`);
        const snapshot = snapshotFunction();
        
        if (snapshot) {
          // Store the snapshot
          storeSnapshot(pageId, snapshot);
          lastSnapshot = {
            pageId,
            timestamp: Date.now(),
            snapshot
          };
        }
      } catch (error) {
        console.error("Error taking recovery snapshot:", error);
      }
    }, config.interval);
    
    console.log(`Recovery snapshots started for page ${pageId} (interval: ${config.interval}ms)`);
  }
  
  /**
   * Stop taking periodic snapshots
   */
  function stopSnapshots() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      isRunning = false;
      console.log("Recovery snapshots stopped");
    }
  }
  
  /**
   * Take an immediate snapshot
   * @param {Function} snapshotFunction - Function that returns snapshot data
   * @param {string} pageId - Current page ID
   * @returns {Object|null} - The snapshot data or null if failed
   */
  function takeSnapshot(snapshotFunction, pageId) {
    if (!config.enabled || !snapshotFunction || !pageId) {
      return null;
    }
    
    try {
      console.log(`Taking immediate recovery snapshot for page ${pageId}`);
      const snapshot = snapshotFunction();
      
      if (snapshot) {
        // Store the snapshot
        storeSnapshot(pageId, snapshot);
        lastSnapshot = {
          pageId,
          timestamp: Date.now(),
          snapshot
        };
        
        return snapshot;
      }
    } catch (error) {
      console.error("Error taking immediate recovery snapshot:", error);
    }
    
    return null;
  }
  
  /**
   * Store a snapshot in both localStorage and memory cache
   * @param {string} pageId - ID of the page
   * @param {Object} snapshot - Snapshot data to store
   */
  function storeSnapshot(pageId, snapshot) {
    if (!pageId || !snapshot) return;
    
    const timestamp = Date.now();
    const snapshotData = {
      pageId,
      timestamp,
      data: snapshot
    };
    
    // Add to in-memory cache
    if (!snapshotCache[pageId]) {
      snapshotCache[pageId] = [];
    }
    
    // Limit to 10 snapshots per page in memory
    if (snapshotCache[pageId].length >= 10) {
      snapshotCache[pageId].shift(); // Remove oldest
    }
    
    snapshotCache[pageId].push(snapshotData);
    
    // Store in localStorage with a unique key based on timestamp
    const key = `${RECOVERY_STORAGE_KEY_PREFIX}${pageId}_${timestamp}`;
    try {
      localStorage.setItem(key, JSON.stringify(snapshotData));
      console.log(`Stored recovery snapshot for page ${pageId}`);
    } catch (err) {
      console.error("Error storing recovery snapshot in localStorage:", err);
    }
    
    // Clean up old snapshots
    cleanupOldSnapshots(pageId);
  }
  
  /**
   * Get the latest snapshot for a page
   * @param {string} pageId - ID of the page
   * @returns {Object|null} - Latest snapshot or null if none found
   */
  function getLatestSnapshot(pageId) {
    if (!pageId) return null;
    
    // Check in-memory cache first
    if (snapshotCache[pageId] && snapshotCache[pageId].length > 0) {
      // Get the most recent snapshot
      const latestSnapshot = snapshotCache[pageId].reduce((latest, current) => {
        return current.timestamp > latest.timestamp ? current : latest;
      }, snapshotCache[pageId][0]);
      
      console.log(`Found recovery snapshot in memory cache for page ${pageId}`);
      return latestSnapshot;
    }
    
    // Check localStorage if not in memory
    try {
      // Get all keys with our prefix and pageId
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(`${RECOVERY_STORAGE_KEY_PREFIX}${pageId}_`)
      );
      
      if (keys.length === 0) {
        console.log(`No recovery snapshots found for page ${pageId}`);
        return null;
      }
      
      // Sort by timestamp (which is part of the key)
      keys.sort((a, b) => {
        const timestampA = parseInt(a.split('_').pop());
        const timestampB = parseInt(b.split('_').pop());
        return timestampB - timestampA; // Descending order (newest first)
      });
      
      // Get the latest snapshot
      const latestKey = keys[0];
      const snapshot = JSON.parse(localStorage.getItem(latestKey));
      console.log(`Found recovery snapshot in localStorage for page ${pageId}`);
      
      // Add to in-memory cache for future use
      if (!snapshotCache[pageId]) {
        snapshotCache[pageId] = [];
      }
      snapshotCache[pageId].push(snapshot);
      
      return snapshot;
    } catch (err) {
      console.error("Error getting recovery snapshot from localStorage:", err);
      return null;
    }
  }
  
  /**
   * Clean up old snapshots that exceed the retention period
   * @param {string} pageId - Optional page ID to clean up for (if omitted, cleans all)
   */
  function cleanupOldSnapshots(pageId = null) {
    const cutoffTime = Date.now() - config.retention;
    
    // Clean up in-memory cache
    if (pageId) {
      // Clean up for specific page
      if (snapshotCache[pageId]) {
        snapshotCache[pageId] = snapshotCache[pageId].filter(snapshot => 
          snapshot.timestamp >= cutoffTime
        );
      }
    } else {
      // Clean up for all pages
      Object.keys(snapshotCache).forEach(id => {
        snapshotCache[id] = snapshotCache[id].filter(snapshot => 
          snapshot.timestamp >= cutoffTime
        );
      });
    }
    
    // Clean up localStorage
    try {
      const prefix = pageId 
        ? `${RECOVERY_STORAGE_KEY_PREFIX}${pageId}_` 
        : RECOVERY_STORAGE_KEY_PREFIX;
      
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(prefix)
      );
      
      keys.forEach(key => {
        try {
          // Extract timestamp from key
          const keyParts = key.split('_');
          const timestamp = parseInt(keyParts[keyParts.length - 1]);
          
          if (timestamp < cutoffTime) {
            localStorage.removeItem(key);
          }
        } catch (err) {
          // Ignore errors for individual keys
        }
      });
      
      console.log(`Cleaned up old recovery snapshots${pageId ? ` for page ${pageId}` : ''}`);
    } catch (err) {
      console.error("Error cleaning up old recovery snapshots:", err);
    }
  }
  
  /**
   * Recover a page from the latest snapshot
   * @param {string} pageId - ID of the page to recover
   * @param {Function} recoveryFunction - Function to apply the snapshot
   * @returns {boolean} - Whether recovery was successful
   */
  function recoverPage(pageId, recoveryFunction) {
    if (!pageId || !recoveryFunction) return false;
    
    // Get the latest snapshot
    const snapshot = getLatestSnapshot(pageId);
    if (!snapshot) {
      console.log(`No recovery snapshots found for page ${pageId}`);
      return false;
    }
    
    try {
      // Apply the snapshot using the provided recovery function
      console.log(`Applying recovery snapshot for page ${pageId} from ${new Date(snapshot.timestamp).toLocaleString()}`);
      const result = recoveryFunction(snapshot.data);
      
      if (result) {
        console.log(`Successfully recovered page ${pageId}`);
        return true;
      } else {
        console.error(`Recovery function returned false for page ${pageId}`);
        return false;
      }
    } catch (err) {
      console.error(`Error recovering page ${pageId}:`, err);
      return false;
    }
  }
  
  /**
   * Get all available snapshots for a page
   * @param {string} pageId - ID of the page
   * @returns {Array} - List of snapshots with metadata
   */
  function getPageSnapshots(pageId) {
    if (!pageId) return [];
    
    // Merge snapshots from memory and localStorage
    const snapshots = [];
    
    // Add snapshots from memory cache
    if (snapshotCache[pageId]) {
      snapshotCache[pageId].forEach(snapshot => {
        snapshots.push({
          pageId: snapshot.pageId,
          timestamp: snapshot.timestamp,
          date: new Date(snapshot.timestamp).toLocaleString(),
          source: 'memory',
          hasData: !!snapshot.data
        });
      });
    }
    
    // Add snapshots from localStorage
    try {
      const prefix = `${RECOVERY_STORAGE_KEY_PREFIX}${pageId}_`;
      const keys = Object.keys(localStorage).filter(key => key.startsWith(prefix));
      
      keys.forEach(key => {
        try {
          const rawData = localStorage.getItem(key);
          if (rawData) {
            const snapshot = JSON.parse(rawData);
            
            // Only add if not already in the list
            const exists = snapshots.some(s => 
              s.pageId === snapshot.pageId && s.timestamp === snapshot.timestamp
            );
            
            if (!exists) {
              snapshots.push({
                pageId: snapshot.pageId,
                timestamp: snapshot.timestamp,
                date: new Date(snapshot.timestamp).toLocaleString(),
                source: 'localStorage',
                hasData: !!snapshot.data
              });
            }
          }
        } catch (err) {
          // Ignore errors for individual items
        }
      });
    } catch (err) {
      console.error("Error getting snapshots from localStorage:", err);
    }
    
    // Sort by timestamp (newest first)
    snapshots.sort((a, b) => b.timestamp - a.timestamp);
    
    return snapshots;
  }
  
  /**
   * Clear all snapshots for a page or all pages
   * @param {string} pageId - Optional page ID (if omitted, clears all)
   */
  function clearSnapshots(pageId = null) {
    // Clear in-memory cache
    if (pageId) {
      delete snapshotCache[pageId];
    } else {
      snapshotCache = {};
    }
    
    // Clear localStorage
    try {
      const prefix = pageId 
        ? `${RECOVERY_STORAGE_KEY_PREFIX}${pageId}_` 
        : RECOVERY_STORAGE_KEY_PREFIX;
      
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(prefix)
      );
      
      keys.forEach(key => localStorage.removeItem(key));
      console.log(`Cleared recovery snapshots${pageId ? ` for page ${pageId}` : ''}`);
    } catch (err) {
      console.error("Error clearing recovery snapshots:", err);
    }
  }
  
  // Return the recovery system control object
  return {
    config,
    startSnapshots,
    stopSnapshots,
    takeSnapshot,
    getLatestSnapshot,
    recoverPage,
    getPageSnapshots,
    clearSnapshots,
    cleanupOldSnapshots,
    get isRunning() { return isRunning; },
    get lastSnapshot() { return lastSnapshot; }
  };
}

/**
 * Create a default recovery system instance
 */
export const pageRecovery = initializeRecovery({
  interval: 60000, // 1 minute
  retention: 86400000, // 24 hours
  enabled: true
});

/**
 * Format a snapshot for debugging/display
 * @param {Object} snapshot - The snapshot object
 * @returns {Object} - Formatted snapshot with readable information
 */
export function formatSnapshot(snapshot) {
  if (!snapshot) return null;
  
  const result = {
    pageId: snapshot.pageId,
    timestamp: snapshot.timestamp,
    date: new Date(snapshot.timestamp).toLocaleString()
  };
  
  // Add data information
  if (snapshot.data) {
    const data = snapshot.data;
    
    if (typeof data === 'string') {
      // JSON string
      try {
        const parsed = JSON.parse(data);
        result.dataType = 'JSON string';
        result.objectCount = parsed.objects ? parsed.objects.length : 0;
        result.dataSize = data.length;
      } catch (err) {
        result.dataType = 'string';
        result.dataSize = data.length;
      }
    } else if (typeof data === 'object') {
      // Object data
      result.dataType = 'object';
      result.objectCount = data.objects ? data.objects.length : 0;
      result.properties = Object.keys(data);
    }
  } else {
    result.dataType = 'empty';
  }
  
  return result;
}