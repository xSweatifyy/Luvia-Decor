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

function isGoogleImageUrl(src: string): boolean {
  try {
    const host = new URL(src).hostname.toLowerCase();
    return host === 'lh3.googleusercontent.com' || host.endsWith('.googleusercontent.com');
  } catch {
    return false;
  }
}

function proxySource(src: string): string | null {
  // Googleusercontent image URLs are public, signed/parameterized image URLs.
  // Rewriting them through our proxy can invalidate the URL and cause a retry
  // loop, so always keep them direct.
  if (!src || isGoogleImageUrl(src) || /^(data:|blob:)/i.test(src) || src.startsWith('/')) return null;
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
  // The stored URL is rendered directly first. This is important for
  // lh3.googleusercontent.com and other public image URLs.
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
    // One-way fallback chain only: direct -> proxy -> fallback.
    // Never switch back to the original URL, which previously caused an
    // endless direct/proxy loop and visible image flashing.
    if (attempt === 0 && proxy && proxy !== currentSrc) {
      setAttempt(1);
      setCurrentSrc(proxy);
      return;
    }

    if (attempt <= 1 && fallback && fallback !== currentSrc && fallback !== original) {
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
