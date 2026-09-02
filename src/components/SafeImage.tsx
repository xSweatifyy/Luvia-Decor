import React, { memo, useEffect, useState } from 'react';

interface SafeImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  loading?: 'lazy' | 'eager';
}

const FALLBACK = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=85';

function normalizeUrl(value?: string | null): string {
  if (!value) return '';
  let url = value.trim().replace(/&amp;/g, '&');
  if (url.startsWith('//')) url = 'https:' + url;
  if (!/^(https?:|data:|blob:)/i.test(url)) return url;

  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('drive.google.com')) {
      const match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
      const fileId = (match && match[1]) || parsed.searchParams.get('id');
      if (fileId) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;
    }
    if (parsed.hostname === 'dropbox.com' || parsed.hostname === 'www.dropbox.com') {
      parsed.searchParams.set('raw', '1');
    }
    if (parsed.hostname.includes('1drv.ms') || parsed.hostname.includes('sharepoint.com')) {
      parsed.searchParams.set('download', '1');
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function proxyUrl(url: string): string {
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

function cdnUrl(url: string): string {
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
}

export const SafeImage: React.FC<SafeImageProps> = memo(function SafeImage({
  src,
  alt = '',
  className = '',
  fallbackSrc = FALLBACK,
  loading = 'lazy',
}) {
  const original = normalizeUrl(src);
  const fallback = normalizeUrl(fallbackSrc) || FALLBACK;
  const external = /^https?:\/\//i.test(original);

  // Never make the browser download the customer's external image directly.
  // Every external image goes through our same-origin proxy first, which makes
  // the result independent of Chrome/Firefox/Edge/Safari hotlink behaviour.
  const candidates = external
    ? [proxyUrl(original), cdnUrl(original), original, fallback]
    : [original || fallback, fallback];

  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const current = candidates[index] || fallback;

  useEffect(() => {
    setIndex(0);
    setFailed(false);
  }, [original, fallback]);

  const handleError = () => {
    if (index < candidates.length - 1) {
      setIndex((value) => value + 1);
    } else {
      setFailed(true);
    }
  };

  if (failed || !current) {
    return (
      <div className={`${className} flex items-center justify-center bg-[#FAF6F0]`} role="img" aria-label={alt}>
        <span className="text-[#8C7355] text-sm">Obrázek se nepodařilo načíst</span>
      </div>
    );
  }

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      loading={loading}
      decoding="auto"
      fetchPriority={loading === 'eager' ? 'high' : 'auto'}
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
});

SafeImage.displayName = 'SafeImage';
