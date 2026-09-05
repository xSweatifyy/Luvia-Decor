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

  // The saved public URL is always the first choice. Proxy is only a fallback.
  // This keeps existing product URLs unchanged and does not use Firebase Storage.
  const [currentSrc, setCurrentSrc] = useState(directUrl);
  const [triedProxy, setTriedProxy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(directUrl);
    setTriedProxy(false);
    setFailed(false);
  }, [directUrl]);

  const handleError = () => {
    if (!triedProxy && proxyUrl !== directUrl && !directUrl.startsWith('blob:')) {
      setTriedProxy(true);
      setCurrentSrc(proxyUrl);
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
