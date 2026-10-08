import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

export interface UploadResult {
  url: string;
  key: string;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Cloudinary image storage with local-disk fallback.
 */
@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly hasCloudinary: boolean;

  constructor(private readonly config: ConfigService) {
    const cloudName =
      this.config.get<string>('CLOUDINARY_CLOUD_NAME') || process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey =
      this.config.get<string>('CLOUDINARY_API_KEY') || process.env.CLOUDINARY_API_KEY;
    const apiSecret =
      this.config.get<string>('CLOUDINARY_API_SECRET') || process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.hasCloudinary = true;
      this.logger.log(`Cloudinary configured for uploads (cloud_name: ${cloudName})`);
    } else {
      this.hasCloudinary = false;
      this.logger.warn('Cloudinary credentials not complete; falling back to local storage.');
    }
  }

  async saveImage(file: Express.Multer.File): Promise<UploadResult> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG and WebP images are accepted');
    }

    if (file.size > MAX_BYTES) {
      throw new BadRequestException('Images must be smaller than 8 MB');
    }

    if (this.hasCloudinary) {
      const folder =
        this.config.get<string>('CLOUDINARY_FOLDER') ||
        process.env.CLOUDINARY_FOLDER ||
        'amuthinai';

      return new Promise<UploadResult>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder, resource_type: 'image' },
          (error, result?: UploadApiResponse) => {
            if (error || !result) {
              this.logger.error('Cloudinary upload error:', error);
              return reject(
                new BadRequestException(error?.message || 'Cloudinary upload failed'),
              );
            }
            resolve({
              key: result.public_id,
              url: result.secure_url,
            });
          },
        );
        stream.end(file.buffer);
      });
    }

    const directory = this.config.getOrThrow<string>('uploads.dir');
    const key = `${randomUUID()}${extname(file.originalname) || '.jpg'}`;

    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, key), file.buffer);

    const baseUrl = this.config.getOrThrow<string>('uploads.publicBaseUrl');
    return { key, url: `${baseUrl}/uploads/${key}` };
  }
}
