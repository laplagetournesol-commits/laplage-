-- =============================================================
-- Réseau social interne « La Plage » — 23/07/2026
-- Opt-in (invisible par défaut), présents du jour, photo optionnelle.
-- RLS stricte + Realtime pour le chat. Modération (bloquer/signaler).
-- =============================================================

-- 1) Profil social (1 par utilisateur)
CREATE TABLE IF NOT EXISTS public.social_profiles (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname     text,
  photo_url    text,
  status       text,                              -- humeur / statut du jour
  visible      boolean NOT NULL DEFAULT false,    -- opt-in
  visible_date date,                              -- visible seulement si = aujourd'hui
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 2) Connexions (demande / acceptée / refusée / bloquée)
CREATE TABLE IF NOT EXISTS public.social_connections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending',   -- pending / accepted / declined / blocked
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);
CREATE INDEX IF NOT EXISTS idx_social_conn_addressee ON public.social_connections(addressee_id);
CREATE INDEX IF NOT EXISTS idx_social_conn_requester ON public.social_connections(requester_id);

-- 3) Messages 1-à-1
CREATE TABLE IF NOT EXISTS public.social_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body         text NOT NULL,
  read         boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_social_msg_pair ON public.social_messages(sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_social_msg_recipient ON public.social_messages(recipient_id, read);

-- 4) Signalements (modération — obligatoire Apple pour l'UGC)
CREATE TABLE IF NOT EXISTS public.social_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Helpers (SECURITY DEFINER : contournent la RLS pour les vérifs)
CREATE OR REPLACE FUNCTION public.social_are_connected(a uuid, b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.social_connections c
    WHERE c.status = 'accepted'
      AND ((c.requester_id = a AND c.addressee_id = b) OR (c.requester_id = b AND c.addressee_id = a))
  );
$$;

CREATE OR REPLACE FUNCTION public.social_is_blocked(a uuid, b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.social_connections c
    WHERE c.status = 'blocked'
      AND ((c.requester_id = a AND c.addressee_id = b) OR (c.requester_id = b AND c.addressee_id = a))
  );
$$;

-- ===================== RLS =====================
ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_reports ENABLE ROW LEVEL SECURITY;

-- Profils : soi (toujours) + les profils visibles aujourd'hui non bloqués
DROP POLICY IF EXISTS social_profiles_read ON public.social_profiles;
CREATE POLICY social_profiles_read ON public.social_profiles FOR SELECT
  USING (
    user_id = auth.uid()
    OR (visible = true AND visible_date = current_date AND NOT public.social_is_blocked(auth.uid(), user_id))
  );
DROP POLICY IF EXISTS social_profiles_write ON public.social_profiles;
CREATE POLICY social_profiles_write ON public.social_profiles FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Connexions : celles qui me concernent
DROP POLICY IF EXISTS social_conn_read ON public.social_connections;
CREATE POLICY social_conn_read ON public.social_connections FOR SELECT
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
DROP POLICY IF EXISTS social_conn_insert ON public.social_connections;
CREATE POLICY social_conn_insert ON public.social_connections FOR INSERT
  WITH CHECK (requester_id = auth.uid());
DROP POLICY IF EXISTS social_conn_update ON public.social_connections;
CREATE POLICY social_conn_update ON public.social_connections FOR UPDATE
  USING (requester_id = auth.uid() OR addressee_id = auth.uid())
  WITH CHECK (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Messages : lire les miens ; envoyer si connecté (accepté) et pas bloqué
DROP POLICY IF EXISTS social_msg_read ON public.social_messages;
CREATE POLICY social_msg_read ON public.social_messages FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());
DROP POLICY IF EXISTS social_msg_insert ON public.social_messages;
CREATE POLICY social_msg_insert ON public.social_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND public.social_are_connected(auth.uid(), recipient_id)
    AND NOT public.social_is_blocked(auth.uid(), recipient_id)
  );
DROP POLICY IF EXISTS social_msg_update ON public.social_messages;
CREATE POLICY social_msg_update ON public.social_messages FOR UPDATE
  USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());

-- Signalements : créer les miens ; admin lit
DROP POLICY IF EXISTS social_reports_insert ON public.social_reports;
CREATE POLICY social_reports_insert ON public.social_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());
DROP POLICY IF EXISTS social_reports_admin ON public.social_reports;
CREATE POLICY social_reports_admin ON public.social_reports FOR SELECT
  USING (public.is_admin());

-- Realtime (chat + connexions en direct)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.social_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.social_connections;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
