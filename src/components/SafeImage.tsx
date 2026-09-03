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

function isExternalHttpSource(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

function isGoogleUserContentSource(src: string): boolean {
  try {
    const url = new URL(src, window.location.href);
    return url.hostname.toLowerCase().endsWith('googleusercontent.com');
  } catch {
    return false;
  }
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
  const proxy = getProxySource(original);
  const preferProxy = isExternalHttpSource(original) && isGoogleUserContentSource(original);
  const initialSource = preferProxy && proxy ? proxy : (original || fallback);

  const [currentSrc, setCurrentSrc] = useState(initialSource);
  const [failedOriginal, setFailedOriginal] = useState(false);
  const [failedProxy, setFailedProxy] = useState(false);

  useEffect(() => {
    const nextProxy = getProxySource(original);
    const nextPreferProxy = isExternalHttpSource(original) && isGoogleUserContentSource(original);
    setCurrentSrc(nextPreferProxy && nextProxy ? nextProxy : (original || fallback));
    setFailedOriginal(false);
    setFailedProxy(false);
  }, [original, fallback]);

  const handleError = () => {
    // Googleusercontent/Sites images go through our proxy first because the
    // browser can be blocked by Google's cross-origin/referrer rules.
    if (preferProxy && currentSrc === proxy && !failedProxy) {
      setFailedProxy(true);
      if (original) {
        setCurrentSrc(original);
        return;
      }
    }

    if (!failedOriginal && original && currentSrc === original) {
      const nextProxy = getProxySource(original);
      setFailedOriginal(true);
      if (nextProxy && nextProxy !== original && !failedProxy) {
        setCurrentSrc(nextProxy);
        return;
      }
    }

    if (currentSrc !== fallback && fallback) {
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
