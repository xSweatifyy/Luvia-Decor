import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { uploadImage, getImageFromFile, validateImageFile } from '../lib/storage';
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
  folder,
  currentImageUrl,
  className = '',
  buttonText = 'Nahrát obrázek'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Neplatný soubor.');
      return;
    }
    try {
      const dataUrl = await getImageFromFile(file);
      setPreview(dataUrl);
    } catch {
      setError('Chyba při náhledu souboru.');
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!fileInputRef.current?.files?.[0]) {
      setError('Nebyl vybrán žádný soubor.');
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const file = fileInputRef.current.files[0];
      const result = await uploadImage(file, folder);
      if (result.success && result.url) {
        onUploadComplete(result.url);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setError(result.error || 'Nahrávání selhalo.');
      }
    } catch (err: any) {
      setError(err.message || 'Nahrávání selhalo.');
    } finally {
      setIsUploading(false);
    }
  }, [folder, onUploadComplete]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  }, [handleFile]);

  const clearPreview = useCallback(() => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const displayUrl = preview || currentImageUrl;

  return (
    <div className={`space-y-2 ${className}`}>
      {displayUrl && (
        <div className="relative inline-block">
          {preview ? (
            <img src={preview} alt="Náhled" className="w-24 h-24 object-cover rounded-xl border border-[#E3DACF]" />
          ) : (
            <SafeImage src={currentImageUrl} alt="Náhled" className="w-24 h-24 object-cover rounded-xl border border-[#E3DACF]" loading="eager" />
          )}
          {preview && (
            <button type="button" onClick={clearPreview} className="absolute -top-2 -right-2 p-1 bg-rose-500 text-white rounded-full shadow-sm hover:bg-rose-600 transition">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-colors ${dragActive ? 'border-[#8C7355] bg-[#FAF5EE]' : 'border-[#E3DACF] bg-[#FAF8F5] hover:border-[#C5A880]'}`}
      >
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" onChange={handleInputChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        <div className="space-y-2 pointer-events-none">
          {isUploading ? <Loader2 className="w-6 h-6 text-[#8C7355] mx-auto animate-spin" /> : preview ? <ImageIcon className="w-6 h-6 text-emerald-600 mx-auto" /> : <Upload className="w-6 h-6 text-[#8C7355] mx-auto" />}
          <div className="text-xs text-[#5C5046]">
            {isUploading ? <span>Nahrávám...</span> : preview ? <span className="text-emerald-700">Soubor připraven. Klikněte na Nahrát.</span> : <><span className="font-semibold">Přetáhněte soubor sem</span><span className="block text-[10px] text-[#7B6E63] mt-0.5">nebo klikněte pro výběr • JPEG, PNG, WebP, SVG (max 5 MB)</span></>}
          </div>
        </div>
      </div>

      {error && <div className="flex items-center gap-1.5 text-xs text-rose-600"><AlertCircle className="w-3.5 h-3.5" /><span>{error}</span></div>}
      {preview && !isUploading && <button type="button" onClick={handleUpload} className="px-4 py-2 bg-[#2D2723] hover:bg-[#8C7355] text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /><span>{buttonText}</span></button>}
    </div>
  );
};
