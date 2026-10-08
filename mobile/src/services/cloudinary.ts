import * as ImagePicker from 'expo-image-picker';

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

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            quality: 0.8,
            allowsEditing: true,
            aspect: [4, 3],
          })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.8,
            allowsEditing: true,
            aspect: [4, 3],
          });

    if (result.canceled || !result.assets[0]?.uri) {
      return null;
    }

    return result.assets[0].uri;
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
    _onProgress?: (progress: CloudinaryUploadProgress) => void
  ): Promise<CloudinaryUploadResult> {
    const cloudName = CLOUDINARY_CLOUD_NAME || 'rrotphpj';
    const uploadPreset = CLOUDINARY_UPLOAD_PRESET || 'amuthinai_unsigned';

    try {
      // 1. Try direct client-side upload to Cloudinary
      const formData = new FormData();

      const filename = imageUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      formData.append('upload_preset', uploadPreset);
      formData.append('folder', folder);
      formData.append('tags', 'amuthinai,mobile,volunteer');

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

      const response = await fetch(cloudinaryUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          url: data.secure_url,
          publicId: data.public_id,
          width: data.width,
          height: data.height,
          format: data.format,
          bytes: data.bytes,
        };
      }

      console.warn('Direct Cloudinary upload returned non-OK, trying backend upload fallback...');
    } catch (err) {
      console.warn('Direct Cloudinary upload threw an error, trying backend upload fallback:', err);
    }

    // 2. Fallback to backend uploads service (which also uploads to Cloudinary via server API keys)
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
      console.error('All Cloudinary upload paths failed:', fallbackError);
      throw fallbackError;
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
    crop: 'fill' | 'fit' | 'limit' | 'thumb' = 'fill'
  ): string {
    if (!publicId || !CLOUDINARY_CLOUD_NAME) return '';
    
    // Remove cloudinary base URL if present
    const cleanPublicId = publicId.replace(/^https?:\/\/.*?\/image\/upload\//, '');
    
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_${width},h_${height},c_${crop},q_auto,f_auto/${cleanPublicId}`;
  },

  /**
   * Generate thumbnail URL (200x200)
   */
  getThumbnailUrl(publicId: string): string {
    return this.getOptimizedUrl(publicId, 200, 200, 'thumb');
  },

  /**
   * Generate card image URL (400x300)
   */
  getCardImageUrl(publicId: string): string {
    return this.getOptimizedUrl(publicId, 400, 300, 'fill');
  },

  /**
   * Generate full image URL (max 1200px)
   */
  getFullImageUrl(publicId: string): string {
    return this.getOptimizedUrl(publicId, 1200, 1200, 'limit');
  },

  /**
   * Get image URL with custom transformations
   */
  getTransformedUrl(publicId: string, transformations: string): string {
    if (!publicId || !CLOUDINARY_CLOUD_NAME) return '';
    
    const cleanPublicId = publicId.replace(/^https?:\/\/.*?\/image\/upload\//, '');
    
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformations}/${cleanPublicId}`;
  },

  /**
   * Apply grayscale filter
   */
  getGrayscaleUrl(publicId: string, width: number = 400): string {
    return this.getTransformedUrl(publicId, `w_${width},e_grayscale,q_auto,f_auto`);
  },

  /**
   * Apply blur effect
   */
  getBlurredUrl(publicId: string, blurAmount: number = 300): string {
    return this.getTransformedUrl(publicId, `e_blur:${blurAmount},q_auto,f_auto`);
  },

  /**
   * Auto-enhance image
   */
  getEnhancedUrl(publicId: string, width: number = 400): string {
    return this.getTransformedUrl(publicId, `w_${width},e_improve,q_auto,f_auto`);
  },

  /**
   * Check if URL is a Cloudinary URL
   */
  isCloudinaryUrl(url: string): boolean {
    return url.includes('cloudinary.com') || url.includes('res.cloudinary');
  },

  /**
   * Extract public ID from Cloudinary URL
   */
  extractPublicId(url: string): string | null {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return match && match[1] ? match[1] : null;
  },

  /**
   * Validate image before upload
   */
  validateImage(imageUri: string, _maxSizeMB: number = 8): boolean {
    // Basic validation - actual size check would need FileSystem API
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const hasValidExtension = validExtensions.some((ext) =>
      imageUri.toLowerCase().endsWith(ext),
    );

    return hasValidExtension;
  },
};

/**
 * Helper function to compress image before upload (if needed)
 */
export async function compressImage(uri: string, _quality: number = 0.8): Promise<string> {
  // You can use expo-image-manipulator for compression if needed
  // For now, return the original URI
  return uri;
}
