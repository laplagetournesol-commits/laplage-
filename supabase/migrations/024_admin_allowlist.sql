-- 024_admin_allowlist.sql
-- Allowlist d'emails pré-autorisés comme admin.
-- Tout email présent dans admin_emails devient automatiquement role='admin'
-- au moment de son inscription (via le trigger on_auth_user_created).

-- 1) Table allowlist
CREATE TABLE IF NOT EXISTS admin_emails (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verrouillée : seul le service_role / les fonctions SECURITY DEFINER y accèdent.
ALTER TABLE admin_emails ENABLE ROW LEVEL SECURITY;

-- 2) Pré-autoriser cet email
INSERT INTO admin_emails (email)
VALUES ('msierraimizcoz@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- 3) Trigger d'inscription : crée le profil avec le bon rôle
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT := 'client';
BEGIN
  IF EXISTS (
    SELECT 1 FROM admin_emails WHERE lower(email) = lower(NEW.email)
  ) THEN
    v_role := 'admin';
  END IF;

  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- (le trigger on_auth_user_created existe déjà et pointe vers cette fonction)

-- 4) Au cas où le compte existe déjà : promouvoir les profils correspondants
UPDATE profiles
SET role = 'admin'
WHERE lower(email) IN (SELECT lower(email) FROM admin_emails)
  AND role <> 'admin';
