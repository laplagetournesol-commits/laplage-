-- =============================================================
-- Corrections sécurité réseau social "Connecte-toi" — 26/07/2026
-- =============================================================

-- 1) Empêcher l'AUTO-ACCEPTATION d'une connexion.
--    Avant : le demandeur pouvait passer sa propre demande pending -> accepted
--    (donc s'imposer comme "connecté" et envoyer des DM sans consentement).
--    Après : seul le DESTINATAIRE peut accepter/refuser. Le demandeur ne peut
--    que laisser pending, annuler, ou bloquer.
DROP POLICY IF EXISTS social_conn_update ON public.social_connections;
CREATE POLICY social_conn_update ON public.social_connections FOR UPDATE
  USING (requester_id = auth.uid() OR addressee_id = auth.uid())
  WITH CHECK (
    addressee_id = auth.uid()
    OR (requester_id = auth.uid() AND status IN ('pending', 'blocked', 'cancelled'))
  );

-- 2) Confidentialité de la position : ne plus exposer les coordonnées GPS brutes.
--    L'app n'a besoin que d'un booléen "à la plage maintenant". On ajoute at_beach
--    (calculé côté client à partir de la position + du géofence) et on PURGE les
--    coordonnées déjà stockées. Le client (build suivant) écrit at_beach au lieu
--    de lat/lng.
ALTER TABLE public.social_profiles ADD COLUMN IF NOT EXISTS at_beach boolean NOT NULL DEFAULT false;
UPDATE public.social_profiles SET lat = NULL, lng = NULL WHERE lat IS NOT NULL OR lng IS NOT NULL;
