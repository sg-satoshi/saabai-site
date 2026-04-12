/**
 * Centralized API response utilities
 * Ensures consistent error/success response format across all endpoints
 */

export interface ApiErrorResponse {
  error: string;
  timestamp: string;
  status: number;
}

export interface ApiSuccessResponse<T = any> {
  data: T;
  message?: string;
  timestamp: string;
}

/**
 * Return a standardized error response
 */
export function apiError(message: string, status: number = 400): Response {
  return Response.json(
    {
      error: message,
      timestamp: new Date().toISOString(),
      status,
    } as ApiErrorResponse,
    { status }
  );
}

/**
 * Return a standardized success response
 */
export function apiSuccess<T = any>(data: T, message?: string): Response {
  return Response.json(
    {
      data,
      message,
      timestamp: new Date().toISOString(),
    } as ApiSuccessResponse<T>
  );
}

/**
 * Helper to check if response is an error
 */
export function isApiError(response: any): response is ApiErrorResponse {
  return response && typeof response === "object" && "error" in response;
}

/**
 * Helper to safely parse API response
 */
export async function parseApiResponse<T = any>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(isApiError(error) ? error.error : `HTTP ${response.status}`);
  }
  return response.json();
}
