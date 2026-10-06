create table if not exists public.mission_clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nom text not null unique,
  adresse text,
  cp_ville text,
  siren text,
  email text,
  tel text
);

create table if not exists public.mission_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null check (type in ('proforma', 'facture')),
  numero text not null unique,
  client_id uuid not null references public.mission_clients(id),
  mission_ids uuid[] not null,
  periode text not null,
  total numeric(10,2) not null,
  echeance date not null,
  modes text[] not null default '{}',
  statut text not null default 'emise',
  proforma_id uuid references public.mission_documents(id)
);

-- accès uniquement via les routes API admin (service role)
alter table public.mission_clients enable row level security;
alter table public.mission_documents enable row level security;
