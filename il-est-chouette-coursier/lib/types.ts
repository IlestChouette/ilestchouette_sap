export type AssignmentStatus =
  | 'assigned'
  | 'en_attente'
  | 'acceptee'
  | 'refusee'
  | 'terminee'
  | 'annulee';

export type Order = {
  id: string;
  service_type?: string | null;
  pickup_address: string;
  pickup_place_name?: string | null;
  dropoff_address: string;
  access_info?: string | null;
  notes?: string | null;
  price_total: number;
  price_items?: number | null;
  express?: boolean;
  created_at?: string | null;
  scheduled_at?: string | null;
  validation_code?: string | null;
  status?: string | null;
  wants_invoice?: boolean | null;
  extra_stops?: string[] | null;
  client_email?: string | null;
  client_name?: string | null;
  client_phone?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  stripe_payment_intent_id?: string | null;
};

export type Assignment = {
  id: string;
  order_id: string;
  courier_email: string;
  assigned_at?: string | null;
  scheduled_at?: string | null;
  status?: AssignmentStatus | null;
  payment_method?: string | null;
  validated_with_code?: boolean | null;
  route_duration_seconds?: number | null;
  order?: Order;
};

export type Availability = {
  id: string;
  courier_email: string;
  start: string;
  end: string;
  created_at?: string;
};
