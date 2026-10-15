import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';

import { Button } from './ui/Button';

import { cloudinaryService } from '@/services/cloudinary';
import { colors, radius, spacing, typography } from '@/theme';

interface PhotoCaptureProps {
  /** Remote URLs of already uploaded photos. */
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  /** Delivery proof must come from the camera, not the library (FR9). */
  cameraOnly?: boolean;
}

export function PhotoCapture({ value, onChange, max = 3, cameraOnly = false }: PhotoCaptureProps) {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick() {
    setError(null);
    if (cameraOnly) {
      void capture('camera');
      return;
    }
    Alert.alert('Add photo', undefined, [
      { text: 'Take photo', onPress: () => void capture('camera') },
      { text: 'Choose from gallery', onPress: () => void capture('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function capture(source: 'camera' | 'gallery') {
    setError(null);
    setIsUploading(true);
    try {
      const uri = await cloudinaryService.pickOrCapture(source);
      if (!uri) return;
      const uploaded = await cloudinaryService.uploadImage(uri, 'amuthinai/photos');
      onChange([...value, uploaded.url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed, please try again');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.thumbnails}>
        {value.map((url) => (
          <Image key={url} source={{ uri: url }} style={styles.thumbnail} />
        ))}
      </View>

      {value.length < max && (
        <Button
          label={t('volunteer.capturePhoto')}
          variant="ghost"
          loading={isUploading}
          onPress={pick}
        />
      )}

      {Boolean(error) && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  thumbnails: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumbnail: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 88,
    width: 88,
  },
  error: { ...typography.caption, color: colors.danger },
});
