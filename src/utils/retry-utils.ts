import { RetryConfig } from "../types";

// Default retry configuration
export const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  enabled: true,
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  retryStatusCodes: [429],
};

/**
 * Execute a function with retry logic
 *
 * @param fn - Async function to execute with retry logic
 * @param retryConfig - Configuration for retry behavior
 * @returns Promise that resolves with the result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retryConfig?: RetryConfig,
): Promise<T> {
  // Use default retry config if not provided
  const config: Required<RetryConfig> = {
    ...DEFAULT_RETRY_CONFIG,
    ...(retryConfig || {}),
  };

  // If retries are disabled, just execute the function once
  if (!config.enabled) {
    return fn();
  }

  let lastError: Error | null = null;

  // Try up to maxRetries times
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Execute the function
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry based on the error
      const shouldRetry = shouldRetryRequest(error, config, attempt);

      // If we shouldn't retry or we've reached the max retries, throw the error
      if (!shouldRetry || attempt >= config.maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff with jitter
      const delay = calculateRetryDelay(attempt, config);

      console.warn(
        `Request failed with error: ${lastError.message}. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${config.maxRetries})`,
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never happen (we should always either return or throw)
  throw lastError || new Error("Failed after retries");
}

/**
 * Determine if a request should be retried based on the error and config
 *
 * @param error - The error from the request
 * @param config - Retry configuration
 * @param attempt - Current attempt number (0-based)
 * @returns Whether to retry the request
 */
function shouldRetryRequest(
  error: any,
  config: Required<RetryConfig>,
  attempt: number,
): boolean {
  // Don't retry if we've reached the max retries
  if (attempt >= config.maxRetries) {
    return false;
  }

  // Check for rate limiting (HTTP 429 status)
  if (error && error.status && config.retryStatusCodes.includes(error.status)) {
    return true;
  }

  // Check for network errors (fetch will throw a TypeError for network errors)
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }

  // Check for timeout errors
  if (error.name === "AbortError") {
    return true;
  }

  return false;
}

/**
 * Calculate retry delay with exponential backoff and jitter
 *
 * @param attempt - Current attempt number (0-based)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
function calculateRetryDelay(
  attempt: number,
  config: Required<RetryConfig>,
): number {
  // Exponential backoff: baseDelay * 1.2^attempt
  const exponentialDelay = config.baseDelay * Math.pow(1.2, attempt);

  // Add jitter (random value between 0 and 300ms) to prevent thundering herd
  const jitter = Math.random() * 300;

  // Cap the delay at maxDelay
  return Math.min(exponentialDelay + jitter, config.maxDelay);
}
