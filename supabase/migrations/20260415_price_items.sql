-- ============================================================
-- Migration : Ajout de price_items sur la table orders
-- Représente le coût des articles achetés par le coursier
-- pour le compte du client (courses, pharmacie, etc.)
-- La commission 65% s'applique uniquement sur (price_total - price_items)
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS price_items NUMERIC DEFAULT 0;

-- Mettre 0 pour les anciennes commandes (valeur par défaut déjà gérée)
UPDATE orders SET price_items = 0 WHERE price_items IS NULL;
