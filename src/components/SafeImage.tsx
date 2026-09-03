import React, { memo, useMemo, useState } from 'react';

interface SafeImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  loading?: 'lazy' | 'eager';
}

const FALLBACK = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=85';

function toImageSource(src: string, fallbackSrc: string): string {
  const value = (src || '').trim() || fallbackSrc;
  if (/^(data:|blob:)/i.test(value)) return value;
  if (value.startsWith('/api/image') || value.startsWith('/')) return value;
  try {
    const url = new URL(value, window.location.href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return value;
    return `/api/image?url=${encodeURIComponent(url.toString())}`;
  } catch {
    return value;
  }
}

export const SafeImage: React.FC<SafeImageProps> = memo(function SafeImage({
  src,
  alt = '',
  className = '',
  fallbackSrc = FALLBACK,
  loading = 'lazy'
}) {
  const originalUrl = useMemo(() => (src || '').trim() || fallbackSrc, [src, fallbackSrc]);
  const imageUrl = useMemo(() => toImageSource(originalUrl, fallbackSrc), [originalUrl, fallbackSrc]);
  const fallbackUrl = useMemo(() => toImageSource(fallbackSrc, fallbackSrc), [fallbackSrc]);
  const [currentSrc, setCurrentSrc] = useState(imageUrl);
  const [failed, setFailed] = useState(false);

  React.useEffect(() => {
    setCurrentSrc(imageUrl);
    setFailed(false);
  }, [imageUrl]);

  const handleError = () => {
    if (currentSrc !== fallbackUrl) {
      setFailed(true);
      setCurrentSrc(fallbackUrl);
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
