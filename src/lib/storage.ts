import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from './firebase';

// Explicitly target the project's configured default bucket.
const storage = getStorage(app, 'gs://gen-lang-client-0823794308.firebasestorage.app');

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file || !(file instanceof File)) return { valid: false, error: 'Nebyl vybrán platný soubor.' };
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: `Nepodporovaný formát souboru. Povolené formáty: ${ALLOWED_TYPES.map(t => t.replace('image/', '.')).join(', ')}` };
  }
  if (file.size <= 0) return { valid: false, error: 'Vybraný soubor je prázdný.' };
  if (file.size > MAX_FILE_SIZE) return { valid: false, error: `Soubor je příliš velký. Maximální velikost je ${MAX_FILE_SIZE / 1024 / 1024} MB.` };
  return { valid: true };
}

function safeFileName(name: string): string {
  return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export async function uploadImage(
  file: File,
  folder: 'products' | 'gallery' | 'branding' | 'custom-orders',
  fileName?: string
): Promise<UploadResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) return { success: false, error: validation.error };

  try {
    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const generatedName = `${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}.${extension}`;
    const finalFileName = safeFileName(fileName || generatedName);
    const storagePath = `luvia-decor/${folder}/${finalFileName}`;
    const storageRef = ref(storage, storagePath);

    const metadata = {
      contentType: file.type,
      cacheControl: 'public,max-age=31536000,immutable',
      customMetadata: { uploadedAt: new Date().toISOString(), originalName: file.name }
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);
    if (!downloadURL) throw new Error('Firebase nevrátil URL nahraného obrázku.');

    return { success: true, url: downloadURL };
  } catch (error: any) {
    console.error('Firebase upload error:', error);
    const code = error?.code;
    if (code === 'storage/unauthorized') return { success: false, error: 'Firebase Storage odmítl nahrávání. Zkontroluj nasazená Storage Rules.' };
    if (code === 'storage/canceled') return { success: false, error: 'Nahrávání bylo zrušeno.' };
    if (code === 'storage/quota-exceeded') return { success: false, error: 'Kvóta Firebase Storage byla vyčerpána.' };
    if (code === 'storage/unknown') return { success: false, error: 'Firebase Storage vrátil neznámou chybu. Zkontroluj bucket a Storage Rules.' };
    return { success: false, error: error?.message || 'Nahrávání obrázku selhalo.' };
  }
}

export async function deleteImage(imageUrl: string): Promise<boolean> {
  try {
    if (!imageUrl || !imageUrl.includes('firebasestorage.googleapis.com')) return false;
    const match = imageUrl.match(/\/o\/([^?]+)/);
    if (!match) return false;
    const storagePath = decodeURIComponent(match[1]);
    await deleteObject(ref(storage, storagePath));
    return true;
  } catch (error) {
    console.error('Firebase delete error:', error);
    return false;
  }
}

export function getImageFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Chyba při čtení souboru.'));
    reader.readAsDataURL(file);
  });
}
