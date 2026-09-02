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
      if (fileId) return 'https://drive.google.com/uc?export=view&id=' + encodeURIComponent(fileId);
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

function getWeservUrl(url: string): string {
  return 'https://images.weserv.nl/?url=' + encodeURIComponent(url);
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
  var hasSource = Boolean(normalizedSrc);
  var isExternal = /^https?:\/\//i.test(normalizedSrc);

  // External images must be loaded through our own domain first. This avoids
  // browser/session/hotlink restrictions on Googleusercontent, Drive, etc.
  var initialSrc = hasSource && isExternal
    ? getProxyUrl(normalizedSrc)
    : (hasSource ? normalizedSrc : normalizedFallback);

  var state = useState(initialSrc);
  var currentSrc = state[0];
  var setCurrentSrc = state[1];
  var stageState = useState(0);
  var stage = stageState[0];
  var setStage = stageState[1];

  useEffect(function () {
    setCurrentSrc(initialSrc);
    setStage(0);
  }, [initialSrc]);

  function handleError() {
    // Own proxy -> public CDN -> original URL -> static fallback.
    if (isExternal && stage === 0) {
      setStage(1);
      setCurrentSrc(getWeservUrl(normalizedSrc));
      return;
    }
    if (isExternal && stage === 1) {
      setStage(2);
      setCurrentSrc(normalizedSrc);
      return;
    }
    if (currentSrc !== normalizedFallback) {
      setStage(3);
      setCurrentSrc(normalizedFallback);
      return;
    }
    setCurrentSrc('');
  }

  if (!currentSrc) {
    return (
      <div className={className + ' flex items-center justify-center bg-[#FAF6F0]'} role="img" aria-label={alt}>
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
