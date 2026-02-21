'use client';

/**
 * Root-level error boundary. Replaces the entire root layout when an uncaught error occurs.
 * Must define its own <html> and <body> (root layout is not rendered).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Global error:', error);
  }

  return (
    <html lang="en">
      <body style={{
        margin: 0,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#0F1115',
        color: '#fff',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}>
        <div style={{
          maxWidth: 420,
          width: '100%',
          background: '#151923',
          border: '1px solid #252A35',
          borderRadius: 12,
          padding: 32,
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ color: '#8B92A7', fontSize: 14, marginBottom: 24 }}>
            A critical error occurred. Please refresh the page or try again later.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              fontWeight: 600,
              background: '#FFB800',
              color: '#0A0E1A',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <br />
          <a
            href="/"
            style={{ display: 'inline-block', marginTop: 16, fontSize: 14, color: '#FFB800' }}
          >
            Return to home
          </a>
        </div>
      </body>
    </html>
  );
}
