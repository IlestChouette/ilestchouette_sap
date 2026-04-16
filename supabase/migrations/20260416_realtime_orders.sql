-- ============================================================
-- Migration : Activer Realtime sur la table orders
-- Nécessaire pour que l'app client reçoive les mises à jour
-- en temps réel (suivi de commande)
-- ============================================================

-- Permet à Supabase de transmettre les anciennes + nouvelles valeurs
-- lors des UPDATE (indispensable pour postgres_changes)
ALTER TABLE orders REPLICA IDENTITY FULL;

-- Ajouter la table à la publication Realtime de Supabase
-- (si elle n'y est pas déjà)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
END $$;
