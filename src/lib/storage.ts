import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from './firebase';

const storage = getStorage(app);

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Nepodporovaný formát souboru. Povolené formáty: ${ALLOWED_TYPES.map(t => t.replace('image/', '.')).join(', ')}`
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Soubor je příliš velký. Maximální velikost je ${MAX_FILE_SIZE / 1024 / 1024} MB.`
    };
  }

  return { valid: true };
}

export async function uploadImage(
  file: File,
  folder: 'products' | 'gallery' | 'branding' | 'custom-orders',
  fileName?: string
): Promise<UploadResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop() || 'jpg';
    const finalFileName = fileName || `${timestamp}_${randomStr}.${extension}`;
    const storagePath = `luvia-decor/${folder}/${finalFileName}`;
    const storageRef = ref(storage, storagePath);

    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        originalName: file.name
      }
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return { success: true, url: downloadURL };
  } catch (error: any) {
    console.error('Firebase upload error:', error);

    if (error.code === 'storage/unauthorized') {
      return { success: false, error: 'Nemáte oprávnění pro nahrávání souborů.' };
    }
    if (error.code === 'storage/canceled') {
      return { success: false, error: 'Nahrávání bylo zrušeno.' };
    }
    if (error.code === 'storage/quota-exceeded') {
      return { success: false, error: 'Kvóta úložiště byla vyčerpána.' };
    }

    return { success: false, error: error.message || 'Nahrávání selhalo.' };
  }
}

export async function deleteImage(imageUrl: string): Promise<boolean> {
  try {
    if (!imageUrl.includes('firebasestorage.googleapis.com')) {
      return false;
    }

    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
    return true;
  } catch (error: any) {
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
