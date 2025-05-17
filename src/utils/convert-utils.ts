import { isNodeEnvironment } from "./platform-utils";

/**
 * Convert a base64 string to a Uint8Array
 * @param base64 - Base64 encoded string
 * @returns Uint8Array of the data
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  if (isNodeEnvironment()) {
    // Node.js environment
    return Buffer.from(base64, "base64");
  }

  // Browser environment
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert a Uint8Array to a base64 string
 * @param array - Uint8Array data
 * @returns Base64 encoded string
 */
export function uint8ArrayToBase64(array: Uint8Array): string {
  if (isNodeEnvironment()) {
    // Node.js environment
    return Buffer.from(array).toString("base64");
  }

  // Browser environment
  let binary = "";
  const len = array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary);
}

/**
 * Converts a camelCase string to snake_case
 *
 * @param str - The camelCase string to convert
 * @returns The string in snake_case format
 */
export function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Recursively converts all keys in an object from camelCase to snake_case
 *
 * @param obj - The object to convert
 * @param camelCaseFields - List of fields that should remain in camelCase
 * @returns A new object with all keys in snake_case
 */
export function convertObjectKeysToSnakeCase(
  obj: Record<string, any>,
  camelCaseFields: string[] = [],
): Record<string, any> {
  const result: Record<string, any> = {};

  Object.entries(obj).forEach(([key, value]) => {
    // Determine if this key should remain camelCase or convert to snake_case
    const targetKey = camelCaseFields.includes(key)
      ? key
      : camelToSnakeCase(key);

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      // Recursively convert nested objects
      result[targetKey] = convertObjectKeysToSnakeCase(value, camelCaseFields);
    } else if (Array.isArray(value)) {
      // Handle arrays by mapping each item (if objects)
      result[targetKey] = value.map((item) =>
        item !== null && typeof item === "object"
          ? convertObjectKeysToSnakeCase(item, camelCaseFields)
          : item,
      );
    } else {
      // Simple value
      result[targetKey] = value;
    }
  });

  return result;
}
