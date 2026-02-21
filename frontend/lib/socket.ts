// Same default as API so frontend and backend stay in sync
const DEFAULT_BACKEND_URL = 'http://localhost:3001';

// For Socket.IO, we need the HTTP/HTTPS URL, not WebSocket URL
// Socket.IO handles the WebSocket conversion internally
export function getSocketIoUrl(): string {
  const envUrl = typeof window === 'undefined'
    ? (process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL)
    : (process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL);
  if (envUrl) return envUrl;
  return DEFAULT_BACKEND_URL;
}

// Legacy function for backward compatibility
export function getWsBaseUrl(): string {
  return getSocketIoUrl();
}
