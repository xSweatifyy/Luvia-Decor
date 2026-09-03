import React, { memo } from 'react';

interface SafeImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  loading?: 'lazy' | 'eager';
}

const FALLBACK = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=85';

/**
 * Always use the exact image URL stored on the product.
 * No proxy, CDN, URL rewriting or provider conversion is used.
 */
export const SafeImage: React.FC<SafeImageProps> = memo(function SafeImage({
  src,
  alt = '',
  className = '',
  fallbackSrc = FALLBACK,
  loading = 'lazy'
}) {
  const imageUrl = (src || '').trim() || fallbackSrc;

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      fetchPriority={loading === 'eager' ? 'high' : 'auto'}
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
});

SafeImage.displayName = 'SafeImage';
