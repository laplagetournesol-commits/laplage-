import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchaseTicket } from '../hooks/useTickets';
import { usePayment } from '@/shared/hooks/usePayment';
import type { Event, TicketType } from '@/shared/types';
import { i18n } from '@/shared/i18n';

interface TicketSheetProps {
  visible: boolean;
  onClose: () => void;
  event: Event;
  onPurchased: () => void;
}

export function TicketSheet({ visible, onClose, event, onPurchased }: TicketSheetProps) {
  const { theme } = useSunMode();
  const { user } = useAuth();
  const { purchase, submitting } = usePurchaseTicket();
  const { pay } = usePayment();
  const [selectedType, setSelectedType] = useState<TicketType>('standard');

  const hasVip = event.vip_price != null && event.vip_price > 0;
  const price = selectedType === 'vip' && hasVip ? event.vip_price! : event.standard_price;
  const isFree = event.standard_price === 0;
  const isSoldOut = event.tickets_sold >= event.capacity;
  const formattedDate = new Date(event.date + 'T00:00:00').toLocaleDateString(i18n.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handlePurchase = async () => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }

    const result = await purchase(event, selectedType);
    if (!result.success || !result.ticket) return;

    // Paiement si l'événement est payant
    if (price > 0) {
      const payResult = await pay({
        type: 'event',
        reservationId: result.ticket.id,
        amount: price,
      });
      if (!payResult.success) return;
    }

    Alert.alert(
      isFree ? i18n.t('registrationConfirmed') : i18n.t('ticketPurchased'),
      i18n.t('ticketConfirmedAlert').replace('{{type}}', selectedType.toUpperCase()).replace('{{title}}', event.title),
      [{ text: i18n.t('viewMyTicket'), onPress: () => { onClose(); onPurchased(); } }],
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={i18n.t('chooseTicket')}>
      <View style={styles.content}>
        {/* Event summary */}
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.infoText, { color: theme.text }]}>{formattedDate}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.infoText, { color: theme.text }]}>
              {event.start_time?.slice(0, 5)}{event.end_time ? ` — ${event.end_time.slice(0, 5)}` : ''}
            </Text>
          </View>
        </View>

        {isSoldOut ? (
          <View style={[styles.soldOutCard, { backgroundColor: colors.brandLight }]}>
            <Ionicons name="close-circle" size={20} color={colors.brand} />
            <Text style={[styles.soldOutText, { color: colors.brand }]}>
              {i18n.t('eventSoldOut')}
            </Text>
          </View>
        ) : (
          <>
            {/* Ticket type selection */}
            <Text style={[styles.sectionLabel, { color: theme.text }]}>{i18n.t('ticketType')}</Text>

            {/* Standard */}
            <TouchableOpacity
              onPress={() => setSelectedType('standard')}
              style={[
                styles.ticketOption,
                {
                  backgroundColor: selectedType === 'standard' ? colors.sunYellowLight : theme.backgroundSecondary,
                  borderColor: selectedType === 'standard' ? colors.sunYellow : theme.cardBorder,
                },
              ]}
            >
              <View style={styles.ticketOptionLeft}>
                <View style={[styles.radio, { borderColor: selectedType === 'standard' ? colors.sunYellow : theme.cardBorder }]}>
                  {selectedType === 'standard' && <View style={[styles.radioInner, { backgroundColor: colors.sunYellow }]} />}
                </View>
                <View>
                  <Text style={[styles.ticketTypeLabel, { color: theme.text }]}>Standard</Text>
                  <Text style={[styles.ticketTypeDesc, { color: theme.textSecondary }]}>
                    {i18n.t('eventAccess')}
                  </Text>
                </View>
              </View>
              <Text style={[styles.ticketPrice, { color: theme.text }]}>
                {isFree ? i18n.t('free') : `${event.standard_price}€`}
              </Text>
            </TouchableOpacity>

            {/* VIP */}
            {hasVip && (
              <TouchableOpacity
                onPress={() => setSelectedType('vip')}
                style={[
                  styles.ticketOption,
                  {
                    backgroundColor: selectedType === 'vip' ? colors.brandLight : theme.backgroundSecondary,
                    borderColor: selectedType === 'vip' ? colors.brand : theme.cardBorder,
                  },
                ]}
              >
                <View style={styles.ticketOptionLeft}>
                  <View style={[styles.radio, { borderColor: selectedType === 'vip' ? colors.brand : theme.cardBorder }]}>
                    {selectedType === 'vip' && <View style={[styles.radioInner, { backgroundColor: colors.brand }]} />}
                  </View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.ticketTypeLabel, { color: theme.text }]}>VIP</Text>
                      <Badge label="Premium" variant="vip" size="sm" />
                    </View>
                    <Text style={[styles.ticketTypeDesc, { color: theme.textSecondary }]}>
                      {i18n.t('vipAccess')}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.ticketPrice, { color: theme.text }]}>
                  {event.vip_price}€
                </Text>
              </TouchableOpacity>
            )}

            {/* CTA */}
            <Button
              title={user
                ? (isFree ? i18n.t('registerFree') : `${i18n.t('buyTicket')} — ${price}€`)
                : i18n.t('connectToBook')
              }
              onPress={handlePurchase}
              loading={submitting}
              size="lg"
              style={{ marginTop: 8 }}
            />

            <Text style={[styles.remaining, { color: theme.textSecondary }]}>
              {event.capacity - event.tickets_sold} {event.capacity - event.tickets_sold > 1 ? i18n.t('spotsLeftPlural') : i18n.t('spotsLeft')}
            </Text>
          </>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 8 },
  summaryCard: { padding: 14, borderRadius: 12, marginBottom: 20, gap: 8 },
  eventTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, fontWeight: '500' },
  soldOutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  soldOutText: { fontSize: 14, fontWeight: '600', flex: 1 },
  sectionLabel: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  ticketOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  ticketOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  ticketTypeLabel: { fontSize: 15, fontWeight: '600' },
  ticketTypeDesc: { fontSize: 12, marginTop: 2 },
  ticketPrice: { fontSize: 18, fontWeight: '800' },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginTop: 6,
  },
  tokenEmoji: { fontSize: 18 },
  tokenText: { fontSize: 13, fontWeight: '600', flex: 1 },
  remaining: { fontSize: 12, textAlign: 'center', marginTop: 10 },
});
