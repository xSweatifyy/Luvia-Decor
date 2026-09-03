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
  if (!url) return '';

  // Firebase/Google storage sometimes stores an object as gs://...
  if (url.startsWith('gs://')) {
    const withoutScheme = url.slice(5);
    const slash = withoutScheme.indexOf('/');
    if (slash > 0) {
      const bucket = withoutScheme.slice(0, slash);
      const objectPath = withoutScheme.slice(slash + 1);
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media`;
    }
  }

  if (url.startsWith('//')) url = 'https:' + url;
  if (!/^(https?:|data:|blob:|\/)/i.test(url)) return url;

  try {
    if (url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:')) return url;
    const parsed = new URL(url);

    if (parsed.hostname.includes('drive.google.com')) {
      const match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
      const fileId = (match && match[1]) || parsed.searchParams.get('id');
      if (fileId) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;
    }

    if (parsed.hostname === 'dropbox.com' || parsed.hostname === 'www.dropbox.com') {
      parsed.searchParams.set('raw', '1');
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

function isTrustedImageHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes('unsplash.com') || host.includes('images.unsplash.com') || host.includes('firebasestorage.googleapis.com') || host.includes('storage.googleapis.com');
  } catch {
    return false;
  }
}

export const SafeImage: React.FC<SafeImageProps> = memo(function SafeImage({
  src, alt = '', className = '', fallbackSrc = FALLBACK, loading = 'lazy'
}) {
  const original = normalizeUrl(src);
  const fallback = normalizeUrl(fallbackSrc) || FALLBACK;
  const external = /^https?:\/\//i.test(original);

  // Direct URL first for the common image hosts. If a provider blocks the
  // browser, fall back to the Vercel proxy/CDN automatically.
  const candidates = external
    ? isTrustedImageHost(original)
      ? [original, proxyUrl(original), cdnUrl(original), fallback]
      : [proxyUrl(original), original, cdnUrl(original), fallback]
    : [original || fallback, fallback];

  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const current = candidates[index] || fallback;

  useEffect(() => {
    setIndex(0);
    setFailed(false);
  }, [original, fallback]);

  const handleError = () => {
    if (index < candidates.length - 1) setIndex(value => value + 1);
    else setFailed(true);
  };

  if (failed || !current) {
    return (
      <div className={`${className} flex items-center justify-center bg-[#FAF6F0]`} role="img" aria-label={alt}>
        <span className="text-[#8C7355] text-sm text-center px-3">Obrázek se nepodařilo načíst</span>
      </div>
    );
  }

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      fetchPriority={loading === 'eager' ? 'high' : 'auto'}
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
});

SafeImage.displayName = 'SafeImage';
