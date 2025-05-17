import { NovelAIResponse } from "../types";

/**
 * Handles API response and checks status codes
 * @param response - Fetch API response
 * @returns NovelAIResponse object
 * @throws Error if response is not OK
 */
export async function handleResponse(
  response: Response,
): Promise<NovelAIResponse> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  if (!response.ok) {
    const error = new Error(
      `HTTP Error: ${response.status} ${response.statusText}`,
    );
    (error as any).status = response.status;
    (error as any).statusText = response.statusText;
    throw error;
  }

  // For binary responses, we need to clone the response and buffer all the data
  if (
    response.headers.get("Content-Type")?.includes("application/zip") ||
    response.headers.get("Content-Type")?.includes("application/octet-stream")
  ) {
    // Clone response to avoid consuming it
    const clonedResponse = response.clone();
    // Get the array buffer directly
    const buffer = await clonedResponse.arrayBuffer();

    return {
      statusCode: response.status,
      statusText: response.statusText,
      headers,
      data: buffer, // Return buffer directly for binary data
    };
  }

  // For non-binary responses, return the body stream
  return {
    statusCode: response.status,
    statusText: response.statusText,
    headers,
    data: response.body,
  };
}
