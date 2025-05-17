import { isNodeEnvironment, getNodeModules } from "./platform-utils";

/**
 * Creates a timestamp-based filename
 * @param prefix - Optional prefix for the filename
 * @param extension - File extension (default: 'png')
 * @returns Formatted filename
 */
export function createFilename(prefix?: string, extension = "png"): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "_")
    .substring(0, 15);

  return `${prefix ? prefix + "_" : ""}${timestamp}.${extension}`;
}

/**
 * Ensures a directory exists, creating it if necessary
 * @param dir - Directory path
 */
export function ensureDirectoryExists(dir: string): void {
  if (isNodeEnvironment()) {
    // Node.js environment
    const { fs } = getNodeModules();
    if (fs && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  // No-op in browser environment
}

/**
 * Save binary data to a file (Node.js environment only)
 * @param data - Binary data as Uint8Array
 * @param filepath - File path to save to
 */
export function saveBinaryFile(data: Uint8Array, filepath: string): void {
  if (isNodeEnvironment()) {
    // Node.js environment
    const { fs, path } = getNodeModules();
    if (!fs || !path) {
      throw new Error("File system modules not available");
    }

    const dir = path.dirname(filepath);
    ensureDirectoryExists(dir);
    fs.writeFileSync(filepath, Buffer.from(data));
  } else {
    // Browser environment
    throw new Error("Cannot save files directly in browser environment");
  }
}

/**
 * Converts file size to human-readable format
 * @param bytes - Size in bytes
 * @returns Formatted size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}
