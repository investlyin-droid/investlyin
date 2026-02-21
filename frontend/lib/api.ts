export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production' && (API_URL.includes('localhost') || API_URL.startsWith('http://127.'))) {
  console.warn('[Production] NEXT_PUBLIC_API_URL should point to your production API, not localhost. Set it at build time.');
}

interface ApiError {
    message: string;
    status?: number;
    statusText?: string;
}

// Helper function to ensure errors are always properly formatted
function formatError(error: any): ApiError {
    if (error && typeof error === 'object' && error.message && error.status !== undefined) {
        // Already a properly formatted ApiError
        return error as ApiError;
    }
    
    // Extract message
    const message = error?.message || error?.toString() || 'Unknown error';
    
    // Extract status if available
    const status = error?.status;
    const statusText = error?.statusText;
    
    return {
        message,
        ...(status !== undefined && { status }),
        ...(statusText && { statusText }),
    };
}

class ApiClient {
    private onUnauthorizedCallback: (() => void) | null = null;

    // Register a callback to be called when a 401 error occurs
    setOnUnauthorized(callback: () => void) {
        this.onUnauthorizedCallback = callback;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {},
        token?: string
    ): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'bypass-tunnel-reminder': 'true', // Bypass Cloudflare tunnel warning page
            ...(options.headers as Record<string, string>),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        try {
            let response: Response;
            try {
                response = await fetch(`${API_URL}${endpoint}`, {
                    ...options,
                    headers,
                    signal: controller.signal,
                });
            } catch (fetchError: any) {
                clearTimeout(timeoutId);
                // Network error (connection refused, CORS, etc.)
                if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
                    throw new Error(`Cannot connect to backend at ${API_URL}. Please ensure the backend is running.`);
                }
                throw new Error(`Network error: ${fetchError.message || 'Failed to connect to server'}`);
            }

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorMessage = `API Error: ${response.statusText}`;
                let errorData: any = {};
                
                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        errorData = await response.json();
                        // NestJS error format: { message: string, statusCode: number }
                        // Also check for 'error' field which NestJS sometimes uses
                        errorMessage = errorData.message || errorData.error || errorMessage;
                    } else {
                        // If not JSON, try to read as text
                        const text = await response.text();
                        if (text) {
                            errorMessage = text;
                        }
                    }
                } catch (parseError) {
                    // If response is not JSON or text, use statusText
                    console.warn('Failed to parse error response:', parseError);
                }

                // Provide more specific error messages for common status codes
                if (response.status === 401) {
                    // Don't trigger logout for auth attempts (login/register)
                    const isAuthEndpoint = ['/auth/login', '/auth/firebase-login', '/auth/firebase-register', '/auth/verify-2fa'].some(
                        (p) => endpoint === p || endpoint.startsWith(p + '?')
                    );
                    if (!isAuthEndpoint && this.onUnauthorizedCallback) {
                        setTimeout(() => {
                            this.onUnauthorizedCallback?.();
                        }, 0);
                    }
                    // Use the error message from server if available, otherwise default
                    if (!errorMessage || errorMessage === `API Error: ${response.statusText}`) {
                        errorMessage = 'Invalid email or password. Please try again.';
                    }
                } else if (response.status === 403) {
                    errorMessage = errorData.message || 'Access denied. You do not have permission to perform this action.';
                } else if (response.status === 404) {
                    errorMessage = errorData.message || 'Resource not found.';
                } else if (response.status === 500) {
                    errorMessage = errorData.message || 'Server error. Please try again later.';
                }

                // Ensure we always have a message
                if (!errorMessage || errorMessage.trim() === '') {
                    errorMessage = `Request failed with status ${response.status}`;
                }

                const error: ApiError = {
                    message: errorMessage,
                    status: response.status,
                    statusText: response.statusText,
                };
                throw error;
            }

            // Handle empty responses
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            }
            return {} as T;
        } catch (error: any) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw formatError({
                    message: 'Request timeout. Please try again.',
                    status: 408,
                });
            }
            
            // If error is already a properly formatted ApiError with a message, throw it as is
            if (error && typeof error === 'object' && error.message && typeof error.message === 'string' && error.message.trim()) {
                throw formatError(error);
            }
            
            // If error is a string or Error object with message, format it
            if (error && (typeof error === 'string' || (error.message && typeof error.message === 'string'))) {
                const errorMessage = typeof error === 'string' ? error : error.message;
                if (errorMessage && errorMessage.trim()) {
                    throw formatError({
                        message: errorMessage,
                        status: error?.status,
                        statusText: error?.statusText,
                    });
                }
            }
            
            // Check if error is an empty object or has no meaningful message
            if (error && typeof error === 'object') {
                const errorKeys = Object.keys(error);
                const hasStatus = error.status !== undefined;
                const hasMessage = error.message && typeof error.message === 'string' && error.message.trim();
                
                // If it's an empty object or has no message, provide a default based on status
                if (!hasMessage && errorKeys.length === 0) {
                    throw formatError({
                        message: 'Network error. Please check your connection and ensure the backend is running.',
                    });
                } else if (!hasMessage && hasStatus) {
                    const statusMessages: Record<number, string> = {
                        401: 'Authentication failed. Please check your credentials.',
                        403: 'Access denied. You do not have permission.',
                        404: 'Resource not found.',
                        500: 'Server error. Please try again later.',
                    };
                    throw formatError({
                        message: statusMessages[error.status] || `Request failed with status ${error.status}`,
                        status: error.status,
                        statusText: error.statusText,
                    });
                }
            }
            
            // For any other error type, format it with a descriptive message
            const errorString = error?.toString?.() || String(error) || 'Unknown error';
            const finalMessage = errorString === '[object Object]' || !errorString || errorString.trim() === ''
                ? 'Network error. Please check your connection and ensure the backend is running.'
                : `Network error: ${errorString}`;
            throw formatError({
                message: finalMessage,
            });
        }
    }

    async post<T = any>(endpoint: string, data: any, token?: string): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        }, token);
    }

    async get<T = any>(endpoint: string, token?: string): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'GET',
        }, token);
    }

    async put<T = any>(endpoint: string, data: any, token?: string): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        }, token);
    }

    async delete<T = any>(endpoint: string, token?: string): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'DELETE',
        }, token);
    }

    async patch<T = any>(endpoint: string, data: any, token?: string): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }, token);
    }

    async uploadFile<T = any>(endpoint: string, formData: FormData, token?: string): Promise<T> {
        const headers: Record<string, string> = {
            'bypass-tunnel-reminder': 'true',
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers,
                body: formData,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                // Handle 401 in file uploads too
                if (response.status === 401 && this.onUnauthorizedCallback) {
                    setTimeout(() => {
                        this.onUnauthorizedCallback?.();
                    }, 0);
                }
                throw new Error(err.message || err.error || response.statusText);
            }
            return response.json();
        } catch (e: any) {
            clearTimeout(timeoutId);
            throw e;
        }
    }
}

export const api = new ApiClient();
