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
  const value = String(src || '').trim();
  if (!value) return '';

  // Firebase Storage references can be stored as gs:// URLs. Convert them
  // to a public media endpoint; if a token is required, the proxy/direct URL
  // fallback will still get a chance to load the original value.
  if (/^gs:\/\//i.test(value)) {
    const withoutScheme = value.slice(5);
    const slash = withoutScheme.indexOf('/');
    if (slash > 0) {
      const bucket = withoutScheme.slice(0, slash);
      const objectPath = withoutScheme.slice(slash + 1);
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media`;
    }
  }

  return value;
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
  const [currentSrc, setCurrentSrc] = useState(proxy || original);
  const [attempt, setAttempt] = useState(proxy ? 1 : 0);

  useEffect(() => {
    setCurrentSrc(proxy || original);
    setAttempt(proxy ? 1 : 0);
  }, [original, proxy]);

  const handleError = () => {
    // If the proxy failed, try the original URL directly. This covers
    // Firebase download URLs and other sources that allow browser loading
    // but do not work through a server-side fetch.
    if (attempt === 1 && original && original !== currentSrc) {
      setAttempt(0);
      setCurrentSrc(original);
      return;
    }

    if (attempt !== 2 && fallback && fallback !== currentSrc) {
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
