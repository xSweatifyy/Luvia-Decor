import React, { memo, useEffect, useState } from 'react';

interface SafeImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  loading?: 'lazy' | 'eager';
}

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

SafeImage.displayName = 'SafeImage';
