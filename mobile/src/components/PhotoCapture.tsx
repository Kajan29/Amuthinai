import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Button } from './ui/Button';

import { uploadsApi } from '@/api/uploads.api';
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

  async function pick() {
    setError(null);

    const permission = cameraOnly
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError('Permission denied');
      return;
    }

    const result = cameraOnly
      ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });

    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;

    setIsUploading(true);
    try {
      const uploaded = await uploadsApi.uploadImage(asset.uri);
      onChange([...value, uploaded.url]);
    } catch {
      setError('Upload failed, please try again');
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
