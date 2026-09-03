import React, { memo, useEffect, useMemo, useState } from 'react';

interface SafeImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  loading?: 'lazy' | 'eager';
}

const FALLBACK = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=85';

/** Converts common Firebase/Google Storage URL formats to a browser-loadable URL. */
export function normalizeImageUrl(src?: string | null): string {
  const value = String(src ?? '').trim();
  if (!value || /^(data:|blob:|\/)/i.test(value)) return value;

  // Firebase Storage gs://bucket/path format.
  if (value.startsWith('gs://')) {
    const withoutScheme = value.slice(5);
    const slash = withoutScheme.indexOf('/');
    if (slash > 0) {
      const bucket = withoutScheme.slice(0, slash);
      const path = withoutScheme.slice(slash + 1);
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
    }
  }

  return value;
}

function shouldProxy(src: string): boolean {
  if (!src || /^(data:|blob:|\/)/i.test(src)) return false;
  try {
    const url = new URL(src, window.location.href);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getProxySource(src: string): string | null {
  if (!shouldProxy(src)) return null;
  try {
    const url = new URL(src, window.location.href);
    // Firebase Storage is already a public image endpoint; loading it directly
    // is more reliable for browsers, crawlers and social-media previews.
    const host = url.hostname.toLowerCase();
    if (host === 'firebasestorage.googleapis.com' || host.endsWith('.firebasestorage.app')) return null;
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
  const original = useMemo(() => normalizeImageUrl(src), [src]);
  const fallback = normalizeImageUrl(fallbackSrc);
  const proxy = getProxySource(original);
  const [currentSrc, setCurrentSrc] = useState(original || fallback);
  const [originalFailed, setOriginalFailed] = useState(false);
  const [proxyFailed, setProxyFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(original || fallback);
    setOriginalFailed(false);
    setProxyFailed(false);
  }, [original, fallback]);

  const handleError = () => {
    // First attempt is always the real URL. If it fails and a proxy exists,
    // retry through our server proxy before showing the fallback image.
    if (original && currentSrc === original && proxy && !proxyFailed) {
      setProxyFailed(true);
      setCurrentSrc(proxy);
      return;
    }
    if (original && !originalFailed) {
      setOriginalFailed(true);
      setCurrentSrc(fallback);
      return;
    }
    if (currentSrc !== fallback) setCurrentSrc(fallback);
  };

  return (
    <img
      src={currentSrc || fallback}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      fetchPriority={loading === 'eager' ? 'high' : 'auto'}
      onError={handleError}
      data-image-source={
        currentSrc === original ? 'original' :
        currentSrc === fallback ? 'fallback' : 'proxy'
      }
    />
  );
});

SafeImage.displayName = 'SafeImage';
