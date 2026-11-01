// Cloudflare Worker that turns a cart into a Stripe Checkout session.
// The shop is static, and Stripe needs a secret key to create a session,
// so this is the one piece that runs on a server. It holds its own price
// list on purpose: the browser says what and how many, never how much.
//
// Secrets and vars (set with wrangler, see README.md):
//   STRIPE_SECRET_KEY   sk_live_... or sk_test_...
//   ALLOWED_ORIGIN      https://katsuma.ca

const PRICES = { L: 1400, S: 1000 };            // cents CAD
const SIZE_LABEL = { L: '16 × 23 cm', S: '8 × 11 cm' };
const SHIPPING = [
  // Check these against Canada Post before going live. A 16 × 23 cm sheet
  // is wider than standard Lettermail allows, so it ships as oversized.
  { name: 'Canada, Canada Post', amount: 400, min: 3, max: 8 },
  { name: 'United States, Canada Post', amount: 800, min: 7, max: 15 }
];
const SHEET_ID = /^(animals|fish|canada|cactus)-\d{2}$/;
const MAX_LINES = 30;
const MAX_QTY = 20;

export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    const reply = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return reply({ error: 'POST only' }, 405);

    let items;
    try { items = (await req.json()).items; } catch { return reply({ error: 'bad json' }, 400); }
    if (!Array.isArray(items) || !items.length || items.length > MAX_LINES) return reply({ error: 'bad cart' }, 400);
    for (const it of items) {
      if (!SHEET_ID.test(it.id) || !PRICES[it.size] || !Number.isInteger(it.qty) || it.qty < 1 || it.qty > MAX_QTY) {
        return reply({ error: 'bad item' }, 400);
      }
    }

    const f = new URLSearchParams();
    f.set('mode', 'payment');
    f.set('currency', 'cad');
    f.set('success_url', env.ALLOWED_ORIGIN + '/shop/thanks/');
    f.set('cancel_url', env.ALLOWED_ORIGIN + '/shop/cart/');
    f.append('shipping_address_collection[allowed_countries][]', 'CA');
    f.append('shipping_address_collection[allowed_countries][]', 'US');

    items.forEach((it, i) => {
      const p = `line_items[${i}]`;
      f.set(`${p}[quantity]`, String(it.qty));
      f.set(`${p}[price_data][currency]`, 'cad');
      f.set(`${p}[price_data][unit_amount]`, String(PRICES[it.size]));
      f.set(`${p}[price_data][product_data][name]`, `Sticker sheet ${it.id}, ${SIZE_LABEL[it.size]}`);
      f.set(`${p}[price_data][product_data][metadata][sheet]`, it.id);
      f.set(`${p}[price_data][product_data][metadata][size]`, it.size);
    });

    SHIPPING.forEach((s, i) => {
      const p = `shipping_options[${i}][shipping_rate_data]`;
      f.set(`${p}[type]`, 'fixed_amount');
      f.set(`${p}[display_name]`, s.name);
      f.set(`${p}[fixed_amount][amount]`, String(s.amount));
      f.set(`${p}[fixed_amount][currency]`, 'cad');
      f.set(`${p}[delivery_estimate][minimum][unit]`, 'business_day');
      f.set(`${p}[delivery_estimate][minimum][value]`, String(s.min));
      f.set(`${p}[delivery_estimate][maximum][unit]`, 'business_day');
      f.set(`${p}[delivery_estimate][maximum][value]`, String(s.max));
    });

    // the packing list, readable in the Stripe dashboard without opening line items
    f.set('metadata[order]', items.map(it => `${it.id}:${it.size}x${it.qty}`).join(' ').slice(0, 500));

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: f
    });
    const d = await r.json();
    if (!r.ok) return reply({ error: 'stripe said no' }, 502);
    return reply({ url: d.url });
  }
};
