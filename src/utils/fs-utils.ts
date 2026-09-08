import { getNodeFs, getNodePath, isNodeEnvironment } from "./platform-utils";

/**
 * Timestamp string used in generated filenames (YYYYMMDD_HHMMSS)
 */
export function timestampString(): string {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "_")
    .substring(0, 15);
}

/**
 * Creates a timestamp-based filename
 * @param prefix - Optional prefix for the filename
 * @param extension - File extension (default: 'png')
 * @returns Formatted filename
 */
export function createFilename(prefix?: string, extension = "png"): string {
  return `${prefix ? prefix + "_" : ""}${timestampString()}.${extension}`;
}

/**
 * Ensures a directory exists, creating it if necessary (Node.js only, no-op in browser)
 * @param dir - Directory path
 */
export async function ensureDirectoryExists(dir: string): Promise<void> {
  const fs = await getNodeFs();
  if (fs && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Save binary data to a file (Node.js environment only)
 * @param data - Binary data as Uint8Array
 * @param filepath - File path to save to
 */
export async function saveBinaryFile(
  data: Uint8Array,
  filepath: string,
): Promise<void> {
  if (!isNodeEnvironment()) {
    throw new Error("Cannot save files directly in browser environment");
  }

  const fs = await getNodeFs();
  const path = await getNodePath();
  if (!fs || !path) {
    throw new Error("File system modules not available");
  }

  await ensureDirectoryExists(path.dirname(filepath));
  fs.writeFileSync(filepath, data);
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
