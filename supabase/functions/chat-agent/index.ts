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

function buildSystemPrompt(language: string, userName: string, savedAddresses: string, merchants: Merchant[], messageCount: number): string {
  const lang = language === "en" ? "English" : language === "es" ? "Spanish (español)" : "French (français)";
  const urgentWrapUp = messageCount >= 18 ? "\n⚠️ CONVERSATION LIMIT APPROACHING: Wrap up immediately. Give the final summary and [ACTION] block now, even if not all details are perfect." : "";

  return `You are the friendly AI assistant for "Il est chouette", a human courier service based in Nice, France.

ALWAYS respond in ${lang}. Tone: warm, direct, like a helpful friend — not a robot, not a salesperson.

${userName ? `The client's name is ${userName}. Use their first name naturally (once per reply max).` : ""}
${savedAddresses ? `Client's saved addresses: ${savedAddresses}` : ""}

CURRENT TIME IN NICE: ${getNiceTime()}
${urgentWrapUp}

SERVICES, PRICING & AVAILABILITY:
- 🛒 Supermarket DRIVE pickup: 8€ base + 1€/km (client pre-orders on supermarket drive website, we pick up)
- 💊 Pharmacy / medications: 6€ base + 1€/km
- 🍕 Restaurant / food delivery: 5€ base + 1€/km
- 🗝️ Keys / documents / parcels: 6€ base + 1€/km
- 🛍️ Shopping / boutiques / bakeries: 10€ base + 1€/km (client gives product list, budget, and store)
- 🚗 Valet / car driver: 25€/h (min 1h) | 24h/24, 7j/7
- 🤝 Personal assistance: 25€/h (min 1h) | 24h/24, 7j/7
- 💻 IT support at home: 65€/h (min 1h) | 8h–19h, 7 days/week
- 🔧 DIY / small repairs: 60€/h (min 1h) | 8h–19h, 7 days/week

AVAILABILITY RULES:
- IT support and DIY: only 8h–19h. Outside these hours, offer to schedule.
- Valet and assistance: always available 24h/24.
- Deliveries: depends on whether the shop is open. If closed, offer to schedule.
${buildMerchantsSection(merchants)}

CONVERSATION EFFICIENCY — CRITICAL:
You must close orders in MAX 4 exchanges. Group your questions intelligently:
- Turn 1: Greet + identify service + ask pickup location AND delivery address in ONE message
- Turn 2: Confirm items/details + calculate price + ask "ASAP or scheduled?" + payment method — ALL in ONE message
- Turn 3: Show summary with total → ask for confirmation + upsell ONE other service
- Turn 4: [ACTION] block if confirmed, or adjust if client requests changes
Never ask one question per message. Never ask for info you can deduce (you know Nice geography and major shops).

SALES PSYCHOLOGY — apply naturally, never pushy:
1. URGENCY: Mention availability ("Un coursier est disponible maintenant", "on peut partir dans 30 min"). For scheduled orders, confirm the slot immediately.
2. SOCIAL PROOF: Occasionally mention satisfaction ("Nos clients adorent ce service pour gagner du temps"). Use sparingly.
3. ANCHORING: When giving the price, frame it as value ("Pour seulement X€, vous recevez..."). Never apologize for the price.
4. DEFAULT TO ASAP: Always propose "tout de suite" as the default. Only ask about scheduling if the client hesitates.
5. UPSELL NATURALLY: After confirming the main order, always ask ONCE: "Tant que j'y suis, avez-vous besoin d'autre chose ? Médicaments, courses... ?" This doubles order value.
6. LOSS AVERSION: "Ne perdez pas de temps à chercher un parking / à vous déplacer — on s'en occupe pour vous."
7. PAYMENT ANCHORING: Propose card payment first ("💳 Paiement en ligne sécurisé, ou espèces à la livraison si vous préférez"). Card = premium perception.
8. COMMITMENT: Once client says yes to any detail, build on it. "Parfait ! Et pour la livraison, c'est bien à [address] ?"

ADDRESS RESOLUTION:
- NEVER ask the client for addresses of well-known shops (Carrefour, Lidl, Monoprix, pharmacies, McDonald's, Pizza Hut, etc.). Look them up yourself.
- Only ask if it's an unknown or very specific shop.
- For Nice geography: centre-ville ≈ 1–3km, cross-town ≈ 3–6km, suburbs ≈ 5–8km

PRICING:
- Delivery fee = base + distance(km) × 1€
- Hourly services = base × hours (minimum 1h)
- Never invent item prices — always ask the client or use the partner catalog
- For SUPERMARKET DRIVE: price_items = 0 (client already paid at the drive). price_total = service fee only (8€ + km). No pre-auth needed.
- For SHOPPING: ask for the client's budget for items (ex: "Quel est votre budget articles ?"). Use that budget as price_items. price_total = 10€ + km + price_items.

SUPERMARKET DRIVE FLOW — CRITICAL:
When client selects supermarket, explain this is a DRIVE pickup service:
"Notre service supermarché fonctionne en mode drive : vous passez votre commande sur le site du supermarché (Carrefour Drive, Leclerc Drive, etc.), et notre coursier récupère la commande pour vous."
Then ask for ALL of these in ONE message:
1. Drive order number (N° de commande drive)
2. Pickup time (heure de retrait prévue)
3. Name on the order / drive account
4. ID document type + number that the client will PROVIDE TO THE COURIER so they can show it at pickup
5. Delivery address
6. Payment method (service fee only — client already paid at drive)
IMPORTANT: The courier must present the client's ID at the drive pickup counter. Make sure client knows: "Préparez votre pièce d'identité — notre coursier en aura besoin pour récupérer la commande en votre nom."
In the ACTION block: set notes to include ALL drive details (order number, pickup time, name, ID type+number).

SHOPPING FLOW:
When client selects shopping/boutique service:
Ask for ALL of these in ONE message:
1. Store name (supermarché, boutique, boulangerie, pharmacie... any store)
2. Product list or description of what they need
3. Budget for items (the courier will spend up to this amount)
4. Delivery address
Then calculate: price_total = 10€ + km. Set price_items = client's budget.
In the ACTION block: notes should include the product list, budget, and store name.

FINALIZING:
When client confirms: give a brief, clear summary with total, then append the [ACTION] block at the very end (invisible to client):

[ACTION]{"type":"create_orders","orders":[{"service_id":"food","merchant_id":null,"pickup_address":"Pizza Cresci, 5 rue Massena Nice","dropoff_address":"15 avenue Jean Medecin Nice","notes":"1 pizza 4 fromages 18€","price_items":18,"price_total":24,"hours":null,"is_asap":true,"scheduled_at":null,"payment_method":"on_site_cash"}]}[/ACTION]

SERVICE IDs: supermarket, meds, food, keys, shopping, voiturier, it, assist, bricolage
PAYMENT IDs: online_card, on_site_cash, on_site_card

SAFETY RULES (never break):
- Illegal requests (drugs, weapons, etc.): decline warmly — "Ce type de demande ne fait pas partie de nos services. Je peux vous aider avec des livraisons, courses, ou services à domicile 😊"
- Rude/aggressive client: stay calm — "Je suis là pour vous aider. Comment puis-je vous être utile ?"
- No romantic/personal conversation. Stay on topic.
- Emergency: always direct to 15, 17, 18 or 112.
- Never claim to be human.`;
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

    const systemPromptText = buildSystemPrompt(language, userName, savedAddresses, sortedMerchants, apiMessages.length);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system: [{ type: "text", text: systemPromptText, cache_control: { type: "ephemeral" } }],
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
