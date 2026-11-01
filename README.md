The shop at katsuma.ca/shop. Sticker sheets now, sewing later.

This repo has to be named `shop` for GitHub Pages to serve it at katsuma.ca/shop/, because a project site lives at the repo's name. Every path in it starts with `/shop/`.

- `index.html` is the shop front, with a door to each category.
- `stickers/` is the catalogue. Sheets and categories follow the batches in the stamp-archive repo: animals, fish, Canada and cactus.
- `cart/` and `thanks/` are the cart and the page Stripe sends people back to.
- `sewing/` says nothing is for sale yet, which is true.
- `assets/shop.js` holds the catalogue, the cart and the checkout URL. `assets/shop.css` is the one stylesheet, with the same colours as the main site.
- `worker/` is the Cloudflare Worker that starts a Stripe Checkout. See its README.

No build step. To add a photo, drop `animals-01.jpg` in `stickers/images/` and set `img: 'animals-01.jpg'` on that sheet in `assets/shop.js`. Photos sit in a 16 by 23 frame, so a straight-on shot of the sheet fits best.

To preview locally, serve the folder above this one so the `/shop/` paths resolve:

```bash
mkdir -p /tmp/site && ln -sfn "$PWD" /tmp/site/shop && python3 -m http.server -d /tmp/site 8000
```

Then open http://localhost:8000/shop/.
