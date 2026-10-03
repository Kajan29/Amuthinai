import { client, request } from './client';

export interface UploadResult {
  url: string;
  key: string;
}

/** Image upload used by PhotoCapture for food photos and delivery proof (FR9). */
export const uploadsApi = {
  async uploadImage(localUri: string): Promise<UploadResult> {
    const form = new FormData();
    const name = localUri.split('/').pop() ?? 'photo.jpg';
    const extension = name.split('.').pop()?.toLowerCase() ?? 'jpg';

    // React Native accepts this URI shape for multipart bodies; the DOM File API is not used.
    form.append('file', {
      uri: localUri,
      name,
      type: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
    } as unknown as Blob);

    return request<UploadResult>(
      client.post('/uploads/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
  },
};
