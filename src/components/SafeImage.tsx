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
  try {
    return new URL(value, window.location.href).toString();
  } catch {
    return value;
  }
}

function getImageUrl(value: string): string {
  const absolute = toAbsoluteUrl(value);

  try {
    const parsed = new URL(absolute, window.location.href);
    // Všechny externí obrázky načítáme přes náš veřejný Vercel proxy endpoint.
    // Díky tomu obrázky nejsou závislé na CORS, referreru ani oprávnění
    // konkrétního prohlížeče. Lokální/data/blob URL necháváme přímo.
    if (parsed.origin === window.location.origin || parsed.protocol === 'data:' || parsed.protocol === 'blob:') {
      return absolute;
    }
    return `/api/image?url=${encodeURIComponent(absolute)}`;
  } catch {
    return absolute;
  }
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
  const publicUrl = useMemo(() => getImageUrl(imageUrl), [imageUrl]);

  const [currentSrc, setCurrentSrc] = useState(publicUrl);
  const [triedDirect, setTriedDirect] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(publicUrl);
    setTriedDirect(false);
    setFailed(false);
  }, [publicUrl]);

  const handleError = () => {
    // Pokud proxy selže, zkusíme ještě přímý veřejný URL zdroj.
    if (!triedDirect && publicUrl !== directUrl) {
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
