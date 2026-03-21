import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

type MerchantProduct = { name: string; description?: string; price: number; category?: string };
type Merchant = { id: string; name: string; address: string; category: string; products?: MerchantProduct[] };

function buildMerchantsSection(merchants: Merchant[]): string {
  if (!merchants || merchants.length === 0) return "";

  const lines: string[] = [
    "",
    "PARTNER MERCHANTS (orders from these go through the platform):",
  ];

  for (const m of merchants) {
    lines.push(`\n🏪 ${m.name} — ${m.category} | ${m.address} | merchant_id: ${m.id}`);
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
          lines.push(`    • ${item.name} — ${item.price.toFixed(2)}€${item.description ? ` (${item.description})` : ""}`);
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
  );

  return lines.join("\n");
}

function buildSystemPrompt(language: string, userName: string, savedAddresses: string, merchants: Merchant[]): string {
  const lang = language === "en" ? "English" : language === "es" ? "Spanish (español)" : "French (français)";

  return `You are the friendly AI assistant for "Il est chouette", a human courier service based in Nice, France.

ALWAYS respond in ${lang}. Keep your tone warm, familiar, like a helpful neighbor — never formal or robotic.

${userName ? `The client's name is ${userName}. Use their first name naturally.` : ""}
${savedAddresses ? `Client's saved addresses: ${savedAddresses}` : ""}

SERVICES & PRICING:
- 🛒 Supermarket shopping: 8€ base + 1€/km
- 💊 Pharmacy / medications: 6€ base + 1€/km
- 🍕 Restaurant food delivery: 5€ base + 1€/km
- 🗝️ Keys / documents: 6€ base + 1€/km
- 🛍️ Shopping / parcels: 8€ base + 1€/km
- ⚡ Express urgent delivery: 12€ base + 1€/km
- 🚗 Valet / car driver: 20€/h (min 1h)
- 💻 IT support: 50€/h (min 1h)
- 🤝 Personal assistance / accompaniment: 20€/h (min 1h)
- 🔧 DIY / small repairs: 50€/h (min 1h)
${buildMerchantsSection(merchants)}

HOW TO GUIDE THE CONVERSATION:
1. Greet warmly, ask what they need today
2. Identify which service fits their request
3. For delivery services (supermarket, pharmacy, food, keys, shopping, express): ask the pickup address (shop/restaurant name + address)
4. Ask the delivery address — if they have saved addresses, suggest them by name
5. For food/pharmacy/shopping: ask what they want and the price they know (never invent prices)
6. For hourly services: ask how many hours they estimate
7. Estimate distance in Nice (typically 1–5 km between two points). Calculate total: base + km*1€ (or base*hours for hourly)
8. Ask: ASAP (within 30 min) or scheduled? If scheduled, ask date and time
9. Ask payment method: 💳 Online card, 💵 Cash on delivery, 📲 Card on delivery
10. Give a clear final summary with total price and confirm
11. When client confirms, end your message and append this JSON block at the very end:

[ACTION]{"type":"create_order","service_id":"food","merchant_id":"uuid-or-null","pickup_address":"Pizza Cresci, 5 rue Massena Nice","dropoff_address":"15 avenue Jean Medecin Nice","notes":"1 pizza 4 fromages 18€","price_items":18,"price_total":24,"hours":null,"is_asap":true,"scheduled_at":null,"payment_method":"on_site_cash"}[/ACTION]

SERVICE IDs to use: supermarket, meds, food, keys, shopping, express, voiturier, it, assist, bricolage
PAYMENT IDs: online_card, on_site_cash, on_site_card

RULES:
- Ask only 1–2 questions at a time, never overwhelm
- Use emojis sparingly to be warm but not childish
- Never invent item prices — always ask the client or use the partner catalog
- For Nice geography: centre-ville ≈ 1–3km, cross-town ≈ 3–6km, suburbs ≈ 5–8km
- Always show the [ACTION] block only when the client explicitly confirms "yes, proceed" or equivalent
- The [ACTION] block must be at the very end of the message and is invisible to the client`;
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
    const { messages = [], language = "fr", userName = "", savedAddresses = "", merchants = [] } = await req.json();

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
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: buildSystemPrompt(language, userName, savedAddresses, merchants),
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
