/**
 * Debug Logger Utility
 * 
 * This utility provides consistent logging with configurable log levels,
 * module-specific logging, and localStorage persistence for log settings.
 */

// Log levels
export const LOG_LEVELS = {
  NONE: 0,    // No logging
  ERROR: 1,   // Only errors
  WARN: 2,    // Errors and warnings
  INFO: 3,    // Errors, warnings, and info
  DEBUG: 4,   // All the above plus debug messages
  VERBOSE: 5  // Maximum logging
};

// Module names for more targeted logging
export const LOG_MODULES = {
  CANVAS: 'canvas',
  DOCUMENT: 'document',
  STORAGE: 'storage',
  RECOVERY: 'recovery',
  GUIDES: 'guides',
  GRID: 'grid',
  EDITOR: 'editor',
  TOOLS: 'tools',
  HISTORY: 'history',
  UTILS: 'utils'
};

// Storage key for logging preferences
const LOG_SETTINGS_KEY = 'pagestudio_log_settings';

// Default settings
const DEFAULT_SETTINGS = {
  globalLevel: LOG_LEVELS.INFO,
  moduleSettings: {
    // Module-specific overrides
    canvas: LOG_LEVELS.INFO,
    document: LOG_LEVELS.INFO,
    storage: LOG_LEVELS.INFO,
    recovery: LOG_LEVELS.INFO,
    guides: LOG_LEVELS.INFO,
    grid: LOG_LEVELS.INFO,
    editor: LOG_LEVELS.INFO,
    tools: LOG_LEVELS.INFO,
    history: LOG_LEVELS.INFO,
    utils: LOG_LEVELS.INFO
  },
  logToConsole: true,
  logToStorage: false,
  maxStoredLogs: 1000,
  timestamp: true
};

// In-memory log storage
let logHistory = [];

// Current settings
let settings = { ...DEFAULT_SETTINGS };

/**
 * Initialize logger with settings
 * @param {Object} options - Logger settings
 */
export function initializeLogger(options = {}) {
  // Load saved settings from localStorage
  loadSettings();
  
  // Override with provided options
  if (options) {
    settings = {
      ...settings,
      ...options,
      moduleSettings: {
        ...settings.moduleSettings,
        ...(options.moduleSettings || {})
      }
    };
  }
  
  // Save settings
  saveSettings();
  
  // Log initialization
  log(LOG_LEVELS.INFO, LOG_MODULES.UTILS, 'Debug logger initialized');
}

/**
 * Load settings from localStorage
 */
