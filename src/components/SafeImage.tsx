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

  var url = value.trim().replace(/&amp;/g, '&');

  if (url.indexOf('//') === 0) return 'https:' + url;
  if (!/^(https?:|data:|blob:)/i.test(url)) return url;

  try {
    var parsed = new URL(url);

    if (parsed.hostname.indexOf('drive.google.com') !== -1) {
      var match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
      var fileId = (match && match[1]) || parsed.searchParams.get('id');
      if (fileId) {
        return 'https://drive.google.com/uc?export=view&id=' + encodeURIComponent(fileId);
      }
    }

    if (parsed.hostname === 'dropbox.com' || parsed.hostname === 'www.dropbox.com') {
      parsed.searchParams.set('raw', '1');
      return parsed.toString();
    }

    if (parsed.hostname.indexOf('1drv.ms') !== -1 || parsed.hostname.indexOf('sharepoint.com') !== -1) {
      parsed.searchParams.set('download', '1');
      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

function getProxyUrl(url: string): string {
  return '/api/image-proxy?url=' + encodeURIComponent(url);
}

export const SafeImage: React.FC<SafeImageProps> = memo(function SafeImage({
  src,
  alt = '',
  className = '',
  fallbackSrc = FALLBACK,
  loading = 'lazy',
}) {
  var normalizedSrc = normalizeUrl(src);
  var normalizedFallback = normalizeUrl(fallbackSrc) || FALLBACK;
  var initialSrc = normalizedSrc || normalizedFallback;
  var isExternal = /^https?:\/\//i.test(initialSrc);

  var state = useState(initialSrc);
  var currentSrc = state[0];
  var setCurrentSrc = state[1];
  var failedState = useState(false);
  var failed = failedState[0];
  var setFailed = failedState[1];
  var proxiedState = useState(false);
  var proxied = proxiedState[0];
  var setProxied = proxiedState[1];

  useEffect(function () {
    setCurrentSrc(initialSrc);
    setFailed(false);
    setProxied(false);
  }, [initialSrc]);

  function handleError() {
    if (isExternal && !proxied) {
      setProxied(true);
      setCurrentSrc(getProxyUrl(initialSrc));
      return;
    }

    if (!failed) {
      setFailed(true);
      setCurrentSrc(normalizedFallback);
    } else {
      setCurrentSrc('');
    }
  }

  if (!currentSrc) {
    return (
      <div
        className={className + ' flex items-center justify-center bg-[#FAF6F0]'}
        role="img"
        aria-label={alt}
      >
        <span className="text-[#8C7355] text-sm">Obrázek se nepodařilo načíst</span>
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
});

SafeImage.displayName = 'SafeImage';
