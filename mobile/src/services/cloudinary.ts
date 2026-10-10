import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { uploadsApi } from '@/api/uploads.api';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '@/constants';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface CloudinaryUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface PickedImage {
  uri: string;
  base64?: string;
  mimeType?: string;
}

let lastPicked: PickedImage | null = null;

const IMAGE_MEDIA_TYPES = ['images'] as ImagePicker.MediaType[];

function guessMime(uri: string, fallback = 'image/jpeg'): string {
  const filename = uri.split('/').pop()?.split('?')[0] ?? '';
  const match = /\.(\w+)$/.exec(filename);
  if (!match) return fallback;
  const ext = match[1]!.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return `image/${ext}`;
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image'));
    reader.readAsDataURL(blob);
  });
}

async function toDataUri(imageUri: string, picked?: PickedImage | null): Promise<string | null> {
  if (imageUri.startsWith('data:')) return imageUri;
  if (picked?.base64) {
    return `data:${picked.mimeType || 'image/jpeg'};base64,${picked.base64}`;
  }
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    if (blob && blob.size > 0) return blobToDataUri(blob);
  } catch {
    // Native file:// URIs sometimes cannot be fetched; FormData fallback handles that.
  }
  return null;
}

function parseCloudinaryError(status: number, body: string): string {
  try {
    const json = JSON.parse(body) as { error?: { message?: string } };
    if (json.error?.message) return json.error.message;
  } catch {
    // Keep the raw body when Cloudinary does not return JSON.
  }
  return body.slice(0, 180) || `Cloudinary upload failed (${status})`;
}

function xhrPostForm(url: string, formData: FormData): Promise<{ ok: boolean; status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.onload = () => {
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, body: xhr.responseText });
    };
    xhr.onerror = () => reject(new Error('Network error while uploading photo'));
    xhr.send(formData);
  });
}

async function postToCloudinary(
  cloudName: string,
  uploadPreset: string,
  fileValue: string | { uri: string; name: string; type: string },
  folder?: string,
): Promise<CloudinaryUploadResult> {
  const formData = new FormData();
  if (typeof fileValue === 'string') {
    formData.append('file', fileValue);
  } else if (Platform.OS === 'web') {
    const blob = await (await fetch(fileValue.uri)).blob();
    formData.append('file', blob, fileValue.name);
  } else {
    formData.append('file', fileValue as unknown as Blob);
  }
  formData.append('upload_preset', uploadPreset);
  if (folder) formData.append('folder', folder);

  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const response = await xhrPostForm(cloudinaryUrl, formData);
  if (!response.ok) {
    throw new Error(parseCloudinaryError(response.status, response.body));
  }
  const data = JSON.parse(response.body) as {
    secure_url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
  };
  return {
    url: data.secure_url,
    publicId: data.public_id,
    width: data.width,
    height: data.height,
    format: data.format,
    bytes: data.bytes,
  };
}

