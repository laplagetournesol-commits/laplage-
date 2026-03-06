/** Types principaux de la base de données La Plage Royale */

export type UserRole = 'client' | 'staff' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  preferred_language: 'fr' | 'es' | 'en';
  beach_tokens: number;
  vip_level: 'standard' | 'silver' | 'gold' | 'platinum';
  total_spent: number;
  visit_count: number;
  no_show_count: number;
  created_at: string;
  updated_at: string;
}

export type BeachZoneType = 'standard' | 'premium' | 'front_row' | 'vip_cabana';

export interface BeachZone {
  id: string;
  name: string;
  zone_type: BeachZoneType;
  color: string;
  base_price: number;
  capacity: number;
  description: string | null;
  svg_path_data: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Sunbed {
  id: string;
  zone_id: string;
  label: string;
  svg_x: number;
  svg_y: number;
  svg_width: number;
  svg_height: number;
  is_double: boolean;
  is_active: boolean;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';

export interface BeachReservation {
  id: string;
  user_id: string;
  sunbed_id: string;
  date: string;
  status: ReservationStatus;
  total_price: number;
  deposit_amount: number;
  deposit_paid: boolean;
  stripe_payment_intent_id: string | null;
  guest_count: number;
  special_requests: string | null;
  qr_code?: string;
  created_at: string;
}

export interface Addon {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: 'comfort' | 'food' | 'drink' | 'pack';
  icon: string | null;
  is_available: boolean;
  sort_order: number;
}

export interface ReservationAddon {
  id: string;
  reservation_id: string;
  addon_id: string;
  quantity: number;
  unit_price: number;
}

export type RestaurantZoneType = 'terrasse' | 'vue_mer' | 'lounge';

export interface RestaurantZone {
  id: string;
  name: string;
  zone_type: RestaurantZoneType;
  color: string;
  min_spend: number;
  capacity: number;
  description: string | null;
  svg_path_data: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface RestaurantTable {
  id: string;
  zone_id: string;
  label: string;
  seats: number;
  shape: 'round' | 'square' | 'rectangle';
  svg_x: number;
  svg_y: number;
  svg_width: number;
  svg_height: number;
  is_active: boolean;
}

export interface RestaurantReservation {
  id: string;
  user_id: string;
  table_id: string;
  date: string;
  time_slot: string;
  guest_count: number;
  status: ReservationStatus;
  deposit_amount: number;
  deposit_paid: boolean;
  stripe_payment_intent_id: string | null;
  special_requests: string | null;
  qr_code?: string;
  created_at: string;
}

export type EventCategory = 'pool_party' | 'dj_set' | 'dinner_show' | 'brunch' | 'private' | 'special';

export interface Event {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  date: string;
  start_time: string;
  end_time: string | null;
  flyer_url: string | null;
  lineup: string[] | null;
  capacity: number;
  tickets_sold: number;
  standard_price: number;
  vip_price: number | null;
  is_secret: boolean;
  secret_code: string | null;
  required_vip_level: string | null;
  required_tokens: number | null;
  is_published: boolean;
  created_at: string;
}

export type TicketType = 'standard' | 'vip';
export type TicketStatus = 'active' | 'used' | 'cancelled' | 'refunded';

export interface EventTicket {
  id: string;
  event_id: string;
  user_id: string;
  ticket_type: TicketType;
  price: number;
  qr_code: string;
  status: TicketStatus;
  stripe_payment_intent_id: string | null;
  checked_in_at: string | null;
  created_at: string;
}

export interface TokenTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'earn' | 'spend' | 'bonus' | 'expire';
  reason: string;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  token_cost: number;
  category: string;
  icon: string | null;
  is_available: boolean;
  stock: number | null;
}

export interface SeasonalPricing {
  id: string;
  zone_type: string;
  start_date: string;
  end_date: string;
  multiplier: number;
  label: string | null;
}

export interface LiveCamera {
  id: string;
  name: string;
  location: string;
  stream_url: string | null;
  thumbnail_url: string | null;
  is_active: boolean;
  crowd_level: 'low' | 'medium' | 'high' | null;
  created_at: string;
}

export type PreOrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface PreOrder {
  id: string;
  user_id: string;
  reservation_type: 'beach' | 'restaurant';
  reservation_id: string;
  items: PreOrderItem[];
  special_requests: string | null;
  estimated_arrival: string | null;
  status: PreOrderStatus;
  total_price: number;
  created_at: string;
}

export interface PreOrderItem {
  name: string;
  quantity: number;
  price: number;
}
