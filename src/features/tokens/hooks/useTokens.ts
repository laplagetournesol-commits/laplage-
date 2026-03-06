import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { TokenTransaction, Reward } from '@/shared/types';

export function useTokenHistory() {
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('token_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setTransactions(data as TokenTransaction[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { transactions, loading, refresh: fetch };
}

export function useRewards() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('rewards')
        .select('*')
        .eq('is_available', true)
        .order('token_cost', { ascending: true });

      if (data) setRewards(data as Reward[]);
      setLoading(false);
    };
    fetch();
  }, []);

  return { rewards, loading };
}

export function useRedeemReward() {
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redeem = useCallback(async (reward: Reward) => {
    setRedeeming(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Connectez-vous pour échanger');

      // Vérifier les tokens
      const { data: profile } = await supabase
        .from('profiles')
        .select('beach_tokens')
        .eq('id', user.id)
        .single();

      if (!profile || profile.beach_tokens < reward.token_cost) {
        throw new Error(`Il vous faut ${reward.token_cost} tokens (vous en avez ${profile?.beach_tokens ?? 0})`);
      }

      // Déduire les tokens
      const { error: deductError } = await supabase
        .from('profiles')
        .update({ beach_tokens: profile.beach_tokens - reward.token_cost })
        .eq('id', user.id);

      if (deductError) throw new Error('Erreur lors de la déduction des tokens');

      // Vérifier que la déduction a bien eu lieu
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('beach_tokens')
        .eq('id', user.id)
        .single();

      if (updatedProfile && updatedProfile.beach_tokens > profile.beach_tokens - reward.token_cost) {
        throw new Error('La déduction des tokens a échoué, veuillez réessayer');
      }

      // Enregistrer la transaction
      await supabase.from('token_transactions').insert({
        user_id: user.id,
        amount: -reward.token_cost,
        type: 'spend',
        reason: `Récompense : ${reward.name}`,
        reference_type: 'reward',
        reference_id: reward.id,
      });

      // Mettre à jour le stock si applicable
      if (reward.stock != null) {
        await supabase
          .from('rewards')
          .update({ stock: reward.stock - 1 })
          .eq('id', reward.id);
      }

      setRedeeming(false);
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      setRedeeming(false);
      return { success: false };
    }
  }, []);

  return { redeem, redeeming, error };
}
