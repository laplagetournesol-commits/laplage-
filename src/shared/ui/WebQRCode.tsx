import React, { useEffect, useState } from 'react';
import { Image, View, ActivityIndicator } from 'react-native';
import QRCodeLib from 'qrcode';

interface WebQRCodeProps {
  value: string;
  size: number;
  backgroundColor?: string;
  color?: string;
}

export function WebQRCode({ value, size, backgroundColor = '#fff', color = '#000' }: WebQRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCodeLib.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: color, light: backgroundColor },
    }).then(setDataUrl).catch(() => {});
  }, [value, size, color, backgroundColor]);

  if (!dataUrl) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Image source={{ uri: dataUrl }} style={{ width: size, height: size }} />;
}
