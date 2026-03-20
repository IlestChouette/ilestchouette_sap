export type AssignmentStatus =
  | 'assigned'
  | 'en_attente'
  | 'acceptee'
  | 'refusee'
  | 'terminee'
  | 'annulee';

export type Order = {
  id: string;
  pickup_address: string;
  pickup_place_name?: string | null;
  dropoff_address: string;
  access_info?: string | null;
  notes?: string | null;
  price_total: number;
  express?: boolean;
  created_at?: string | null;
  validation_code?: string | null;
  status?: string | null;
  wants_invoice?: boolean | null;
  extra_stops?: string[] | null;
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
  order?: Order;
};

export type Availability = {
  id: string;
  courier_email: string;
  start: string;
  end: string;
  created_at?: string;
};
