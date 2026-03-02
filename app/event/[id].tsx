import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { useEvent } from '@/features/events/hooks/useEvents';
import { useMyTickets } from '@/features/events/hooks/useTickets';
import { TicketSheet } from '@/features/events/components/TicketSheet';
import { TicketQRCode } from '@/features/events/components/TicketQRCode';
import { SecretCodeModal } from '@/features/events/components/SecretCodeModal';
import { useAuth } from '@/contexts/AuthContext';
import type { EventCategory, EventTicket } from '@/shared/types';

const CATEGORY_CONFIG: Record<EventCategory, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  pool_party: { label: 'Pool Party', icon: 'water', color: '#7EC8E3' },
  dj_set: { label: 'DJ Set', icon: 'musical-notes', color: '#9B59B6' },
  dinner_show: { label: 'Dinner Show', icon: 'restaurant', color: colors.terracotta },
  brunch: { label: 'Brunch', icon: 'cafe', color: colors.sage },
  private: { label: 'Privé', icon: 'lock-closed', color: colors.gray[500] },
  special: { label: 'Spécial', icon: 'diamond', color: colors.sunYellow },
};

function useCountdown(targetDate: string, startTime: string) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const target = new Date(`${targetDate}T${startTime}`);
      const now = new Date();
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('En cours');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);

      if (days > 0) {
        setTimeLeft(`${days}j ${hours}h ${minutes}m`);
      } else {
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate, startTime]);

  return timeLeft;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { event, loading } = useEvent(id!);
  const { tickets, refresh: refreshTickets } = useMyTickets();

  const [ticketSheetVisible, setTicketSheetVisible] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [secretModalVisible, setSecretModalVisible] = useState(false);
  const [secretUnlocked, setSecretUnlocked] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<EventTicket | null>(null);

  const countdown = useCountdown(event?.date ?? '', event?.start_time ?? '00:00');

  // Fetch user's tickets on mount
  useEffect(() => {
    if (user) refreshTickets();
  }, [user]);

  if (loading || !event) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </View>
    );
  }

  const cat = CATEGORY_CONFIG[event.category] ?? CATEGORY_CONFIG.special;
  const fillRate = event.tickets_sold / event.capacity;
  const isSoldOut = event.tickets_sold >= event.capacity;
  const isFree = event.standard_price === 0;
  const hasVip = event.vip_price != null && event.vip_price > 0;

  // Check if user has a ticket for this event
  const myTicket = tickets.find((t) => t.event_id === event.id && t.status === 'active');

  const formattedDate = new Date(event.date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleReserve = () => {
    if (event.is_secret && !secretUnlocked && event.secret_code) {
      setSecretModalVisible(true);
      return;
    }
    setTicketSheetVisible(true);
  };

  const handleShowTicket = (ticket: EventTicket) => {
    setSelectedTicket(ticket);
    setQrVisible(true);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero header */}
        <LinearGradient
          colors={[cat.color, cat.color + '66']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 8 }]}
        >
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>

          <View style={styles.heroContent}>
            <View style={styles.heroBadges}>
              <View style={styles.categoryBadge}>
                <Ionicons name={cat.icon} size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.categoryLabel}>{cat.label}</Text>
              </View>
              {event.is_secret && <Badge label="Secret" variant="vip" size="sm" />}
              {event.category === 'private' && <Badge label="Privé" variant="vip" size="sm" />}
            </View>

            <Text style={styles.heroTitle}>{event.title}</Text>

            {/* Countdown */}
            <View style={styles.countdownRow}>
              <Ionicons name="timer-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.countdownText}>{countdown}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Body */}
        <View style={styles.body}>
          {/* Info cards */}
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color={theme.accent} />
              <View>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Date</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{formattedDate}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color={theme.accent} />
              <View>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Horaire</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {event.start_time?.slice(0, 5)}{event.end_time ? ` — ${event.end_time.slice(0, 5)}` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={18} color={theme.accent} />
              <View>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Capacité</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {event.tickets_sold}/{event.capacity} places
                </Text>
              </View>
            </View>
          </View>

          {/* Fill bar */}
          <View style={styles.fillSection}>
            <View style={[styles.fillBar, { backgroundColor: theme.cardBorder }]}>
              <View
                style={[
                  styles.fillProgress,
                  {
                    width: `${Math.min(fillRate * 100, 100)}%`,
                    backgroundColor: fillRate > 0.8 ? colors.accentRed : colors.sage,
                  },
                ]}
              />
            </View>
            <Text style={[styles.fillText, { color: theme.textSecondary }]}>
              {isSoldOut ? 'Complet' : `${Math.round(fillRate * 100)}% rempli`}
            </Text>
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: theme.text }]}>{event.description}</Text>

          {/* Lineup */}
          {event.lineup && event.lineup.length > 0 && (
            <View style={styles.lineupSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Line-up</Text>
              {event.lineup.map((artist, i) => (
                <View key={i} style={styles.lineupItem}>
                  <Ionicons name="musical-notes" size={16} color={theme.accent} />
                  <Text style={[styles.lineupName, { color: theme.text }]}>{artist}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Pricing */}
          <View style={styles.pricingSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Tarifs</Text>
            <View style={[styles.priceCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: theme.text }]}>Standard</Text>
                <Text style={[styles.priceValue, { color: theme.text }]}>
                  {isFree ? 'Gratuit' : `${event.standard_price}€`}
                </Text>
              </View>
              {hasVip && (
                <>
                  <View style={[styles.priceDivider, { backgroundColor: theme.cardBorder }]} />
                  <View style={styles.priceRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.priceLabel, { color: theme.text }]}>VIP</Text>
                      <Badge label="Premium" variant="vip" size="sm" />
                    </View>
                    <Text style={[styles.priceValue, { color: colors.brand }]}>{event.vip_price}€</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* My ticket (if purchased) */}
          {myTicket && (
            <TouchableOpacity
              onPress={() => handleShowTicket(myTicket)}
              style={[styles.myTicketCard, { backgroundColor: colors.sunYellowLight }]}
            >
              <View style={styles.myTicketLeft}>
                <Ionicons name="ticket-outline" size={24} color={colors.warmWood} />
                <View>
                  <Text style={[styles.myTicketTitle, { color: colors.warmWood }]}>
                    Mon ticket {myTicket.ticket_type.toUpperCase()}
                  </Text>
                  <Text style={[styles.myTicketSub, { color: colors.warmWood }]}>
                    Touchez pour voir le QR code
                  </Text>
                </View>
              </View>
              <Ionicons name="qr-code-outline" size={24} color={colors.warmWood} />
            </TouchableOpacity>
          )}

          {/* Spacer for button */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Fixed bottom CTA */}
      {!myTicket && (
        <View style={[styles.bottomCta, { backgroundColor: theme.background, paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.ctaRow}>
            <View>
              {isFree ? (
                <Text style={[styles.ctaPrice, { color: colors.sage }]}>Gratuit</Text>
              ) : (
                <>
                  <Text style={[styles.ctaPriceLabel, { color: theme.textSecondary }]}>À partir de</Text>
                  <Text style={[styles.ctaPrice, { color: theme.text }]}>{event.standard_price}€</Text>
                </>
              )}
            </View>
            <Button
              title={isSoldOut ? 'Complet' : (event.is_secret && !secretUnlocked ? 'Code requis' : 'Réserver')}
              onPress={handleReserve}
              disabled={isSoldOut}
              size="lg"
              variant={event.is_secret && !secretUnlocked ? 'outline' : 'primary'}
              icon={event.is_secret && !secretUnlocked
                ? <Ionicons name="lock-closed" size={16} color={theme.accent} />
                : undefined
              }
            />
          </View>
        </View>
      )}

      {/* Modals */}
      <TicketSheet
        visible={ticketSheetVisible}
        onClose={() => setTicketSheetVisible(false)}
        event={event}
        onPurchased={() => {
          refreshTickets();
          setTicketSheetVisible(false);
        }}
      />

      {selectedTicket && (
        <TicketQRCode
          visible={qrVisible}
          onClose={() => setQrVisible(false)}
          ticket={selectedTicket}
          event={event}
        />
      )}

      <SecretCodeModal
        visible={secretModalVisible}
        onClose={() => setSecretModalVisible(false)}
        event={event}
        onSuccess={() => {
          setSecretUnlocked(true);
          setSecretModalVisible(false);
          setTimeout(() => setTicketSheetVisible(true), 300);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { paddingBottom: 32, paddingHorizontal: 20 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroContent: { gap: 10 },
  heroBadges: { flexDirection: 'row', gap: 8 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  heroTitle: { fontSize: 28, fontWeight: '800', color: colors.white, letterSpacing: 0.3 },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  countdownText: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  body: { paddingHorizontal: 20, marginTop: -16, paddingTop: 24 },
  infoCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
    marginBottom: 16,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoLabel: { fontSize: 11 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  fillSection: { marginBottom: 20 },
  fillBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  fillProgress: { height: '100%', borderRadius: 3 },
  fillText: { fontSize: 12, fontWeight: '500' },
  description: { fontSize: 15, lineHeight: 23, marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  lineupSection: { marginBottom: 24 },
  lineupItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  lineupName: { fontSize: 15, fontWeight: '500' },
  pricingSection: { marginBottom: 24 },
  priceCard: { padding: 16, borderRadius: 14, borderWidth: 1 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 15, fontWeight: '500' },
  priceValue: { fontSize: 22, fontWeight: '800' },
  priceDivider: { height: 1, marginVertical: 12 },
  myTicketCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
  },
  myTicketLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  myTicketTitle: { fontSize: 15, fontWeight: '700' },
  myTicketSub: { fontSize: 12, marginTop: 2 },
  bottomCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  ctaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaPriceLabel: { fontSize: 11 },
  ctaPrice: { fontSize: 24, fontWeight: '800' },
});
