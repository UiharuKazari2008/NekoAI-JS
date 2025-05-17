/**
 * Utility functions to detect and handle different execution environments
 * (browser vs. Node.js) and platform-specific behaviors.
 */

// Define types for Node.js modules to be used conditionally
export type FSModule = typeof import("fs");
export type PathModule = typeof import("path");

/**
 * Check if code is running in a Node.js environment
 * @returns True if running in Node.js, false if in browser
 */
export function isNodeEnvironment(): boolean {
  return typeof window === "undefined";
}

/**
 * Helper function to safely use Node.js modules
 * @returns Object containing Node.js modules if available, null otherwise
 */
export function getNodeModules(): {
  fs: FSModule | null;
  path: PathModule | null;
} {
  if (isNodeEnvironment()) {
    try {
      // Node.js environment
      return {
        fs: require("fs"),
        path: require("path"),
      };
    } catch (error) {
      console.warn("Failed to load Node.js modules:", error);
      return { fs: null, path: null };
    }
  }
  // Browser environment
  return { fs: null, path: null };
}

/**
 * Get the Node.js path module, if available
 * @returns The path module or null if in browser environment
 */
export function getNodePath(): PathModule | null {
  const { path } = getNodeModules();
  return path;
}

/**
 * Try to load the Node.js canvas module
 * This is separated to avoid bundling issues in browser environments
 */
export function loadNodeCanvas() {
  try {
    if (isNodeEnvironment()) {
      return require("canvas");
    }
    return null;
  } catch (error) {
    console.warn("Failed to load Node.js canvas module:", error);
    return null;
  }
}
