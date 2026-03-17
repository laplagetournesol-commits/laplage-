import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
let QRCode: any = null;
if (Platform.OS !== 'web') {
  QRCode = require('react-native-qrcode-svg').default;
}
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Badge } from '@/shared/ui/Badge';
import { i18n } from '@/shared/i18n';

interface ReservationDetail {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface ReservationQRCodeProps {
  visible: boolean;
  onClose: () => void;
  qrCode: string;
  type: 'beach' | 'restaurant' | 'event';
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  details: ReservationDetail[];
  price?: string;
  deposit?: string;
}

export function ReservationQRCode({
  visible,
  onClose,
  qrCode,
  type,
  title,
  subtitle,
  badgeLabel,
  details,
  price,
  deposit,
}: ReservationQRCodeProps) {
  const { theme } = useSunMode();

  const typeConfig = {
    beach: { icon: 'umbrella' as const, color: colors.terracotta, label: i18n.t('tabBeach') },
    restaurant: { icon: 'restaurant' as const, color: colors.deepSea, label: i18n.t('tabRestaurant') },
    event: { icon: 'calendar' as const, color: colors.accentRed, label: i18n.t('event') },
  };

  const config = typeConfig[type];

  return (
    <BottomSheet visible={visible} onClose={onClose} title={i18n.t('myReservationTitle')}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
        <View style={styles.content}>
          {/* Ticket card */}
          <View style={[styles.card, { backgroundColor: theme.backgroundSecondary }]}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                {subtitle && (
                  <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
                )}
              </View>
              <View style={styles.badges}>
                <Badge label={badgeLabel ?? config.label} variant={type === 'beach' ? 'warning' : type === 'restaurant' ? 'default' : 'vip'} size="sm" />
              </View>
            </View>

            {/* QR Code */}
            <View style={[styles.qrContainer, { backgroundColor: colors.white }]}>
              {Platform.OS !== 'web' && QRCode ? (
                <QRCode
                  value={qrCode}
                  size={180}
                  backgroundColor={colors.white}
                  color={colors.black}
                />
              ) : (
                <View style={styles.webQrFallback}>
                  <Ionicons name="qr-code" size={64} color={colors.brand} />
                  <Text style={styles.webQrCode}>{qrCode}</Text>
                </View>
              )}
            </View>

            <Text style={[styles.qrHint, { color: theme.textSecondary }]}>
              {i18n.t('presentQRReservation')}
            </Text>

            {/* Dashed separator */}
            <View style={[styles.separator, { borderColor: theme.cardBorder }]} />

            {/* Details */}
            <View style={styles.detailsGrid}>
              {details.map((detail, i) => (
                <View key={i} style={styles.detailItem}>
                  <Ionicons name={detail.icon} size={16} color={config.color} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{detail.label}</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>{detail.value}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Price footer */}
            {(price || deposit) && (
              <View style={[styles.priceFooter, { borderTopColor: theme.cardBorder }]}>
                {price && (
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>Total</Text>
                    <Text style={[styles.priceValue, { color: theme.text }]}>{price}</Text>
                  </View>
                )}
                {deposit && (
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>Acompte payé</Text>
                    <Text style={[styles.depositValue, { color: colors.brand }]}>{deposit}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 8 },
  card: { borderRadius: 16, overflow: 'hidden' },
  cardHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 6 },
  qrContainer: {
    alignSelf: 'center',
    padding: 16,
    borderRadius: 14,
    marginHorizontal: 16,
  },
  webQrFallback: { alignItems: 'center', gap: 10, padding: 16 },
  webQrCode: { fontSize: 11, color: '#666', textAlign: 'center', fontFamily: 'monospace' },
  qrHint: { fontSize: 12, textAlign: 'center', marginTop: 12 },
  separator: {
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
    marginVertical: 14,
    marginHorizontal: 16,
  },
  detailsGrid: { paddingHorizontal: 16, gap: 12 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { fontSize: 11 },
  detailValue: { fontSize: 13, fontWeight: '600' },
  priceFooter: { borderTopWidth: 1, marginTop: 14, paddingTop: 12, paddingHorizontal: 16, paddingBottom: 16, gap: 6 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel: { fontSize: 13 },
  priceValue: { fontSize: 16, fontWeight: '700' },
  depositValue: { fontSize: 18, fontWeight: '800' },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  tokenEmoji: { fontSize: 18 },
  tokenText: { fontSize: 13, fontWeight: '600', flex: 1 },
});
