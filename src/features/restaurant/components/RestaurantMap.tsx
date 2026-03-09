import React from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import type { RestaurantZone } from '@/shared/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ZoneWithAvailability extends RestaurantZone {
  availableCount: number;
  isFull: boolean;
}

interface RestaurantMapProps {
  zones: ZoneWithAvailability[];
  selectedZoneId: string | null;
  onSelectZone: (zone: ZoneWithAvailability) => void;
}

export function RestaurantMap({ zones, selectedZoneId, onSelectZone }: RestaurantMapProps) {
  const { theme } = useSunMode();

  const getZoneIcon = (zoneType: string): string => {
    return zoneType === 'terrasse' ? 'sunny-outline' : 'home-outline';
  };

  const getZoneSubtitle = (zoneType: string): string => {
    return zoneType === 'terrasse' ? 'En plein air, face à la mer' : 'Salle climatisée, ambiance cosy';
  };

  return (
    <View style={styles.container}>
      {/* Photo du restaurant en fond */}
      <Image
        source={require('../../../../assets/restaurant-photo.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      {/* Overlay gradient en bas pour lisibilité des cartes */}
      <View style={styles.gradient} />

      {/* Cartes de zone */}
      <View style={styles.cardsContainer}>
        {zones.map((zone) => {
          const isSelected = zone.id === selectedZoneId;
          const isFull = zone.isFull;

          return (
            <TouchableOpacity
              key={zone.id}
              activeOpacity={isFull ? 1 : 0.7}
              onPress={() => !isFull && onSelectZone(zone)}
              style={[
                styles.zoneCard,
                {
                  backgroundColor: isFull
                    ? 'rgba(0,0,0,0.5)'
                    : isSelected
                      ? 'rgba(247, 217, 78, 0.25)'
                      : 'rgba(255,255,255,0.15)',
                  borderColor: isFull
                    ? 'rgba(255,255,255,0.1)'
                    : isSelected
                      ? colors.sunYellow
                      : 'rgba(255,255,255,0.3)',
                },
              ]}
            >
              <View style={styles.zoneCardHeader}>
                <Ionicons
                  name={getZoneIcon(zone.zone_type) as any}
                  size={22}
                  color={isFull ? 'rgba(255,255,255,0.4)' : colors.white}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.zoneName, isFull && styles.zoneNameFull]}>
                    {zone.name}
                  </Text>
                  <Text style={[styles.zoneSubtitle, isFull && styles.zoneSubtitleFull]}>
                    {getZoneSubtitle(zone.zone_type)}
                  </Text>
                </View>
              </View>

              <View style={styles.zoneCardFooter}>
                {isFull ? (
                  <View style={styles.fullBadge}>
                    <Text style={styles.fullBadgeText}>Complet</Text>
                  </View>
                ) : (
                  <View style={styles.availableBadge}>
                    <View style={styles.availableDot} />
                    <Text style={styles.availableText}>
                      {zone.availableCount} table{zone.availableCount > 1 ? 's' : ''} dispo
                    </Text>
                  </View>
                )}
                {!isFull && (
                  <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'transparent',
    // Simulate gradient with multiple layers
    borderTopWidth: 0,
    // Use a semi-transparent overlay
    backgroundGradient: undefined, // RN doesn't support gradients natively
  },
  cardsContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    gap: 12,
  },
  zoneCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    // Glassmorphism effect
    backdropFilter: 'blur(10px)',
  },
  zoneCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  zoneName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  zoneNameFull: {
    color: 'rgba(255,255,255,0.4)',
  },
  zoneSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  zoneSubtitleFull: {
    color: 'rgba(255,255,255,0.3)',
  },
  zoneCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  availableDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  availableText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  fullBadge: {
    backgroundColor: 'rgba(201, 64, 64, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  fullBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
});
