-- =============================================================
-- Photos de profil social — autoriser l'upload par les connectés — 23/07/2026
-- Le bucket 'assets' bloquait l'insert (policy RLS). On autorise les
-- utilisateurs authentifiés à y uploader + lecture publique (pour afficher).
-- =============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='assets_authenticated_insert') THEN
    CREATE POLICY "assets_authenticated_insert" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'assets');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='assets_public_read') THEN
    CREATE POLICY "assets_public_read" ON storage.objects
      FOR SELECT USING (bucket_id = 'assets');
  END IF;
END $$;

-- s'assurer que le bucket est public (affichage) + limite 15 Mo par fichier
UPDATE storage.buckets SET public = true, file_size_limit = 15728640 WHERE id = 'assets';
