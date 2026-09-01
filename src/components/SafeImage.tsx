import React, { useState, useEffect, useCallback, memo } from 'react';

interface SafeImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  loading?: 'lazy' | 'eager';
  onError?: () => void;
}

const DEFAULT_FALLBACK = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80';
const SVG_FALLBACK = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23FAF6F0'/%3E%3Cpath d='M200 150c-25 0-40 18-40 40s15 40 40 40 40-18 40-40-15-40-40-40zm0 60c-11 0-20-9-20-20s9-20 20-20 20 9 20 20-9 20-20 20z' fill='%23C5A880' opacity='0.6'/%3E%3Ctext x='50%25' y='68%25' dominant-baseline='middle' text-anchor='middle' font-family='serif' font-size='16' font-weight='bold' fill='%238C7355'%3ELuvia Decor%3C/text%3E%3C/svg%3E";

export const SafeImage: React.FC<SafeImageProps> = memo(({
  src,
  alt,
  className = '',
  fallbackSrc = DEFAULT_FALLBACK,
  loading = 'lazy',
  onError
}) => {
  const getInitialSrc = (inputSrc?: string | null) => {
    const clean = typeof inputSrc === 'string' ? inputSrc.trim() : '';
    return clean || fallbackSrc || SVG_FALLBACK;
  };

  const [imgSrc, setImgSrc] = useState<string>(() => getInitialSrc(src));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const clean = typeof src === 'string' ? src.trim() : '';
    setImgSrc(clean || fallbackSrc || SVG_FALLBACK);
    setHasError(false);
  }, [src, fallbackSrc]);

  const handleError = useCallback(() => {
    if (!hasError) {
      setHasError(true);
      const targetFallback = fallbackSrc && fallbackSrc !== imgSrc ? fallbackSrc : SVG_FALLBACK;
      setImgSrc(targetFallback);
      onError?.();
    } else if (imgSrc !== SVG_FALLBACK) {
      setImgSrc(SVG_FALLBACK);
    }
  }, [hasError, fallbackSrc, imgSrc, onError]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      loading={loading}
      onError={handleError}
    />
  );
});

SafeImage.displayName = 'SafeImage';

