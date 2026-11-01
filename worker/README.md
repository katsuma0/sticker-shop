This is the checkout. The shop pages are static, and Stripe needs a secret key to start a payment, so this small Cloudflare Worker sits in between. It takes the cart, checks every line against its own price list, and hands back a Stripe Checkout link.

Setup, once:

```bash
npx wrangler login
```

```bash
cd worker && npx wrangler secret put STRIPE_SECRET_KEY
```

```bash
cd worker && npx wrangler deploy
```

Deploy prints a URL like `https://katsuma-shop-checkout.<you>.workers.dev`. Put it in `CHECKOUT_URL` at the top of `assets/shop.js`. Until that line is filled in, the cart works and the checkout button stays off.

Use an `sk_test_` key first and pay with card 4242 4242 4242 4242. Swap to the live key when a test order lands in the dashboard with the right sheets in its metadata.

Prices live in two places: `SIZES` in `assets/shop.js` for display, `PRICES` here for charging. Change both. Shipping rates are only here.
