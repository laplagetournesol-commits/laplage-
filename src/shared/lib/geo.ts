// Utilitaires géofence pour "Connecte-toi" : distance GPS + présence sur la plage.

export interface Geofence {
  lat: number;
  lng: number;
  radius_m: number;
}

/** Distance en mètres entre 2 points GPS (formule de Haversine). */
export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // rayon Terre en m
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Position considérée "sur la plage" si dans le rayon. */
export function isInside(lat: number, lng: number, geo: Geofence | null): boolean {
  if (!geo) return false;
  return haversineM(lat, lng, geo.lat, geo.lng) <= geo.radius_m;
}

/**
 * Un profil est "à la plage maintenant" si le booléen at_beach (calculé côté client
 * à partir de la position + du géofence, sans exposer les coords) est vrai ET frais.
 */
export function isAtBeach(
  p: { at_beach?: boolean | null; loc_updated_at?: string | null },
  freshMs = 5 * 60 * 1000,
): boolean {
  if (!p.at_beach || !p.loc_updated_at) return false;
  return Date.now() - Date.parse(p.loc_updated_at) <= freshMs;
}
