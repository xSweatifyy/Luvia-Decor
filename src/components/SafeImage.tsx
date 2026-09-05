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

/**
 * Product/gallery images are stored as URLs. Use the original URL first so
 * Firebase Storage, Googleusercontent and other valid public image URLs load
 * directly in the browser. Only fall back to the same-origin proxy when the
 * original source rejects browser loading.
 */
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

  const [currentSrc, setCurrentSrc] = useState(directUrl);
  const [triedProxy, setTriedProxy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(directUrl);
    setTriedProxy(false);
    setFailed(false);
  }, [directUrl]);

  const handleError = () => {
    if (!triedProxy && proxyUrl !== directUrl) {
      setTriedProxy(true);
      setCurrentSrc(proxyUrl);
      return;
    }

    if (directUrl !== fallbackSrc && currentSrc !== fallbackSrc) {
      setFailed(true);
      setCurrentSrc(normalizeImageSource(fallbackSrc));
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
