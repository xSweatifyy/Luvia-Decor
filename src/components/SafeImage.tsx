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
  // IMPORTANT: keep the stored URL exactly as entered. Googleusercontent,
  // Firebase download URLs, Unsplash and other public image URLs can all be
  // rendered directly by <img> without CORS permission.
  const original = useMemo(() => normalizeSource(src) || normalizeSource(fallbackSrc), [src, fallbackSrc]);
  const proxy = useMemo(() => proxySource(original), [original]);
  const fallback = useMemo(() => normalizeSource(fallbackSrc), [fallbackSrc]);
  const [currentSrc, setCurrentSrc] = useState(original);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setCurrentSrc(original);
    setAttempt(0);
  }, [original]);

  const handleError = () => {
    // Direct URL is always the first attempt. This is essential for URLs
    // such as lh3.googleusercontent.com/... where changing the URL can make
    // the image inaccessible.
    if (attempt === 0 && proxy && proxy !== currentSrc) {
      setAttempt(1);
      setCurrentSrc(proxy);
      return;
    }

    if (attempt === 1 && original !== currentSrc) {
      setAttempt(0);
      setCurrentSrc(original);
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
      onError={handleError}
      data-image-source={attempt === 1 ? 'proxy' : attempt === 2 ? 'fallback' : 'original'}
    />
  );
});

SafeImage.displayName = 'SafeImage';
