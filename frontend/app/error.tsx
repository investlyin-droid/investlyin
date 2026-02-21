'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Route error:', error);
    }
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full rounded-xl bg-brand-surface border border-brand-border p-8 shadow-glass">
        <h1 className="text-xl font-bold text-brand-text-primary mb-2">Something went wrong</h1>
        <p className="text-brand-text-secondary text-sm mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="px-6 py-2.5 rounded-lg font-semibold bg-brand-gold text-brand-obsidian hover:opacity-90 transition"
        >
          Try again
        </button>
        <a
          href="/"
          className="block mt-4 text-sm text-brand-gold hover:underline"
        >
          Return to home
        </a>
      </div>
    </div>
  );
}
