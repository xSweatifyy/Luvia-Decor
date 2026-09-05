import React, { memo, useEffect, useMemo, useState } from 'react';

interface SafeImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  loading?: 'lazy' | 'eager';
}

const FALLBACK = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=85';

function normalizeImageSource(value: string): string {
  const input = value.trim();
  if (!input.startsWith('gs://')) return input;
  const withoutScheme = input.slice(5);
  const slash = withoutScheme.indexOf('/');
  if (slash <= 0) return input;
  const bucket = withoutScheme.slice(0, slash);
  const path = withoutScheme.slice(slash + 1);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
}

function toAbsoluteUrl(value: string): string {
  try {
    return new URL(value, window.location.href).toString();
  } catch {
    return value;
  }
}

function shouldProxyFirst(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.href);
    const host = parsed.hostname.toLowerCase();
    return host === 'firebasestorage.googleapis.com' || host.endsWith('.firebasestorage.app') || host.endsWith('googleusercontent.com');
  } catch {
    return false;
  }
}

export const SafeImage: React.FC<SafeImageProps> = memo(function SafeImage({
  src,
  alt = '',
  className = '',
  fallbackSrc = FALLBACK,
  loading = 'lazy'
}) {
  const imageUrl = useMemo(() => normalizeImageSource((src || '').trim()) || normalizeImageSource(fallbackSrc), [src, fallbackSrc]);
  const directUrl = useMemo(() => toAbsoluteUrl(imageUrl), [imageUrl]);

  const proxyUrl = useMemo(() => {
    try {
      const parsed = new URL(directUrl, window.location.href);
      if (parsed.origin === window.location.origin || parsed.protocol === 'data:' || parsed.protocol === 'blob:') return directUrl;
      return `/api/image?url=${encodeURIComponent(directUrl)}`;
    } catch {
      return directUrl;
    }
  }, [directUrl]);

  const firstSrc = useMemo(() => shouldProxyFirst(directUrl) ? proxyUrl : directUrl, [directUrl, proxyUrl]);
  const [currentSrc, setCurrentSrc] = useState(firstSrc);
  const [triedAlternate, setTriedAlternate] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(firstSrc);
    setTriedAlternate(false);
    setFailed(false);
  }, [firstSrc]);

  const handleError = () => {
    if (!triedAlternate) {
      setTriedAlternate(true);
      setCurrentSrc(currentSrc === directUrl ? proxyUrl : directUrl);
      return;
    }

    const normalizedFallback = normalizeImageSource(fallbackSrc);
    if (currentSrc !== normalizedFallback) {
      setFailed(true);
      setCurrentSrc(normalizedFallback);
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
      data-image-failed={failed ? 'true' : undefined}
    />
  );
});

SafeImage.displayName = 'SafeImage';
