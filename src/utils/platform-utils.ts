/**
 * Utility functions to detect and handle different execution environments
 * (browser vs. Node.js) and platform-specific behaviors.
 *
 * Node built-ins are loaded via dynamic import so the library works in both
 * CJS and ESM builds, and browser bundlers can drop these paths entirely.
 */

export type FSModule = typeof import("fs");
export type PathModule = typeof import("path");

/**
 * Check if code is running in a Node.js environment
 * @returns True if running in Node.js, false if in browser
 */
export function isNodeEnvironment(): boolean {
  return typeof window === "undefined";
}

let fsModule: FSModule | null | undefined;
let pathModule: PathModule | null | undefined;

/**
 * Get the Node.js fs module, if available
 * @returns The fs module or null in browser environments
 */
export async function getNodeFs(): Promise<FSModule | null> {
  if (fsModule !== undefined) return fsModule;
  if (!isNodeEnvironment()) return (fsModule = null);
  try {
    fsModule = await import("fs");
  } catch {
    fsModule = null;
  }
  return fsModule;
}

/**
 * Get the Node.js path module, if available
 * @returns The path module or null in browser environments
 */
export async function getNodePath(): Promise<PathModule | null> {
  if (pathModule !== undefined) return pathModule;
  if (!isNodeEnvironment()) return (pathModule = null);
  try {
    pathModule = await import("path");
  } catch {
    pathModule = null;
  }
  return pathModule;
}

/**
 * Try to load the optional Node.js canvas module
 * @returns The canvas module or null if unavailable
 */
export async function loadNodeCanvas(): Promise<any | null> {
  if (!isNodeEnvironment()) return null;
  try {
    const mod = await import("canvas");
    return (mod as any).default ?? mod;
  } catch {
    return null;
  }
}
