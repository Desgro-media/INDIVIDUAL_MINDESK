// Shared client-side image handling for the small profile/QR images we store
// inline as base64 data URLs on the row itself (see PatientAttachmentService's
// note on the same convention). Downscaling before upload is what keeps those
// columns small enough to live in the database.

// Downscales to fit within maxW × maxH (preserving aspect ratio) and re-encodes
// as a JPEG data URL.
export function compressImageToBase64(file: File, maxW = 400, maxH = 400, quality = 0.85): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxW || height > maxH) {
                    const ratio = Math.min(maxW / width, maxH / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Validates then compresses a picked file. Resolves to the data URL, or throws
// an Error whose message is safe to show the user directly.
export async function readImageAsCompressedBase64(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('Please select an image file.');
    if (file.size > MAX_IMAGE_BYTES) throw new Error('File must be under 10MB.');
    try {
        return await compressImageToBase64(file);
    } catch {
        throw new Error('Failed to process image. Please try again.');
    }
}
