-- edl_missions devient la table générique des missions spécifiques
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.edl_missions'::regclass and contype = 'c'
  loop
    execute format('alter table public.edl_missions drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.edl_missions
  alter column surface_m2 drop not null,
  alter column meuble drop not null,
  alter column fd_sup drop not null,
  alter column type_bien drop not null,
  alter column adresse drop not null;
