import React, { memo, useEffect, useMemo, useState } from 'react';

interface SafeImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  loading?: 'lazy' | 'eager';
}

const FALLBACK = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=85';

function normalizeSource(src?: string | null): string {
  return String(src || '').trim();
}

function proxySource(src: string): string | null {
  if (!src || /^(data:|blob:)/i.test(src) || src.startsWith('/')) return null;
  try {
    const url = new URL(src, window.location.href);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return `/api/image?url=${encodeURIComponent(url.toString())}`;
  } catch {
    return null;
  }
}

export const SafeImage: React.FC<SafeImageProps> = memo(function SafeImage({
  src,
  alt = '',
  className = '',
  fallbackSrc = FALLBACK,
  loading = 'lazy'
}) {
  const original = useMemo(() => normalizeSource(src) || fallbackSrc, [src, fallbackSrc]);
  const proxy = useMemo(() => proxySource(original), [original]);
  const fallback = useMemo(() => normalizeSource(fallbackSrc), [fallbackSrc]);
  const [currentSrc, setCurrentSrc] = useState(original);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setCurrentSrc(original);
    setAttempt(0);
  }, [original]);

  const handleError = () => {
    // First use the stored URL directly. Firebase Storage download URLs
    // are valid browser image sources and must not be forced through CORS.
    // If the source blocks direct loading, retry through our same-origin proxy.
    if (attempt === 0 && proxy && proxy !== currentSrc) {
      setAttempt(1);
      setCurrentSrc(proxy);
      return;
    }
    if (attempt < 2 && fallback && fallback !== currentSrc) {
      setAttempt(2);
      setCurrentSrc(fallback);
    }
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      fetchPriority={loading === 'eager' ? 'high' : 'auto'}
      referrerPolicy="no-referrer"
      onError={handleError}
      data-image-source={attempt === 1 ? 'proxy' : attempt === 2 ? 'fallback' : 'original'}
    />
  );
});

SafeImage.displayName = 'SafeImage';
