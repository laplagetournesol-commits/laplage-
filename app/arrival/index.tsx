import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { useArrival, ARRIVAL_MENU } from '@/features/arrival/hooks/useArrival';
import { i18n } from '@/shared/i18n';

type MenuCategory = 'drinks' | 'food' | 'comfort';

const CATEGORY_CONFIG: Record<MenuCategory, { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }> = {
  drinks: { icon: 'wine-outline', label: i18n.t('drinks'), color: colors.accentRed },
  food: { icon: 'restaurant-outline', label: i18n.t('food'), color: colors.sage },
  comfort: { icon: 'sunny-outline', label: i18n.t('comfort'), color: colors.sunYellow },
};

export default function ArrivalScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type?: string; reservationId?: string }>();
  const resType = (params.type as 'beach' | 'restaurant') ?? 'beach';
  const resId = params.reservationId;

  const {
    items,
    addItem,
    removeItem,
    totalPrice,
    totalItems,
    specialRequests,
    setSpecialRequests,
    estimatedArrival,
    setEstimatedArrival,
    submit,
    submitting,
    existingOrder,
  } = useArrival(resType, resId);

  const [activeCategory, setActiveCategory] = useState<MenuCategory>('drinks');

  const handleSubmit = async () => {
    if (totalItems === 0) {
      Alert.alert(i18n.t('emptyCart'), i18n.t('addItems'));
      return;
    }

    Alert.alert(
      i18n.t('confirmPreOrder'),
      `${totalItems} ${i18n.t('articles')} — ${totalPrice}€`,
      [
        { text: i18n.t('cancel'), style: 'cancel' },
        {
          text: i18n.t('confirm'),
          onPress: async () => {
            const result = await submit();
            if (result.success) {
              Alert.alert(
                i18n.t('preOrderConfirmed'),
                i18n.t('preOrderReady'),
                [{ text: 'OK', onPress: () => router.back() }],
              );
            } else {
              Alert.alert(i18n.t('error'), '');
            }
          },
        },
      ],
    );
  };

  const ARRIVAL_TIMES = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '15:00', '16:00'];

  // Si une pré-commande existe déjà
  if (existingOrder) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.header}>
            <Text style={{ fontSize: 48 }}>🎉</Text>
            <Text style={[styles.title, { color: theme.text }]}>{i18n.t('preOrderConfirmed')}</Text>
            <Badge label={existingOrder.status.toUpperCase()} variant="success" />
          </View>
          <Card style={{ gap: 8 }}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Votre commande</Text>
            {existingOrder.items.map((item, i) => (
              <View key={i} style={styles.orderItemRow}>
                <Text style={[styles.orderItemName, { color: theme.text }]}>
                  {item.quantity}x {item.name}
                </Text>
                <Text style={[styles.orderItemPrice, { color: theme.textSecondary }]}>
                  {item.price * item.quantity}€
                </Text>
              </View>
            ))}
            <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
            <View style={styles.orderItemRow}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>Total</Text>
              <Text style={[styles.totalValue, { color: theme.accent }]}>{existingOrder.total_price}€</Text>
            </View>
          </Card>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={{ fontSize: 40 }}>🏖️</Text>
          <Text style={[styles.title, { color: theme.text }]}>{i18n.t('arrivalTitle')}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Pré-commandez pour un accueil VIP à votre arrivée
          </Text>
        </View>

        {/* Heure d'arrivée estimée */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{i18n.t('estimatedArrival')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeRow}>
            {ARRIVAL_TIMES.map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeChip,
                  {
                    backgroundColor: estimatedArrival === time ? theme.accent : theme.card,
                    borderColor: estimatedArrival === time ? theme.accent : theme.cardBorder,
                  },
                ]}
                onPress={() => setEstimatedArrival(time)}
              >
                <Text
                  style={[
                    styles.timeText,
                    { color: estimatedArrival === time ? colors.white : theme.text },
                  ]}
                >
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Category tabs */}
        <View style={styles.categoryRow}>
          {(Object.keys(CATEGORY_CONFIG) as MenuCategory[]).map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const active = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: active ? config.color + '20' : theme.card,
                    borderColor: active ? config.color : theme.cardBorder,
                  },
                ]}
                onPress={() => setActiveCategory(cat)}
              >
                <Ionicons name={config.icon} size={16} color={active ? config.color : theme.textSecondary} />
                <Text style={[styles.categoryLabel, { color: active ? config.color : theme.textSecondary }]}>
                  {config.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Menu items */}
        <View style={styles.menuList}>
          {ARRIVAL_MENU[activeCategory].map((menuItem) => {
            const cartItem = items.get(menuItem.name);
            const qty = cartItem?.quantity ?? 0;
            return (
              <View key={menuItem.name} style={[styles.menuItem, { borderBottomColor: theme.cardBorder }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuName, { color: theme.text }]}>{menuItem.name}</Text>
                  <Text style={[styles.menuPrice, { color: theme.accent }]}>{menuItem.price}€</Text>
                </View>
                <View style={styles.qtyControls}>
                  {qty > 0 && (
                    <>
                      <TouchableOpacity
                        style={[styles.qtyBtn, { backgroundColor: theme.backgroundSecondary }]}
                        onPress={() => removeItem(menuItem.name)}
                      >
                        <Ionicons name="remove" size={18} color={theme.text} />
                      </TouchableOpacity>
                      <Text style={[styles.qtyText, { color: theme.text }]}>{qty}</Text>
                    </>
                  )}
                  <TouchableOpacity
                    style={[styles.qtyBtn, { backgroundColor: colors.sunYellowLight }]}
                    onPress={() => addItem(menuItem.name, menuItem.price)}
                  >
                    <Ionicons name="add" size={18} color={colors.warmWood} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Special requests */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{i18n.t('specialRequests')}</Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
                color: theme.text,
              },
            ]}
            placeholder="Allergies, préférences, message pour l'équipe..."
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={3}
            value={specialRequests}
            onChangeText={setSpecialRequests}
          />
        </View>
      </ScrollView>

      {/* Fixed bottom bar */}
      {totalItems > 0 && (
        <View style={[styles.bottomBar, { backgroundColor: theme.background, borderTopColor: theme.cardBorder }]}>
          <View style={styles.bottomInfo}>
            <Text style={[styles.bottomItems, { color: theme.textSecondary }]}>
              {totalItems} article{totalItems > 1 ? 's' : ''}
            </Text>
            <Text style={[styles.bottomTotal, { color: theme.text }]}>{totalPrice}€</Text>
          </View>
          <Button
            title={i18n.t('confirmPreOrder')}
            onPress={handleSubmit}
            loading={submitting}
            size="lg"
            style={{ flex: 1 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { paddingHorizontal: 20 },
  backRow: { marginBottom: 8 },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: 0.5, marginTop: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 6 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  timeRow: { gap: 8 },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  timeText: { fontSize: 14, fontWeight: '600' },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
    marginBottom: 12,
  },
  categoryChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryLabel: { fontSize: 13, fontWeight: '600' },
  menuList: { gap: 0 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuName: { fontSize: 15, fontWeight: '600' },
  menuPrice: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { fontSize: 16, fontWeight: '700', minWidth: 16, textAlign: 'center' },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  bottomInfo: { alignItems: 'center' },
  bottomItems: { fontSize: 12 },
  bottomTotal: { fontSize: 22, fontWeight: '800' },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderItemName: { fontSize: 14, fontWeight: '500' },
  orderItemPrice: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginVertical: 4 },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '800' },
});
