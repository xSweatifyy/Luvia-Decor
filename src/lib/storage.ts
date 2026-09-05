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

/**
 * Luvia Decor intentionally does not upload images to Firebase Storage.
 * Images are stored as external HTTPS URLs in the product/document data.
 */
export async function uploadImage(): Promise<UploadResult> {
  return {
    success: false,
    error: 'Nahrávání souborů není aktivní. Použijte veřejnou HTTPS URL obrázku.'
  };
}

export async function deleteImage(): Promise<boolean> {
  return false;
}

export function getImageFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Chyba při čtení souboru.'));
    reader.readAsDataURL(file);
  });
}
