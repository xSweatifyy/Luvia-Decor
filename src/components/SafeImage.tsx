import React, { memo, useMemo, useState } from 'react';

interface SafeImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  loading?: 'lazy' | 'eager';
}

const FALLBACK = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=85';

/**
 * Renders the exact image URL stored on the product.
 * No proxy, CDN rewrite or provider conversion is used.
 * If an image host rejects a transformed URL, retry the same direct URL
 * without its query parameters before showing the fallback image.
 */
export const SafeImage: React.FC<SafeImageProps> = memo(function SafeImage({
  src,
  alt = '',
  className = '',
  fallbackSrc = FALLBACK,
  loading = 'lazy'
}) {
  const imageUrl = useMemo(() => (src || '').trim() || fallbackSrc, [src, fallbackSrc]);
  const directUrl = useMemo(() => {
    try {
      return new URL(imageUrl, window.location.href).toString();
    } catch {
      return imageUrl;
    }
  }, [imageUrl]);
  const baseUrl = useMemo(() => {
    try {
      const url = new URL(directUrl);
      url.search = '';
      url.hash = '';
      return url.toString();
    } catch {
      return directUrl;
    }
  }, [directUrl]);

  const [currentSrc, setCurrentSrc] = useState(directUrl);
  const [retryBaseUrl, setRetryBaseUrl] = useState(false);
  const [failed, setFailed] = useState(false);

  React.useEffect(() => {
    setCurrentSrc(directUrl);
    setRetryBaseUrl(false);
    setFailed(false);
  }, [directUrl]);

  const handleError = () => {
    if (!retryBaseUrl && baseUrl !== directUrl) {
      setRetryBaseUrl(true);
      setCurrentSrc(baseUrl);
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
