import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/app/_lib/supabaseAdmin";

async function isAdmin() {
  const jar = await cookies();
  const token = process.env.ADMIN_COOKIE_TOKEN;
  return !!token && jar.get("iec_admin_auth")?.value === token;
}

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function nextNumero(type: "proforma" | "facture") {
  const prefix = `${type === "proforma" ? "PRO" : "FAC"}-${new Date().getFullYear()}-`;
  const { data } = await supabaseAdmin
    .from("mission_documents")
    .select("numero")
    .like("numero", `${prefix}%`)
    .order("numero", { ascending: false })
    .limit(1);
  const last = data?.[0]?.numero ? parseInt(data[0].numero.slice(prefix.length)) : 0;
  return prefix + String(last + 1).padStart(3, "0");
}

function plus30() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  if (!(await isAdmin())) return fail("Non autorisé", 401);
  const id = new URL(req.url).searchParams.get("doc");

  if (id) {
    const { data: doc } = await supabaseAdmin.from("mission_documents").select("*").eq("id", id).single();
    if (!doc) return fail("Document introuvable", 404);
    const [{ data: client }, { data: missions }] = await Promise.all([
      supabaseAdmin.from("mission_clients").select("*").eq("id", doc.client_id).single(),
      supabaseAdmin.from("edl_missions").select("*").in("id", doc.mission_ids).order("date_mission"),
    ]);
    return NextResponse.json({ doc, client, missions: missions ?? [] });
  }

  const [{ data: clients }, { data: documents }] = await Promise.all([
    supabaseAdmin.from("mission_clients").select("*").order("nom"),
    supabaseAdmin.from("mission_documents").select("*").order("created_at", { ascending: false }),
  ]);
  return NextResponse.json({ clients: clients ?? [], documents: documents ?? [] });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return fail("Non autorisé", 401);
  const body = await req.json().catch(() => null);
  if (!body?.action) return fail("Requête invalide");

  switch (body.action) {
    case "client_save": {
      const c = body.client ?? {};
      const row = {
        nom: str(c.nom, 150),
        adresse: str(c.adresse) || null,
        cp_ville: str(c.cp_ville) || null,
        siren: str(c.siren, 20) || null,
        email: str(c.email, 150) || null,
        tel: str(c.tel, 30) || null,
      };
      if (!row.nom) return fail("Nom du client obligatoire");
      const { error } = c.id
        ? await supabaseAdmin.from("mission_clients").update(row).eq("id", c.id)
        : await supabaseAdmin.from("mission_clients").insert(row);
      return error ? fail(error.message) : NextResponse.json({ ok: true });
    }

    case "doc_create": {
      const type = body.type === "facture" ? "facture" : "proforma";
      const nom = str(body.client_nom, 150);
      const ids: string[] = Array.isArray(body.mission_ids) ? body.mission_ids.filter((x: unknown) => typeof x === "string") : [];
      if (!nom || !ids.length) return fail("Client et missions obligatoires");

      let { data: client } = await supabaseAdmin.from("mission_clients").select("id").eq("nom", nom).maybeSingle();
      if (!client) {
        const ins = await supabaseAdmin.from("mission_clients").insert({ nom }).select("id").single();
        if (ins.error) return fail(ins.error.message);
        client = ins.data;
      }

      const { data: missions } = await supabaseAdmin.from("edl_missions").select("montant_ht").in("id", ids);
      const total = (missions ?? []).reduce((s, m) => s + Number(m.montant_ht), 0);

      const { data, error } = await supabaseAdmin.from("mission_documents").insert({
        type,
        numero: await nextNumero(type),
        client_id: client.id,
        mission_ids: ids,
        periode: str(body.periode, 7),
        total,
        echeance: plus30(),
      }).select("id").single();
      return error ? fail(error.message) : NextResponse.json({ id: data.id });
    }

    case "doc_update": {
      const patch: Record<string, unknown> = {};
      if (Array.isArray(body.modes)) patch.modes = body.modes.filter((x: unknown) => typeof x === "string").slice(0, 6);
      if (/^\d{4}-\d{2}-\d{2}$/.test(body.echeance ?? "")) patch.echeance = body.echeance;
      if (["emise", "payee"].includes(body.statut)) patch.statut = body.statut;
      const { error } = await supabaseAdmin.from("mission_documents").update(patch).eq("id", body.id);
      return error ? fail(error.message) : NextResponse.json({ ok: true });
    }

    case "doc_validate": {
      const { data: pro } = await supabaseAdmin.from("mission_documents").select("*").eq("id", body.id).single();
      if (!pro || pro.type !== "proforma") return fail("Proforma introuvable", 404);
      const { data: existing } = await supabaseAdmin.from("mission_documents").select("id").eq("proforma_id", pro.id).maybeSingle();
      if (existing) return NextResponse.json({ id: existing.id });

      const { data, error } = await supabaseAdmin.from("mission_documents").insert({
        type: "facture",
        numero: await nextNumero("facture"),
        client_id: pro.client_id,
        mission_ids: pro.mission_ids,
        periode: pro.periode,
        total: pro.total,
        echeance: plus30(),
        modes: pro.modes,
        proforma_id: pro.id,
      }).select("id").single();
      if (error) return fail(error.message);
      await supabaseAdmin.from("mission_documents").update({ statut: "validee" }).eq("id", pro.id);
      return NextResponse.json({ id: data.id });
    }
  }
  return fail("Action inconnue");
}
