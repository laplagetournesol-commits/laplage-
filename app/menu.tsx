import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { i18n } from '@/shared/i18n';
import { supabase } from '@/shared/lib/supabase';

const { width } = Dimensions.get('window');

const PLAT_PHOTOS = [
  require('../assets/plats/plat-1.png'),
  require('../assets/plats/plat-2.png'),
  require('../assets/plats/plat-3.png'),
  require('../assets/plats/plat-4.jpg'),
  require('../assets/plats/plat-5.jpg'),
  require('../assets/plats/plat-6.jpg'),
];

const CHEF_PHOTO = require('../assets/plats/chef.png');
const CHEF_NAME = 'Alexis';

const MENU_PAGE = require('../assets/menu/page-1.png');
// PNG 3638 × 2573
const MENU_RATIO = 2573 / 3638;

export default function MenuScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();

  // Carte pilotable depuis la base (restaurant_settings / menu_page).
  // { url } => l'app affiche cette image à la place de celle embarquée, SANS rebuild.
  // Le ratio est calculé automatiquement à partir de l'image, donc toute nouvelle
  // carte (n'importe quelles dimensions) s'affiche correctement.
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [remoteRatio, setRemoteRatio] = useState<number | null>(null);
  useEffect(() => {
    supabase.from('restaurant_settings').select('value').eq('key', 'menu_page').maybeSingle().then(({ data }) => {
      const url = (data?.value as any)?.url;
      if (url && typeof url === 'string') {
        setRemoteUrl(url);
        Image.getSize(url, (w, h) => { if (w > 0) setRemoteRatio(h / w); }, () => {});
      }
    });
  }, []);

  const menuSource = remoteUrl ? { uri: remoteUrl } : MENU_PAGE;
  const ratio = remoteUrl ? (remoteRatio ?? MENU_RATIO) : MENU_RATIO;

  // Menu paysage : on cap la largeur d'affichage pour qu'il tienne en entier
  // sur l'écran sans scroll horizontal. Sur grand écran (web/tablette) on
  // limite la taille pour garder une lecture confortable.
  const menuWidth = Math.min(width - 24, 1100);
  const menuHeight = menuWidth * ratio;

  // Photos plats : 2 colonnes sur mobile, 3 sur tablette, 4 sur desktop large.
  const columns = width >= 1100 ? 4 : width >= 700 ? 3 : 2;
  const photoSize = Math.min((width - 24 - 12 * (columns - 1)) / columns, 260);

  // Chef : photo modérément grande, capée pour ne pas envahir l'écran web.
  const chefMaxWidth = Math.min(width - 24, 420);
  const chefHeight = chefMaxWidth * (4 / 3);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: i18n.t('menu') ?? 'Menu',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Menu en entier visible sans scroll horizontal. Pinch-to-zoom natif sur iOS/Android. */}
        <ScrollView
          maximumZoomScale={Platform.OS === 'web' ? 1 : 4}
          minimumZoomScale={1}
          bouncesZoom
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          style={{ height: menuHeight, marginBottom: 8, alignSelf: 'center', width: menuWidth }}
          contentContainerStyle={{ alignItems: 'center' }}
        >
          <Image
            source={menuSource}
            style={{ width: menuWidth, height: menuHeight, borderRadius: 8 }}
            resizeMode="contain"
          />
        </ScrollView>

        {Platform.OS !== 'web' && (
          <Text style={[styles.zoomHint, { color: theme.textSecondary }]}>
            {i18n.t('zoomHint') ?? 'Pincez pour zoomer'}
          </Text>
        )}

        <Text style={[styles.galleryTitle, { color: theme.text }]}>
          {i18n.t('ourDishes') ?? 'Nos plats'}
        </Text>

        <View style={[styles.grid, { gap: 12 }]}>
          {PLAT_PHOTOS.map((src, i) => (
            <Image
              key={i}
              source={src}
              style={{ width: photoSize, height: photoSize, borderRadius: 12 }}
              resizeMode="cover"
            />
          ))}
        </View>

        <Text style={[styles.galleryTitle, { color: theme.text }]}>
          {i18n.t('ourChef') ?? 'Notre chef'}
        </Text>
        <View style={[styles.chefCard, { backgroundColor: theme.card, alignSelf: 'center', width: chefMaxWidth }]}>
          <Image
            source={CHEF_PHOTO}
            style={{
              width: '100%',
              height: chefHeight,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            }}
            resizeMode="cover"
          />
          <View style={styles.chefName}>
            <Text style={[styles.chefNameText, { color: theme.text }]}>{CHEF_NAME}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { paddingHorizontal: 12, paddingTop: 12 },
  zoomHint: { fontSize: 11, fontStyle: 'italic', textAlign: 'center', marginBottom: 8 },
  galleryTitle: { fontSize: 20, fontWeight: '800', marginTop: 24, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  chefCard: { borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  chefName: { paddingVertical: 12, alignItems: 'center' },
  chefNameText: { fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },
});
