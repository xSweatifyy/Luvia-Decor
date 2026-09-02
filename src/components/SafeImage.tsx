import React, { memo, useEffect, useState } from 'react';

interface SafeImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  loading?: 'lazy' | 'eager';
}

<<<<<<< HEAD
const FALLBACK =
  'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=85';

function normalizeUrl(value?: string | null): string {
  if (!value) return '';

  // Strip all whitespace/newlines (URLs pasted from chat often wrap over lines)
  let url = value.replace(/\s+/g, '').trim();

  // HTML-encoded URL
  url = url.replace(/&amp;/g, '&');

  // Already usable browser URLs
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    try {
      const parsed = new URL(url);

      // Google Drive (use thumbnail endpoint – reliable for public files)
      if (parsed.hostname.includes('drive.google.com')) {
        const fileId =
          parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ||
          parsed.pathname.match(/\/thumbnail\?id=([^&]+)/)?.[1] ||
          parsed.searchParams.get('id');

        if (fileId) {
          return `https://drive.google.com/thumbnail?id=${encodeURIComponent(
            fileId
          )}&sz=w1600`;
        }
      }

      // Googleusercontent without size params (e.g. profile/site images)
      if (parsed.hostname.endsWith('googleusercontent.com')) {
        return url;
      }

      // Dropbox
      if (
        parsed.hostname === 'dropbox.com' ||
        parsed.hostname === 'www.dropbox.com'
      ) {
        parsed.searchParams.set('raw', '1');
        return parsed.toString();
      }

      // OneDrive
      if (parsed.hostname.includes('1drv.ms')) {
        parsed.searchParams.set('download', '1');
        return parsed.toString();
      }

      // SharePoint
      if (parsed.hostname.includes('sharepoint.com')) {
        parsed.searchParams.set('download', '1');
        return parsed.toString();
      }

      return parsed.toString();
    } catch {
      return url;
    }
  }

  // If somebody enters a URL without protocol
  if (url.startsWith('//')) {
    return `https:${url}`;
  }

  // Common pasted forms without protocol (www., lh3.googleusercontent., drive.google.)
  if (/^(www\.|[a-z0-9-]+\.googleusercontent\.com|drive\.google\.com)/i.test(url)) {
    return `https://${url}`;
  }

  return url;
}

export const SafeImage: React.FC<SafeImageProps> = memo(
  ({
    src,
    alt = '',
    className = '',
    fallbackSrc = FALLBACK,
    loading = 'lazy',
  }) => {
    const normalizedSrc = normalizeUrl(src);
    const normalizedFallback = normalizeUrl(fallbackSrc) || FALLBACK;

    const [currentSrc, setCurrentSrc] = useState(
      normalizedSrc || normalizedFallback
    );

    const [failed, setFailed] = useState(false);

    useEffect(() => {
      setCurrentSrc(normalizedSrc || normalizedFallback);
      setFailed(false);
    }, [normalizedSrc, normalizedFallback]);

    const handleError = () => {
      if (!failed) {
        setFailed(true);
        setCurrentSrc(normalizedFallback);
      } else {
        // Prevent endless onError loops
        setCurrentSrc('');
      }
    };

    if (!currentSrc) {
      return (
        <div
          className={`${className} flex items-center justify-center bg-[#FAF6F0]`}
          role="img"
          aria-label={alt}
        >
          <span className="text-[#8C7355] text-sm">
            Obrázek se nepodařilo načíst
          </span>
        </div>
      );
    }

    return (
      <img
        src={currentSrc}
        alt={alt}
        className={className}
        loading={loading}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={handleError}
      />
    );
  }
);
=======
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
  loading = 'eager',
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
>>>>>>> e01e93ced5a21bbac8caca58fd323703c6e5590f

SafeImage.displayName = 'SafeImage';
