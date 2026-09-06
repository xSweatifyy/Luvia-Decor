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

  // IMPORTANT: try the exact URL saved by the admin first. Some public image
  // hosts (notably Google-hosted images) reject server-side proxy requests but
  // allow normal browser requests. This keeps the admin URL usable publicly.
  const [currentSrc, setCurrentSrc] = useState(directUrl);
  const [triedProxy, setTriedProxy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(directUrl);
    setTriedProxy(false);
    setFailed(false);
  }, [directUrl]);

  const handleError = () => {
    // If the original URL cannot be rendered by the browser, use the public
    // proxy which can resolve image-host pages such as imgbb/ibb.co.
    if (!triedProxy && proxyUrl !== directUrl && !directUrl.startsWith('blob:') && !directUrl.startsWith('data:')) {
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
