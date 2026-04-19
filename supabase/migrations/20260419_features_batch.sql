-- ============================================================
-- Migration : Nouvelles fonctionnalités batch
-- 1. lat/lon sur merchants (sélection intelligente)
-- 2. is_featured sur merchant_products (mise en avant)
-- 3. closed_dates sur merchants (fermetures exceptionnelles)
-- ============================================================

-- Fonctionnalité 1 : coordonnées géographiques des commerçants
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS latitude  float8;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS longitude float8;

-- Fonctionnalité 3 : produits mis en avant par le commerçant
ALTER TABLE merchant_products ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Fonctionnalité 4 : jours de fermeture exceptionnelle (tableau de dates ISO)
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS closed_dates jsonb DEFAULT '[]'::jsonb;
