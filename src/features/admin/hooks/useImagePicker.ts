import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { createClient } from '@supabase/supabase-js';

// Client admin pour le storage (bypass RLS) — admin screens uniquement
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ?? '';
const storageClient = createClient(supabaseUrl, serviceRoleKey);

let ImagePicker: typeof import('expo-image-picker') | null = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {
  // expo-image-picker not available (native rebuild needed)
}

export function useImagePicker(bucket: string = 'flyers') {
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = useCallback(async (): Promise<string | null> => {
    if (!ImagePicker) {
      Alert.alert('Non disponible', 'Le sélecteur d\'images nécessite un rebuild de l\'app native (expo run:ios).');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return null;

    setUploading(true);

    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error } = await storageClient.storage
        .from(bucket)
        .upload(fileName, arrayBuffer, {
          contentType: asset.mimeType ?? 'image/jpeg',
          upsert: false,
        });

      if (error) {
        Alert.alert('Erreur upload', error.message);
        return null;
      }

      const { data: urlData } = storageClient.storage.from(bucket).getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (err: any) {
      Alert.alert('Erreur', err.message ?? 'Impossible d\'uploader l\'image');
      return null;
    } finally {
      setUploading(false);
    }
  }, [bucket]);

  return { pickAndUpload, uploading };
}
