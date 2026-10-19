import { JournalImage } from '../types/journal';

/**
 * Compresses an image File or Blob to an efficient WebP/JPEG data URL
 * to ensure fast sync, lightweight storage, and Firestore compatibility.
 */
export async function processAndCompressImage(
  file: File | Blob,
  caption = '',
  convertToGrayscale = false
): Promise<JournalImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDimension = 1280;
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('No se pudo inicializar el contexto de imagen.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        if (convertToGrayscale) {
          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            // High perceptual luminance formula: 0.299 R + 0.587 G + 0.114 B
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
          }
          ctx.putImageData(imgData, 0, 0);
        }

        // Try webp first, fallback to jpeg
        let dataUrl = canvas.toDataURL('image/webp', 0.8);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        }

        const imageRecord: JournalImage = {
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          dataUrl,
          caption,
          createdAt: new Date().toISOString(),
          width,
          height,
        };

        resolve(imageRecord);
      };

      img.onerror = () => {
        reject(new Error('Error al cargar la imagen seleccionada.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo de imagen.'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Extracts image files from a Clipboard event (e.g. pasted screenshots).
 */
export function extractImagesFromClipboard(e: ClipboardEvent): File[] {
  const files: File[] = [];
  if (!e.clipboardData || !e.clipboardData.items) return files;

  for (let i = 0; i < e.clipboardData.items.length; i++) {
    const item = e.clipboardData.items[i];
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }

  return files;
}

export function extractImagesFromDrop(
  e: DragEvent | { dataTransfer?: DataTransfer | null }
): File[] {
  const files: File[] = [];
  if (!e.dataTransfer || !e.dataTransfer.files) return files;

  for (let i = 0; i < e.dataTransfer.files.length; i++) {
    const file = e.dataTransfer.files[i];
    if (file.type.startsWith('image/')) {
      files.push(file);
    }
  }

  return files;
}
