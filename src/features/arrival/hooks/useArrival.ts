import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { PreOrder, PreOrderItem } from '@/shared/types';

// Menu items pré-configurés pour la pré-commande
export const ARRIVAL_MENU = {
  drinks: [
    { name: 'Mojito Classique', price: 14 },
    { name: 'Spritz Aperol', price: 13 },
    { name: 'Champagne Moët (coupe)', price: 22 },
    { name: 'Rosé (bouteille)', price: 38 },
    { name: 'Jus d\'orange pressé', price: 7 },
    { name: 'Eau San Pellegrino', price: 5 },
  ],
  food: [
    { name: 'Plateau de fruits frais', price: 18 },
    { name: 'Club Sandwich', price: 16 },
    { name: 'Salade César', price: 15 },
    { name: 'Nachos à partager', price: 14 },
    { name: 'Glace artisanale (3 boules)', price: 9 },
  ],
  comfort: [
    { name: 'Crème solaire SPF50', price: 12 },
    { name: 'Serviette de plage XL', price: 8 },
    { name: 'Chapeau de paille', price: 15 },
  ],
};

export function useArrival(reservationType?: 'beach' | 'restaurant', reservationId?: string) {
  const [items, setItems] = useState<Map<string, PreOrderItem>>(new Map());
  const [specialRequests, setSpecialRequests] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingOrder, setExistingOrder] = useState<PreOrder | null>(null);

  // Charger une pré-commande existante
  useEffect(() => {
    if (!reservationId) return;
    const fetchExisting = async () => {
      const { data } = await supabase
        .from('pre_orders')
        .select('*')
        .eq('reservation_id', reservationId)
        .neq('status', 'cancelled')
        .maybeSingle();

      if (data) setExistingOrder(data as PreOrder);
    };
    fetchExisting();
  }, [reservationId]);

  const addItem = useCallback((name: string, price: number) => {
    setItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(name);
      if (existing) {
        next.set(name, { ...existing, quantity: existing.quantity + 1 });
      } else {
        next.set(name, { name, quantity: 1, price });
      }
      return next;
    });
  }, []);

  const removeItem = useCallback((name: string) => {
    setItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(name);
      if (existing && existing.quantity > 1) {
        next.set(name, { ...existing, quantity: existing.quantity - 1 });
      } else {
        next.delete(name);
      }
      return next;
    });
  }, []);

  const totalPrice = Array.from(items.values()).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const totalItems = Array.from(items.values()).reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const submit = useCallback(async () => {
    if (!reservationType || !reservationId || items.size === 0) return { success: false };

    setSubmitting(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Connectez-vous');

      const { error: insertError } = await supabase.from('pre_orders').insert({
        user_id: user.id,
        reservation_type: reservationType,
        reservation_id: reservationId,
        items: Array.from(items.values()),
        special_requests: specialRequests || null,
        estimated_arrival: estimatedArrival,
        total_price: totalPrice,
        status: 'pending',
      });

      if (insertError) throw insertError;

      setSubmitting(false);
      return { success: true };
    } catch (err: any) {
      setError(err.message ?? 'Une erreur est survenue');
      setSubmitting(false);
      return { success: false };
    }
  }, [reservationType, reservationId, items, specialRequests, estimatedArrival, totalPrice]);

  return {
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
    error,
    existingOrder,
  };
}
