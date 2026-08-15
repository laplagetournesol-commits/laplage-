-- Résa "pour un ami" avec lien de paiement (confirmer = payer).
-- Ajoute : un token pour l'URL du lien, un flag "paiement demandé", et l'id de session Stripe.
-- "payé + confirmé" = deposit_paid=true / status='confirmed' (mécanisme existant réutilisé).

-- guest_confirmed = l'ami est confirmé (soit par paiement, soit manuellement par l'admin).
alter table public.beach_reservations
  add column if not exists guest_payment_requested boolean not null default false,
  add column if not exists guest_confirmed boolean not null default false,
  add column if not exists guest_payment_token uuid default gen_random_uuid(),
  add column if not exists guest_checkout_session_id text;

alter table public.restaurant_reservations
  add column if not exists guest_payment_requested boolean not null default false,
  add column if not exists guest_confirmed boolean not null default false,
  add column if not exists guest_payment_token uuid default gen_random_uuid(),
  add column if not exists guest_checkout_session_id text;

-- Recherche rapide de la résa par token (page de paiement publique).
create index if not exists idx_beach_res_guest_token
  on public.beach_reservations (guest_payment_token);
create index if not exists idx_resto_res_guest_token
  on public.restaurant_reservations (guest_payment_token);
