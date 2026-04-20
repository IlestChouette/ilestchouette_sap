import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

type MerchantProduct = { name: string; description?: string; price: number; category?: string; is_featured?: boolean };
type Merchant = { id: string; name: string; address: string; category: string; opening_hours?: string; closed_dates?: string[]; products?: MerchantProduct[]; distance_km?: number };

function getNiceTime(): string {
  return new Date().toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isMerchantClosedToday(m: Merchant): boolean {
  if (!m.closed_dates || m.closed_dates.length === 0) return false;
  const today = new Date().toLocaleDateString("sv"); // YYYY-MM-DD
  return m.closed_dates.includes(today);
}

function buildMerchantsSection(merchants: Merchant[]): string {
  if (!merchants || merchants.length === 0) return "";

  const lines: string[] = [
    "",
    "PARTNER MERCHANTS (orders from these go through the platform):",
    "NOTE: merchants are listed nearest-first when client location is known. Always propose the first matching merchant as primary option, and offer a second random one if asked.",
  ];

  for (const m of merchants) {
    const hours = m.opening_hours ? ` | Horaires : ${m.opening_hours}` : "";
    const dist = m.distance_km != null ? ` | ~${m.distance_km.toFixed(1)} km` : "";
    const closedToday = isMerchantClosedToday(m) ? " | ⚠️ FERMÉ AUJOURD'HUI (fermeture exceptionnelle)" : "";
    lines.push(`\n🏪 ${m.name} — ${m.category} | ${m.address}${hours}${dist}${closedToday} | merchant_id: ${m.id}`);
    if (m.products && m.products.length > 0) {
      const grouped: Record<string, MerchantProduct[]> = {};
      for (const p of m.products) {
        const cat = p.category ?? "Menu";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(p);
      }
      for (const [cat, items] of Object.entries(grouped)) {
        lines.push(`  ${cat}:`);
        for (const item of items) {
          // Feature 3: mark featured items
          const star = item.is_featured ? " ⭐" : "";
          lines.push(`    •${star} ${item.name} — ${item.price.toFixed(2)}€${item.description ? ` (${item.description})` : ""}`);
        }
      }
    }
  }

  lines.push(
    "",
    "When a client wants to order from a partner merchant:",
    "- Use the exact product names and prices from the catalog above (never invent prices)",
    "- Set pickup_address to the merchant's address",
    "- Set service_id to 'food'",
    "- Include merchant_id in the ACTION block",
    "- Calculate price_items as the sum of ordered items, price_total = price_items + delivery fee (5€ base + 1€/km)",
    "- If the merchant is currently closed based on their opening hours or has an exceptional closure today, warn the client and suggest scheduling the order for when they open",
    "- Items marked ⭐ are featured/recommended by the merchant — proactively suggest them when the client asks for recommendations",
    "- When multiple merchants serve the same category, prefer the nearest one (listed first). If the client asks for alternatives, offer a different merchant from the list.",
  );

  return lines.join("\n");
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function sortMerchantsByDistance(merchants: Merchant[], clientLat?: number, clientLon?: number): Merchant[] {
  if (clientLat == null || clientLon == null) return merchants;
  return merchants
    .map((m: any) => ({
      ...m,
      distance_km: (m.latitude != null && m.longitude != null)
        ? haversineKm(clientLat, clientLon, m.latitude, m.longitude)
        : undefined,
    }))
    .sort((a: Merchant, b: Merchant) => {
      if (a.distance_km == null && b.distance_km == null) return 0;
      if (a.distance_km == null) return 1;
      if (b.distance_km == null) return -1;
      return a.distance_km - b.distance_km;
    });
}

function buildSystemPrompt(language: string, userName: string, savedAddresses: string, merchants: Merchant[]): string {
  const lang = language === "en" ? "English" : language === "es" ? "Spanish (español)" : "French (français)";

  return `You are the friendly AI assistant for "Il est chouette", a human courier service based in Nice, France.

ALWAYS respond in ${lang}. Keep your tone warm, familiar, like a helpful neighbor — never formal or robotic.

${userName ? `The client's name is ${userName}. Use their first name naturally.` : ""}
${savedAddresses ? `Client's saved addresses: ${savedAddresses}` : ""}

CURRENT TIME IN NICE: ${getNiceTime()}

SERVICES, PRICING & AVAILABILITY HOURS:
- 🛒 Supermarket shopping: 8€ base + 1€/km | Hours: depends on the shop's opening hours
- 💊 Pharmacy / medications: 6€ base + 1€/km | Hours: depends on the pharmacy's opening hours
- 🍕 Restaurant / food delivery: 5€ base + 1€/km | Hours: depends on the restaurant's opening hours
- 🗝️ Keys / documents / parcels: 6€ base + 1€/km | Hours: depends on the shop's opening hours
- 🛍️ Shopping / boutiques: 8€ base + 1€/km | Hours: depends on the shop's opening hours
- ⚡ Express urgent delivery: 12€ base + 1€/km | Hours: depends on availability
- 🚗 Valet / car driver: 20€/h (min 1h) | Hours: 24h/24, 7j/7
- 🤝 Personal assistance / accompaniment: 20€/h (min 1h) | Hours: 24h/24, 7j/7
- 💻 IT support at home: 50€/h (min 1h) | Hours: 8h–19h, 7 days a week
- 🔧 DIY / small repairs: 50€/h (min 1h) | Hours: 8h–19h, 7 days a week

AVAILABILITY RULES:
- For IT support and DIY/bricolage: only available 8h–19h. If the client requests outside these hours, apologize and offer to schedule for the next available slot.
- For valet and personal assistance: always available 24h/24, 7j/7.
- For deliveries (supermarket, pharmacy, food, shopping): availability depends on whether the shop/restaurant is open. Always ask the client if the shop is currently open, or warn them if you know the merchant's hours and they are closed. Suggest scheduling if closed.
- For partner merchants: check their opening hours listed below. If currently closed, warn the client and suggest scheduling when they open.
${buildMerchantsSection(merchants)}

HOW TO GUIDE THE CONVERSATION:
1. Always start with "Bonjour !" (never "Salut" or informal greetings). Ask warmly what they need today.
2. Identify which service fits their request
3. For delivery services (supermarket, pharmacy, food, keys, shopping, express): ask the shop/restaurant name. Use your knowledge of Nice to find the address yourself — NEVER ask the client for the full address if you already know where the place is. Only ask for the address if you genuinely don't know the location (e.g. a very small or unknown shop). For common chains (Carrefour, Lidl, Monoprix, Auchan, pharmacies, McDonald's, etc.) and well-known Nice establishments, look up the address yourself.
4. Ask the delivery address — if they have saved addresses, suggest them by name
5. For food/pharmacy/shopping: ask what they want and the price they know (never invent prices)
6. For hourly services: ask how many hours they estimate
7. Estimate distance in Nice (typically 1–5 km between two points). Calculate total: base + km*1€ (or base*hours for hourly)
8. Ask: ASAP (within 30 min) or scheduled? If scheduled, ask date and time
9. Ask payment method: 💳 Online card, 💵 Cash on delivery, 📲 Card on delivery
10. Before giving the final summary, ALWAYS ask: "Souhaitez-vous ajouter autre chose ? Un autre article ou un autre service ?" — collect everything before finalizing
11. Give a clear final summary listing ALL services/items with their individual price and a grand total, then ask for payment method and confirmation
12. When client confirms everything, end your message and append this JSON block at the very end:

[ACTION]{"type":"create_orders","orders":[{"service_id":"food","merchant_id":null,"pickup_address":"Pizza Cresci, 5 rue Massena Nice","dropoff_address":"15 avenue Jean Medecin Nice","notes":"1 pizza 4 fromages 18€","price_items":18,"price_total":24,"hours":null,"is_asap":true,"scheduled_at":null,"payment_method":"on_site_cash"},{"service_id":"meds","merchant_id":null,"pickup_address":"Pharmacie Centrale, 10 rue de France Nice","dropoff_address":"15 avenue Jean Medecin Nice","notes":"Doliprane 1000mg","price_items":5,"price_total":11,"hours":null,"is_asap":true,"scheduled_at":null,"payment_method":"on_site_cash"}]}[/ACTION]

— If the client only has ONE service, still use the same format with a single item in the "orders" array.

SERVICE IDs to use: supermarket, meds, food, keys, shopping, express, voiturier, it, assist, bricolage
PAYMENT IDs: online_card, on_site_cash, on_site_card

RULES:
- Ask only 1–2 questions at a time, never overwhelm
- Use emojis sparingly to be warm but not childish
- Never invent item prices — always ask the client or use the partner catalog
- For Nice geography: centre-ville ≈ 1–3km, cross-town ≈ 3–6km, suburbs ≈ 5–8km
- Always show the [ACTION] block only when the client explicitly confirms "yes, proceed" or equivalent
- The [ACTION] block must be at the very end of the message and is invisible to the client

SAFETY RULES (STRICT — never break these):
- If the client asks for anything illegal (drugs, weapons, prostitution, stolen goods, etc.), politely but firmly decline and explain you only handle legal services. Never judge the person, just redirect: "Je suis désolé, ce type de demande ne fait pas partie de nos services. Je peux vous aider avec des livraisons, courses, ou services à domicile légaux 😊"
- If the client is rude, aggressive, or uses inappropriate language, stay calm and professional. Gently redirect: "Je suis là pour vous aider avec nos services. Comment puis-je vous être utile ?"
- Never engage with romantic, sexual, or personal conversation. Stay on-topic.
- If someone seems to be in danger or emergency, always suggest calling emergency services (15, 17, 18 or 112) and do not try to handle emergencies yourself.
- Never pretend to be a human. If asked "are you a human?", answer honestly that you are an AI assistant for Il est Chouette.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { messages = [], language = "fr", userName = "", savedAddresses = "", merchants = [], clientLat, clientLon } = await req.json();
    const sortedMerchants = sortMerchantsByDistance(merchants, clientLat, clientLon);

    const apiMessages = messages.length > 0
      ? messages
      : [{ role: "user", content: "Bonjour" }];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: buildSystemPrompt(language, userName, savedAddresses, sortedMerchants),
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic ${response.status}: ${err}`);
    }

    const data = await response.json();
    const fullText: string = data.content[0]?.text ?? "";

    const actionMatch = fullText.match(/\[ACTION\]([\s\S]*?)\[\/ACTION\]/);
    let action = null;
    const reply = fullText.replace(/\[ACTION\][\s\S]*?\[\/ACTION\]/, "").trim();

    if (actionMatch) {
      try {
        action = JSON.parse(actionMatch[1].trim());
      } catch {
        // malformed JSON, ignore
      }
    }

    return new Response(JSON.stringify({ reply, action }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
