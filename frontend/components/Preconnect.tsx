'use client';

import { useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** Injects preconnect/dns-prefetch for the API so the first request is faster. */
export default function Preconnect() {
  useEffect(() => {
    try {
      const preconnect = document.createElement('link');
      preconnect.rel = 'preconnect';
      preconnect.href = API_URL;
      document.head.appendChild(preconnect);
      const dns = document.createElement('link');
      dns.rel = 'dns-prefetch';
      dns.href = API_URL;
      document.head.appendChild(dns);
    } catch (_) {}
  }, []);
  return null;
}
