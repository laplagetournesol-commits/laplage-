-- =============================================================
-- Chat social : photos + notes vocales — 23/07/2026
-- Ajoute le type de message + pièce jointe + durée audio.
-- Les messages image/audio ont body = '' (body reste NOT NULL).
-- =============================================================

-- 1) Colonnes médias sur les messages
ALTER TABLE public.social_messages
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS duration_ms integer;

-- body peut être vide pour une photo / note vocale
ALTER TABLE public.social_messages ALTER COLUMN body SET DEFAULT '';

-- garde-fou sur les valeurs de kind
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_messages_kind_chk'
  ) THEN
    ALTER TABLE public.social_messages
      ADD CONSTRAINT social_messages_kind_chk CHECK (kind IN ('text', 'image', 'audio'));
  END IF;
END $$;

-- 2) Le bucket 'assets' doit accepter l'audio (photos déjà OK).
--    NULL = tous types autorisés (images + audio m4a/mp4). Limite 15 Mo déjà posée (034).
UPDATE storage.buckets SET allowed_mime_types = NULL WHERE id = 'assets';
