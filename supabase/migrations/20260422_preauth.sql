-- Pré-autorisation Stripe pour commandes supermarché
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_items_actual NUMERIC DEFAULT NULL;
