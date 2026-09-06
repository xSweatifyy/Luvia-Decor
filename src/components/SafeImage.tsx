import React, { memo, useEffect, useMemo, useState } from 'react';

interface SafeImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  loading?: 'lazy' | 'eager';
}

const FALLBACK = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=85';

function toAbsoluteUrl(value: string): string {
  try { return new URL(value, window.location.href).toString(); } catch { return value; }
}

function getProxyUrl(value: string): string {
  return `/api/image?url=${encodeURIComponent(toAbsoluteUrl(value))}`;
}

export const SafeImage: React.FC<SafeImageProps> = memo(function SafeImage({
  src,
  alt = '',
  className = '',
  fallbackSrc = FALLBACK,
  loading = 'lazy'
}) {
  const imageUrl = useMemo(() => (src || '').trim() || fallbackSrc, [src, fallbackSrc]);
  const directUrl = useMemo(() => toAbsoluteUrl(imageUrl), [imageUrl]);
  const proxyUrl = useMemo(() => getProxyUrl(imageUrl), [imageUrl]);

  // Always load saved external product URLs through the public image proxy first.
  // This makes the same image available to guests, logged-in users and crawlers,
  // even when the original image host blocks browser hotlinking/referrers.
  const [currentSrc, setCurrentSrc] = useState(proxyUrl);
  const [triedDirect, setTriedDirect] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(proxyUrl);
    setTriedDirect(false);
    setFailed(false);
  }, [proxyUrl]);

  const handleError = () => {
    if (!triedDirect && proxyUrl !== directUrl && !directUrl.startsWith('blob:')) {
      setTriedDirect(true);
      setCurrentSrc(directUrl);
      return;
    }
    if (currentSrc !== fallbackSrc) {
      setFailed(true);
      setCurrentSrc(fallbackSrc);
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
