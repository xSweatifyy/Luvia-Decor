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
 * External product image hosts can block browser hotlinking or referrers.
 * Load them through the existing same-origin /api/image proxy first so the
 * public shop receives the image from the Luvia domain consistently.
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

  const publicUrl = useMemo(() => {
    try {
      const parsed = new URL(directUrl, window.location.href);
      if (parsed.origin === window.location.origin || parsed.pathname.startsWith('/api/image')) return directUrl;
      return `/api/image?url=${encodeURIComponent(directUrl)}`;
    } catch {
      return directUrl;
    }
  }, [directUrl]);

  const [currentSrc, setCurrentSrc] = useState(publicUrl);
  const [triedDirect, setTriedDirect] = useState(false);
  const [failed, setFailed] = useState(false);

  React.useEffect(() => {
    setCurrentSrc(publicUrl);
    setTriedDirect(false);
    setFailed(false);
  }, [publicUrl]);

  const handleError = () => {
    if (!triedDirect && directUrl !== publicUrl) {
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
