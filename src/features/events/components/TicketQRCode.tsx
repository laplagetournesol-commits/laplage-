import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Badge } from '@/shared/ui/Badge';
import type { Event, EventTicket } from '@/shared/types';
import { i18n } from '@/shared/i18n';

interface TicketQRCodeProps {
  visible: boolean;
  onClose: () => void;
  ticket: EventTicket;
  event: Event;
}

export function TicketQRCode({ visible, onClose, ticket, event }: TicketQRCodeProps) {
  const { theme } = useSunMode();

  const formattedDate = new Date(event.date + 'T00:00:00').toLocaleDateString(i18n.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
    active: { label: i18n.t('statusValid'), variant: 'success' },
    used: { label: i18n.t('statusUsed'), variant: 'default' },
    cancelled: { label: i18n.t('statusCancelled'), variant: 'error' },
    refunded: { label: i18n.t('statusRefunded'), variant: 'warning' },
  };

  const status = statusConfig[ticket.status] ?? statusConfig.active;

  return (
    <BottomSheet visible={visible} onClose={onClose} title={i18n.t('myTicket')}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
        <View style={styles.content}>
          {/* Ticket card */}
          <View style={[styles.ticketCard, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.ticketHeader}>
              <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>
              <View style={styles.badgeRow}>
                <Badge
                  label={ticket.ticket_type.toUpperCase()}
                  variant={ticket.ticket_type === 'vip' ? 'vip' : 'default'}
                />
                <Badge label={status.label} variant={status.variant} size="sm" />
              </View>
            </View>

            {/* QR Code */}
            <View style={[styles.qrContainer, { backgroundColor: colors.white }]}>
              <QRCode
                value={ticket.qr_code || ticket.id}
                size={200}
                backgroundColor={colors.white}
                color={colors.black}
              />
            </View>

            <Text style={[styles.qrHint, { color: theme.textSecondary }]}>
              {i18n.t('presentQR')}
            </Text>

            {/* Dashed separator */}
            <View style={[styles.separator, { borderColor: theme.cardBorder }]} />

            {/* Details */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
                <View>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Date</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{formattedDate}</Text>
                </View>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
                <View>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{i18n.t('timeSlot')}</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {event.start_time?.slice(0, 5)}{event.end_time ? ` — ${event.end_time.slice(0, 5)}` : ''}
                  </Text>
                </View>
              </View>
              {ticket.price > 0 && (
                <View style={styles.detailItem}>
                  <Ionicons name="card-outline" size={16} color={theme.textSecondary} />
                  <View>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{i18n.t('paid')}</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>{ticket.price}€</Text>
                  </View>
                </View>
              )}
              <View style={styles.detailItem}>
                <Ionicons name="finger-print-outline" size={16} color={theme.textSecondary} />
                <View>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{i18n.t('ref')}</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {ticket.id.slice(0, 8).toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 8 },
  ticketCard: { borderRadius: 16, overflow: 'hidden' },
  ticketHeader: { padding: 16, gap: 10 },
  eventTitle: { fontSize: 20, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', gap: 8 },
  qrContainer: {
    alignSelf: 'center',
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 16,
  },
  qrHint: { fontSize: 12, textAlign: 'center', marginTop: 12 },
  separator: {
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
    marginVertical: 16,
    marginHorizontal: 16,
  },
  detailsGrid: { paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { fontSize: 11 },
  detailValue: { fontSize: 14, fontWeight: '600' },
});
