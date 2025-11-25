import { createClient } from "@supabase/supabase-js";

/**
 * Client "admin" pour le backend (routes /api)
 * → utilise la SERVICE ROLE KEY (jamais côté navigateur)
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ⚠️ bien mettre la service role ici
  {
    auth: {
      persistSession: false,
    },
  }
);