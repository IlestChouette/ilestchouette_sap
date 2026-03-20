-- ============================================================
-- Migration : App Client Il est chouette
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- 1. Colonnes supplémentaires sur la table orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS client_email TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'on_site_cash',
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Index pour retrouver rapidement les commandes d'un client
CREATE INDEX IF NOT EXISTS idx_orders_client_email ON orders (client_email);

-- 2. Table profiles (clients)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  preferred_language TEXT DEFAULT 'fr',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS profiles : chaque client ne voit que son propre profil
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 3. Table saved_addresses
CREATE TABLE IF NOT EXISTS saved_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_addresses_user ON saved_addresses (user_id);

ALTER TABLE saved_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "saved_addresses_own"
  ON saved_addresses
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Table client_push_tokens (notifications client)
CREATE TABLE IF NOT EXISTS client_push_tokens (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  token TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE client_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "client_push_tokens_own"
  ON client_push_tokens
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Permettre aux clients d'insérer leurs propres commandes
-- (si RLS est activé sur la table orders)
-- Adapter selon la configuration actuelle de RLS sur orders.
-- Si orders n'a pas de RLS, ces policies sont ignorées.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'orders' AND n.nspname = 'public' AND c.relrowsecurity
  ) THEN
    EXECUTE $pol$
      CREATE POLICY IF NOT EXISTS "orders_client_insert"
        ON orders FOR INSERT
        WITH CHECK (client_email = auth.jwt() ->> 'email')
    $pol$;

    EXECUTE $pol$
      CREATE POLICY IF NOT EXISTS "orders_client_select_own"
        ON orders FOR SELECT
        USING (client_email = auth.jwt() ->> 'email')
    $pol$;
  END IF;
END $$;

-- 6. Ajouter la clé Stripe dans les secrets Supabase
-- (à faire via Dashboard > Settings > Edge Functions > Secrets)
-- STRIPE_SECRET_KEY = sk_test_51TD8bVR0psb1M7cc...