function loadSettings() {
  try {
    const savedSettings = localStorage.getItem(LOG_SETTINGS_KEY);
    if (savedSettings) {
      settings = JSON.parse(savedSettings);
    }
  } catch (err) {
    console.error('Error loading logger settings:', err);
    settings = { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save settings to localStorage
 */
function saveSettings() {
  try {
    localStorage.setItem(LOG_SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving logger settings:', err);
  }
}

/**
 * Set the global log level
 * @param {number} level - Log level from LOG_LEVELS
 */
export function setLogLevel(level) {
  if (level >= LOG_LEVELS.NONE && level <= LOG_LEVELS.VERBOSE) {
    settings.globalLevel = level;
    saveSettings();
    log(LOG_LEVELS.INFO, LOG_MODULES.UTILS, `Global log level set to ${getLogLevelName(level)}`);
  }
}

/**
 * Set a module-specific log level
 * @param {string} module - Module name from LOG_MODULES
 * @param {number} level - Log level from LOG_LEVELS
 */
export function setModuleLogLevel(module, level) {
  if (level >= LOG_LEVELS.NONE && level <= LOG_LEVELS.VERBOSE) {
    settings.moduleSettings[module] = level;
    saveSettings();
    log(LOG_LEVELS.INFO, LOG_MODULES.UTILS, `Log level for ${module} set to ${getLogLevelName(level)}`);
  }
}

/**
 * Get the string name of a log level
 * @param {number} level - Log level from LOG_LEVELS
 * @returns {string} Name of the log level
 */
function getLogLevelName(level) {
  return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level) || 'UNKNOWN';
}

/**
 * Check if logging is enabled for a given level and module
 * @param {number} level - Log level from LOG_LEVELS
 * @param {string} module - Module name from LOG_MODULES
 * @returns {boolean} Whether logging is enabled
 */
function isLoggingEnabled(level, module) {
  // Check module-specific setting first, then fall back to global
  const moduleLevel = settings.moduleSettings[module];
  const effectiveLevel = moduleLevel !== undefined ? moduleLevel : settings.globalLevel;
  
  return level <= effectiveLevel;
}

/**
 * Write a log entry
 * @param {number} level - Log level from LOG_LEVELS
 * @param {string} module - Module name from LOG_MODULES
 * @param {string} message - Log message
 * @param {any} data - Optional data to log
 */
export function log(level, module, message, data) {
  if (!isLoggingEnabled(level, module)) {
    return;
  }
  
  const timestamp = settings.timestamp ? new Date().toISOString() : null;
  const levelName = getLogLevelName(level);
  
  // Create log entry
  const logEntry = {
    timestamp,
    level,
    levelName,
    module,
    message,
    data
  };
  
  // Add to history if enabled
  if (settings.logToStorage) {
    logHistory.push(logEntry);
    
    // Trim if exceeds maximum
    if (logHistory.length > settings.maxStoredLogs) {
      logHistory = logHistory.slice(-settings.maxStoredLogs);
    }
  }
  
  // Log to console if enabled
  if (settings.logToConsole) {
    const prefix = timestamp ? `[${timestamp}] ` : '';
    const modulePart = `[${module.toUpperCase()}]`;
    const levelPart = `[${levelName}]`;
    const formattedMessage = `${prefix}${levelPart} ${modulePart} ${message}`;
    
    switch (level) {
      case LOG_LEVELS.ERROR:
        console.error(formattedMessage, data || '');
        break;
      case LOG_LEVELS.WARN:
        console.warn(formattedMessage, data || '');
        break;
      case LOG_LEVELS.INFO:
        console.info(formattedMessage, data || '');
        break;
      case LOG_LEVELS.DEBUG:
      case LOG_LEVELS.VERBOSE:
        console.debug(formattedMessage, data || '');
        break;
    }
  }
}

/**
 * Shorthand for error logs
 * @param {string} module - Module name from LOG_MODULES
 * @param {string} message - Log message
 * @param {any} data - Optional data to log
 */
export function logError(module, message, data) {
  log(LOG_LEVELS.ERROR, module, message, data);
}

/**
 * Shorthand for warning logs
 * @param {string} module - Module name from LOG_MODULES
 * @param {string} message - Log message
 * @param {any} data - Optional data to log
 */
export function logWarn(module, message, data) {
  log(LOG_LEVELS.WARN, module, message, data);
}

/**
 * Shorthand for info logs
 * @param {string} module - Module name from LOG_MODULES
 * @param {string} message - Log message
 * @param {any} data - Optional data to log
 */
export function logInfo(module, message, data) {
  log(LOG_LEVELS.INFO, module, message, data);
}

/**
 * Shorthand for debug logs
 * @param {string} module - Module name from LOG_MODULES
 * @param {string} message - Log message
 * @param {any} data - Optional data to log
 */
export function logDebug(module, message, data) {
  log(LOG_LEVELS.DEBUG, module, message, data);
}

/**
 * Shorthand for verbose logs
 * @param {string} module - Module name from LOG_MODULES
 * @param {string} message - Log message
 * @param {any} data - Optional data to log
 */
export function logVerbose(module, message, data) {
  log(LOG_LEVELS.VERBOSE, module, message, data);
}

/**
 * Get all logs in the history
 * @returns {Array} Array of log entries
 */
export function getLogs() {
  return [...logHistory];
}

/**
 * Clear all logs in the history
 */
export function clearLogs() {
  logHistory = [];
  log(LOG_LEVELS.INFO, LOG_MODULES.UTILS, 'Log history cleared');
}

/**
 * Get current logger settings
 * @returns {Object} Current settings object
 */
export function getLoggerSettings() {
  return { ...settings };
}

/**
 * Enable/disable logging to console
 * @param {boolean} enabled - Whether to log to console
 */
export function setConsoleLogging(enabled) {
  settings.logToConsole = !!enabled;
  saveSettings();
  log(LOG_LEVELS.INFO, LOG_MODULES.UTILS, `Console logging ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Enable/disable logging to storage
 * @param {boolean} enabled - Whether to store logs in memory
 */
export function setStorageLogging(enabled) {
  settings.logToStorage = !!enabled;
  saveSettings();
  log(LOG_LEVELS.INFO, LOG_MODULES.UTILS, `Storage logging ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Helper to format file and line information for logs
 * @param {string} file - File name or path
 * @param {number} line - Line number
 * @returns {string} Formatted file:line string
 */
export function fileLocation(file, line) {
  if (!file) return '';
  // Extract just the filename from the path if a path is provided
  const filename = file.includes('/') ? file.split('/').pop() : file;
  return line ? `${filename}:${line}` : filename;
}

// Initialize the logger with defaults
initializeLogger();

// Export a default logger instance with convenient methods
export const logger = {
  error: logError,
  warn: logWarn,
  info: logInfo,
  debug: logDebug,
  verbose: logVerbose,
  setLevel: setLogLevel,
  setModuleLevel: setModuleLogLevel,
  getSettings: getLoggerSettings,
  getLogs,
  clearLogs,
  enableConsole: () => setConsoleLogging(true),
  disableConsole: () => setConsoleLogging(false),
  enableStorage: () => setStorageLogging(true),
  disableStorage: () => setStorageLogging(false),
  fileLocation
};

// Create a global logger reference for developer access in the console
if (typeof window !== 'undefined') {
  window.$logger = logger;
  
  // Add console commands
  window.$enableLogs = () => {
    setLogLevel(LOG_LEVELS.VERBOSE);
    console.log('✅ Verbose logging enabled for all modules');
  };
  
  window.$disableLogs = () => {
    setLogLevel(LOG_LEVELS.ERROR);
    console.log('❌ Logging set to errors only');
  };
  
  window.$logLevels = () => {
    console.log('Current log levels:');
    console.log(`Global: ${getLogLevelName(settings.globalLevel)}`);
    Object.entries(settings.moduleSettings).forEach(([module, level]) => {
      console.log(`${module}: ${getLogLevelName(level)}`);
    });
  };
}