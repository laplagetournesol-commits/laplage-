import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Vibration,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { useScanReservation } from '@/features/admin/hooks/useScanReservation';

export default function ScannerScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const { scan, checkIn, reset, reservation, loading, error } = useScanReservation();
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    Vibration.vibrate(100);
    scan(data);
  };

  const handleCheckIn = () => {
    Alert.alert(
      'Confirmer le check-in',
      `Check-in pour ${reservation?.clientName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            await checkIn();
            Vibration.vibrate([0, 100, 50, 100]);
          },
        },
      ],
    );
  };

  const handleReset = () => {
    reset();
    setScanned(false);
  };

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{
            title: 'Scanner',
            headerShown: true,
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="arrow-back" size={24} color={theme.text} />
              </TouchableOpacity>
            ),
          }} />
        <View style={styles.centeredContent}>
          <Ionicons name="camera-outline" size={64} color={theme.cardBorder} />
          <Text style={[styles.permissionText, { color: theme.text }]}>
            L'accès à la caméra est nécessaire pour scanner les QR codes
          </Text>
          <Button title="Autoriser la caméra" onPress={requestPermission} size="lg" />
        </View>
      </View>
    );
  }

  const typeConfig = {
    beach: { icon: 'umbrella' as const, label: 'Plage', color: colors.terracotta },
    restaurant: { icon: 'restaurant' as const, label: 'Restaurant', color: colors.deepSea },
    event: { icon: 'calendar' as const, label: 'Événement', color: colors.accentRed },
  };

  const statusLabels: Record<string, { text: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
    confirmed: { text: 'Confirmé', variant: 'success' },
    checked_in: { text: 'Déjà check-in', variant: 'warning' },
    active: { text: 'Valide', variant: 'success' },
    used: { text: 'Déjà utilisé', variant: 'warning' },
    cancelled: { text: 'Annulé', variant: 'error' },
    no_show: { text: 'No-show', variant: 'error' },
    pending: { text: 'En attente', variant: 'default' },
  };

  const formattedDate = reservation
    ? new Date(reservation.date + 'T00:00:00').toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
    : '';

  const canCheckIn = reservation && (
    (reservation.type !== 'event' && reservation.status === 'confirmed') ||
    (reservation.type === 'event' && reservation.status === 'active')
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
            title: 'Scanner QR',
            headerShown: true,
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="arrow-back" size={24} color={theme.text} />
              </TouchableOpacity>
            ),
          }} />

      {!reservation ? (
        <>
          {/* Camera */}
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            />
            {/* Overlay */}
            <View style={styles.overlay}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <Text style={styles.scanText}>
                Scannez le QR code du client
              </Text>
            </View>
          </View>

          {error && (
            <View style={[styles.errorBar, { backgroundColor: colors.brandLight }]}>
              <Ionicons name="alert-circle" size={18} color={colors.brand} />
              <Text style={[styles.errorText, { color: colors.brand }]}>{error}</Text>
              <TouchableOpacity onPress={handleReset}>
                <Text style={[styles.retryText, { color: colors.brand }]}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          )}

          {loading && (
            <View style={[styles.loadingBar, { backgroundColor: colors.sunYellowLight }]}>
              <Text style={[styles.loadingText, { color: colors.warmWood }]}>Recherche...</Text>
            </View>
          )}
        </>
      ) : (
        /* Reservation result */
        <ScrollView
          contentContainerStyle={[styles.resultContainer, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Type + Status header */}
          <View style={[styles.resultHeader, { backgroundColor: typeConfig[reservation.type].color + '15' }]}>
            <View style={styles.resultHeaderLeft}>
              <Ionicons
                name={typeConfig[reservation.type].icon}
                size={24}
                color={typeConfig[reservation.type].color}
              />
              <Text style={[styles.resultType, { color: typeConfig[reservation.type].color }]}>
                {typeConfig[reservation.type].label}
              </Text>
            </View>
            <Badge
              label={statusLabels[reservation.status]?.text ?? reservation.status}
              variant={statusLabels[reservation.status]?.variant ?? 'default'}
            />
          </View>

          {/* Client info */}
          <Card style={{ marginBottom: 12 }}>
            <View style={styles.clientRow}>
              <View style={[styles.clientAvatar, { backgroundColor: colors.sunYellow }]}>
                <Text style={styles.clientAvatarText}>
                  {reservation.clientName[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.clientName, { color: theme.text }]}>
                  {reservation.clientName}
                </Text>
                <Text style={[styles.clientEmail, { color: theme.textSecondary }]}>
                  {reservation.clientEmail}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Badge label={reservation.clientVipLevel.toUpperCase()} variant="vip" size="sm" />
                <Text style={[styles.tokenCount, { color: colors.sunYellow }]}>
                  {reservation.clientTokens} tokens
                </Text>
              </View>
            </View>
          </Card>

          {/* Reservation details */}
          <Card style={{ marginBottom: 12 }}>
            <Text style={[styles.detailsTitle, { color: theme.text }]}>Détails</Text>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={theme.accent} />
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                {reservation.type === 'event' ? 'Événement' : reservation.type === 'beach' ? 'Transat' : 'Table'}
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {reservation.locationLabel} {reservation.zoneName ? `(${reservation.zoneName})` : ''}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={theme.accent} />
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Date</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{formattedDate}</Text>
            </View>

            {reservation.timeSlot && (
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={16} color={theme.accent} />
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Service</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {reservation.timeSlot === 'lunch' ? 'Déjeuner' : 'Dîner'}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={16} color={theme.accent} />
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                {reservation.type === 'event' ? 'Ticket' : 'Personnes'}
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {reservation.type === 'event'
                  ? reservation.ticketType?.toUpperCase() ?? 'STANDARD'
                  : `${reservation.guestCount} pers.`
                }
              </Text>
            </View>

            {reservation.totalPrice != null && reservation.totalPrice > 0 && (
              <View style={styles.detailRow}>
                <Ionicons name="card-outline" size={16} color={theme.accent} />
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Total</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {reservation.totalPrice}€
                </Text>
              </View>
            )}

            {reservation.depositAmount != null && reservation.depositAmount > 0 && (
              <View style={styles.detailRow}>
                <Ionicons name="wallet-outline" size={16} color={theme.accent} />
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Acompte</Text>
                <Text style={[styles.detailValue, { color: reservation.depositPaid ? colors.sage : colors.accentRed }]}>
                  {reservation.depositAmount}€ {reservation.depositPaid ? '(payé)' : '(non payé)'}
                </Text>
              </View>
            )}

            {reservation.specialRequests && (
              <View style={[styles.specialRequests, { backgroundColor: theme.backgroundSecondary }]}>
                <Ionicons name="chatbubble-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.specialRequestsText, { color: theme.textSecondary }]}>
                  {reservation.specialRequests}
                </Text>
              </View>
            )}
          </Card>

          {/* Addons (beach only) */}
          {reservation.addons && reservation.addons.length > 0 && (
            <Card style={{ marginBottom: 12 }}>
              <Text style={[styles.detailsTitle, { color: theme.text }]}>Options commandées</Text>
              {reservation.addons.map((addon, i) => (
                <View key={i} style={styles.addonRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.sage} />
                  <Text style={[styles.addonText, { color: theme.text }]}>
                    {addon.name} {addon.quantity > 1 ? `x${addon.quantity}` : ''}
                  </Text>
                </View>
              ))}
            </Card>
          )}

          {/* Actions */}
          {canCheckIn ? (
            <Button
              title="Confirmer le check-in"
              onPress={handleCheckIn}
              size="lg"
              icon={<Ionicons name="checkmark-circle" size={20} color={colors.black} />}
              style={{ marginBottom: 10 }}
            />
          ) : (
            <View style={[styles.alreadyCheckedIn, { backgroundColor: colors.sunYellowLight }]}>
              <Ionicons name="checkmark-done" size={20} color={colors.warmWood} />
              <Text style={[styles.alreadyCheckedInText, { color: colors.warmWood }]}>
                {reservation.status === 'checked_in' || reservation.status === 'used'
                  ? 'Ce client a déjà fait son check-in'
                  : `Statut : ${statusLabels[reservation.status]?.text ?? reservation.status}`
                }
              </Text>
            </View>
          )}

          <Button
            title="Scanner un autre QR"
            onPress={handleReset}
            variant="outline"
            size="lg"
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  permissionText: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  cameraContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.sunYellow,
    borderWidth: 3,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 24,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    margin: 16,
    borderRadius: 12,
  },
  errorText: { flex: 1, fontSize: 14, fontWeight: '500' },
  retryText: { fontSize: 14, fontWeight: '700' },
  loadingBar: {
    padding: 14,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  loadingText: { fontSize: 14, fontWeight: '600' },
  resultContainer: { padding: 20 },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  resultHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultType: { fontSize: 18, fontWeight: '700' },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clientAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  clientAvatarText: { fontSize: 18, fontWeight: '700', color: colors.black },
  clientName: { fontSize: 16, fontWeight: '700' },
  clientEmail: { fontSize: 12, marginTop: 2 },
  tokenCount: { fontSize: 12, fontWeight: '600' },
  detailsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  detailLabel: { fontSize: 13, width: 70 },
  detailValue: { fontSize: 14, fontWeight: '600', flex: 1 },
  specialRequests: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  specialRequestsText: { fontSize: 13, flex: 1, fontStyle: 'italic' },
  addonRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  addonText: { fontSize: 14, fontWeight: '500' },
  alreadyCheckedIn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  alreadyCheckedInText: { fontSize: 14, fontWeight: '600', flex: 1 },
});
