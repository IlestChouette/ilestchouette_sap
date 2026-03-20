export type ServiceId =
  | 'supermarket'
  | 'meds'
  | 'food'
  | 'keys'
  | 'shopping'
  | 'it'
  | 'assist'
  | 'bricolage'
  | 'voiturier'
  | 'express'
  | 'other';

export type ServiceType = 'flat' | 'hour';

export type Service = {
  id: ServiceId;
  emoji: string;
  labelKey: string;
  descKey: string;
  base: number;
  type: ServiceType;
  needsPickup: boolean; // false = juste dropoff (ex: livraison depuis magasin)
};

export type PaymentMethod = 'on_site_cash' | 'on_site_card' | 'online_card';

export type OrderStatus =
  | 'pending'
  | 'assigned'
  | 'acceptee'
  | 'en_route'
  | 'terminee'
  | 'annulee';

export type Order = {
  id: string;
  created_at: string;
  service_type: ServiceId;
  pickup_address: string | null;
  pickup_place_name?: string | null;
  dropoff_address: string;
  access_info?: string | null;
  notes?: string | null;
  distance_km?: number | null;
  price_total: number;
  express?: boolean | null;
  status?: OrderStatus | null;
  scheduled_at?: string | null;
  wants_invoice?: boolean | null;
  payment_method?: PaymentMethod | null;
  payment_status?: 'pending' | 'paid' | null;
  stripe_payment_intent_id?: string | null;
  client_email?: string | null;
  validation_code?: string | null;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  preferred_language: 'fr' | 'en' | 'es';
  created_at?: string;
};

export type SavedAddress = {
  id: string;
  user_id: string;
  label: string;
  address: string;
  lat: number | null;
  lon: number | null;
};
