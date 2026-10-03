import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
 * Local-disk image storage. `UPLOAD_DRIVER=s3` is the intended production path — implement
 * it here so callers keep the same interface.
 */
@Injectable()
export class UploadsService {
  constructor(private readonly config: ConfigService) {}

  async saveImage(file: Express.Multer.File): Promise<UploadResult> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG and WebP images are accepted');
    }

    if (file.size > MAX_BYTES) {
      throw new BadRequestException('Images must be smaller than 8 MB');
    }

    const directory = this.config.getOrThrow<string>('uploads.dir');
    const key = `${randomUUID()}${extname(file.originalname) || '.jpg'}`;

    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, key), file.buffer);

    const baseUrl = this.config.getOrThrow<string>('uploads.publicBaseUrl');
    return { key, url: `${baseUrl}/uploads/${key}` };
  }
}