export const cloudinaryService = {
  /**
   * Helper to request permissions and pick or capture an image
   * @param source - 'camera' for live photo or 'gallery' for media library
   */
  async pickOrCapture(source: 'camera' | 'gallery'): Promise<string | null> {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      throw new Error(`Permission to access ${source} was denied`);
    }

    const options: ImagePicker.ImagePickerOptions = {
      quality: 0.7,
      allowsEditing: false,
      exif: false,
      base64: true,
      mediaTypes: IMAGE_MEDIA_TYPES,
    };

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled || !result.assets[0]?.uri) {
      lastPicked = null;
      return null;
    }

    const asset = result.assets[0];
    lastPicked = {
      uri: asset.uri,
      base64: asset.base64 ?? undefined,
      mimeType: asset.mimeType ?? guessMime(asset.uri),
    };
    return asset.uri;
  },

  /**
   * Upload image directly to Cloudinary from mobile app with backend fallback
   * @param imageUri - Local image URI from camera or gallery
   * @param folder - Optional folder name in Cloudinary
   * @param onProgress - Optional progress callback
   */
  async uploadImage(
    imageUri: string,
    folder: string = 'amuthinai',
    _onProgress?: (progress: CloudinaryUploadProgress) => void,
  ): Promise<CloudinaryUploadResult> {
    const cloudName = CLOUDINARY_CLOUD_NAME;
    const uploadPreset = CLOUDINARY_UPLOAD_PRESET;
    const picked = lastPicked?.uri === imageUri ? lastPicked : null;
    lastPicked = null;

    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and UPLOAD_PRESET.');
    }

    const filename = imageUri.split('/').pop()?.split('?')[0] || 'photo.jpg';
    const type = picked?.mimeType || guessMime(imageUri);
    const dataUri = await toDataUri(imageUri, picked);
    let lastError: unknown;

    // Unsigned presets often reject extra fields such as folder/tags.
    const attempts: Array<{ file: string | { uri: string; name: string; type: string }; folder?: string }> = [];
    if (dataUri) {
      attempts.push({ file: dataUri, folder });
      attempts.push({ file: dataUri });
    }
    attempts.push({
      file: { uri: imageUri, name: filename.includes('.') ? filename : 'photo.jpg', type },
    });

    for (const attempt of attempts) {
      try {
        return await postToCloudinary(cloudName, uploadPreset, attempt.file, attempt.folder);
      } catch (err) {
        lastError = err;
      }
    }

    try {
      const backendResult = await uploadsApi.uploadImage(imageUri);
      return {
        url: backendResult.url,
        publicId: backendResult.key,
        width: 800,
        height: 600,
        format: 'jpg',
        bytes: 0,
      };
    } catch (fallbackError) {
      const directMessage = lastError instanceof Error ? lastError.message : 'Direct Cloudinary upload failed';
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : 'Backend upload failed';
      throw new Error(`${directMessage}. ${fallbackMessage}`);
    }
  },

  /**
   * Generate optimized image URL with transformations
   * @param publicId - Cloudinary public ID
   * @param width - Desired width
   * @param height - Desired height
   * @param crop - Crop mode (fill, fit, limit, etc.)
   */
  getOptimizedUrl(
    publicId: string,
    width: number = 400,
    height: number = 400,
    crop: 'fill' | 'fit' | 'limit' | 'thumb' = 'fill',
  ): string {
    if (!publicId || !CLOUDINARY_CLOUD_NAME) return '';

    const cleanPublicId = publicId.replace(/^https?:\/\/.*?\/image\/upload\//, '');

    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_${width},h_${height},c_${crop},q_auto,f_auto/${cleanPublicId}`;
  },

  getThumbnailUrl(publicId: string): string {
    return this.getOptimizedUrl(publicId, 200, 200, 'thumb');
  },

  getCardImageUrl(publicId: string): string {
    return this.getOptimizedUrl(publicId, 400, 300, 'fill');
  },

  getFullImageUrl(publicId: string): string {
    return this.getOptimizedUrl(publicId, 1200, 1200, 'limit');
  },

  getTransformedUrl(publicId: string, transformations: string): string {
    if (!publicId || !CLOUDINARY_CLOUD_NAME) return '';

    const cleanPublicId = publicId.replace(/^https?:\/\/.*?\/image\/upload\//, '');

    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformations}/${cleanPublicId}`;
  },

  getGrayscaleUrl(publicId: string, width: number = 400): string {
    return this.getTransformedUrl(publicId, `w_${width},e_grayscale,q_auto,f_auto`);
  },

  getBlurredUrl(publicId: string, blurAmount: number = 300): string {
    return this.getTransformedUrl(publicId, `e_blur:${blurAmount},q_auto,f_auto`);
  },

  getEnhancedUrl(publicId: string, width: number = 400): string {
    return this.getTransformedUrl(publicId, `w_${width},e_improve,q_auto,f_auto`);
  },

  isCloudinaryUrl(url: string): boolean {
    return url.includes('cloudinary.com') || url.includes('res.cloudinary');
  },

  extractPublicId(url: string): string | null {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return match && match[1] ? match[1] : null;
  },

  validateImage(imageUri: string, _maxSizeMB: number = 8): boolean {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
    if (imageUri.startsWith('data:image/') || imageUri.startsWith('file:') || imageUri.startsWith('content:')) {
      return true;
    }
    return validExtensions.some((ext) => imageUri.toLowerCase().includes(ext));
  },
};

export async function compressImage(uri: string, _quality: number = 0.8): Promise<string> {
  return uri;
}
