import React, { useState, useCallback } from 'react';
import { AlertCircle, Link as LinkIcon } from 'lucide-react';
import { SafeImage } from './SafeImage';

interface ImageUploaderProps {
  onUploadComplete: (url: string) => void;
  folder: 'products' | 'gallery' | 'branding' | 'custom-orders';
  currentImageUrl?: string;
  className?: string;
  buttonText?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUploadComplete,
  currentImageUrl,
  className = ''
}) => {
  const [urlInput, setUrlInput] = useState(currentImageUrl || '');
  const [error, setError] = useState<string | null>(null);

  const handleUrlSave = useCallback(() => {
    const value = urlInput.trim();
    if (!value) {
      setError('Vložte URL obrázku.');
      return;
    }

    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      setError('URL obrázku musí začínat na http:// nebo https://.');
      return;
    }

    setError(null);
    onUploadComplete(value);
  }, [onUploadComplete, urlInput]);

  return (
    <div className={`space-y-3 ${className}`}>
      {currentImageUrl && (
        <div className="relative inline-block">
          <SafeImage
            src={currentImageUrl}
            alt="Náhled"
            className="w-24 h-24 object-cover rounded-xl border border-[#E3DACF]"
            loading="eager"
          />
        </div>
      )}

      <div className="rounded-xl border border-[#E3DACF] bg-[#FAF8F5] p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#5C5046]">
          <LinkIcon className="w-4 h-4 text-[#8C7355]" />
          <span>URL obrázku</span>
        </div>
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onBlur={() => setUrlInput((value) => value.trim())}
          placeholder="https://..."
          className="w-full rounded-lg border border-[#E3DACF] bg-white px-3 py-2 text-xs text-[#2D2723] outline-none focus:border-[#8C7355]"
        />
        <p className="text-[10px] text-[#7B6E63]">
          Obrázky se ukládají pouze jako veřejné HTTPS URL. Luvia Decor nepoužívá Firebase Storage.
        </p>
        <button
          type="button"
          onClick={handleUrlSave}
          className="px-4 py-2 bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Použít URL</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
