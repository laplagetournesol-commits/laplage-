-- =============================================================
-- Carte "commande depuis le transat" (app) — 23/07/2026
-- Miroir des produits/familles de la caisse Ágora + interrupteurs
-- d'activation à DEUX niveaux : par catégorie (famille) ET par article.
-- Un produit est proposé dans l'app si SA famille est activée ET lui-même.
-- Les prix/TVA viennent d'Ágora (source de vérité), resynchronisés.
-- =============================================================

-- Catégories (familles Ágora) + interrupteur
CREATE TABLE IF NOT EXISTS public.app_menu_families (
  family_id   integer PRIMARY KEY,
  name        text NOT NULL,
  enabled     boolean NOT NULL DEFAULT false,   -- catégorie proposée dans l'app ?
  sort_order  integer NOT NULL DEFAULT 0,
  synced_at   timestamptz NOT NULL DEFAULT now()
);

-- Articles (produits Ágora) + interrupteur individuel
CREATE TABLE IF NOT EXISTS public.app_menu_items (
  product_id     integer PRIMARY KEY,
  sale_format_id integer,
  name           text NOT NULL,
  price          numeric NOT NULL DEFAULT 0,     -- prix Ágora (liste 1)
  vat_id         integer,
  vat_rate       numeric,                        -- 0.10 / 0.21 ...
  family_id      integer,
  family_name    text,
  prep_type      text,                           -- 'BARRA' / 'COCINA' (routage bar/cuisine)
  saleable       boolean NOT NULL DEFAULT true,  -- SaleableAsMain côté Ágora
  enabled        boolean NOT NULL DEFAULT false, -- article proposé dans l'app ?
  synced_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_menu_items_family ON public.app_menu_items(family_id);

-- RLS : lecture publique (l'app affiche la carte), écriture admin seulement.
-- Le service_role (serveur, synchro) bypasse la RLS.
ALTER TABLE public.app_menu_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_menu_families_read ON public.app_menu_families;
CREATE POLICY app_menu_families_read ON public.app_menu_families FOR SELECT USING (true);

DROP POLICY IF EXISTS app_menu_items_read ON public.app_menu_items;
CREATE POLICY app_menu_items_read ON public.app_menu_items FOR SELECT USING (true);

DROP POLICY IF EXISTS app_menu_families_admin ON public.app_menu_families;
CREATE POLICY app_menu_families_admin ON public.app_menu_families
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS app_menu_items_admin ON public.app_menu_items;
CREATE POLICY app_menu_items_admin ON public.app_menu_items
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
