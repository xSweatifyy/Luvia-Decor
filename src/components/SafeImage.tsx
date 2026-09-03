import React, { memo, useEffect, useState } from 'react';

interface SafeImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  loading?: 'lazy' | 'eager';
}

const FALLBACK = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=85';

function normalizeSource(src?: string | null): string {
  return String(src ?? '').trim();
}

function getProxySource(src: string): string | null {
  if (!src || /^(data:|blob:)/i.test(src) || src.startsWith('/')) return null;

  try {
    const url = new URL(src, window.location.href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
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
  const original = normalizeSource(src);
  const fallback = normalizeSource(fallbackSrc);
  const [currentSrc, setCurrentSrc] = useState(original || fallback);
  const [failedOriginal, setFailedOriginal] = useState(false);
  const [failedProxy, setFailedProxy] = useState(false);

  useEffect(() => {
    setCurrentSrc(original || fallback);
    setFailedOriginal(false);
    setFailedProxy(false);
  }, [original, fallback]);

  const handleError = () => {
    if (!failedOriginal && original && currentSrc === original) {
      const proxy = getProxySource(original);
      setFailedOriginal(true);
      if (proxy && proxy !== original) {
        setCurrentSrc(proxy);
        return;
      }
    }

    if (!failedProxy && currentSrc !== fallback && fallback) {
      setFailedProxy(true);
      setCurrentSrc(fallback);
    }
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
