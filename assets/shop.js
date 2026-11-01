/* katsuma.ca/shop: the catalogue, the cart, and the three pages that
   read them. No framework; the cart lives in localStorage so it
   survives moving between pages. */
(function () {
  'use strict';

  // Leave empty until the checkout worker is deployed (see worker/README.md).
  // While empty, the cart works but the checkout button stays off, so
  // nobody can get halfway into paying for something that can't be paid for.
  var CHECKOUT_URL = '';

  // Display prices only. The worker keeps its own copy and charges from
  // that, so editing this in the browser changes nothing at checkout.
  var SIZES = {
    L: { label: '16 × 23 cm', price: 1400 },
    S: { label: '8 × 11 cm', price: 1000 }
  };

  // Categories and sheets follow the batches in the stamp-archive repo.
  var CATEGORIES = [
    { id: 'animals', name: 'Animals', note: '186 animal stamps over eight sheets, sorted roughly by what kind of animal.' },
    { id: 'fish', name: 'Fish', note: '223 fish stamps over ten sheets. The last one is the stamps that were an odd shape.' },
    { id: 'canada', name: 'Canada', note: '111 Canadian stamps in batches of about ten.' },
    { id: 'cactus', name: 'Cactus', note: '26 cactus and succulent stamps over two sheets.' }
  ];

  // img stays null until a photo is uploaded to /shop/stickers/images/.
  // Then set it to the filename, e.g. img: 'animals-01.jpg'.
  var SHEETS = [
    { id: 'animals-01', cat: 'animals', name: 'Marsupials', img: null },
    { id: 'animals-02', cat: 'animals', name: 'Big wild animals', img: null },
    { id: 'animals-03', cat: 'animals', name: 'Deer and antelope', img: null },
    { id: 'animals-04', cat: 'animals', name: 'Small mammals', img: null },
    { id: 'animals-05', cat: 'animals', name: 'Cattle', img: null },
    { id: 'animals-06', cat: 'animals', name: 'Horses, sheep and goats', img: null },
    { id: 'animals-07', cat: 'animals', name: 'Prehistoric, reptiles and birds', img: null },
    { id: 'animals-08', cat: 'animals', name: 'Triangle stamps', img: null },
    { id: 'fish-01', cat: 'fish', name: 'Tropical reef', img: null },
    { id: 'fish-02', cat: 'fish', name: 'Fish no. 2', img: null },
    { id: 'fish-03', cat: 'fish', name: 'Fish no. 3', img: null },
    { id: 'fish-04', cat: 'fish', name: 'Fish no. 4', img: null },
    { id: 'fish-05', cat: 'fish', name: 'Fish no. 5', img: null },
    { id: 'fish-06', cat: 'fish', name: 'Fish no. 6', img: null },
    { id: 'fish-07', cat: 'fish', name: 'Fish no. 7', img: null },
    { id: 'fish-08', cat: 'fish', name: 'Fish no. 8', img: null },
    { id: 'fish-09', cat: 'fish', name: 'Fish no. 9', img: null },
    { id: 'fish-10', cat: 'fish', name: 'Odd sizes', img: null },
    { id: 'canada-01', cat: 'canada', name: 'Canada no. 1', img: null },
    { id: 'canada-02', cat: 'canada', name: 'Canada no. 2', img: null },
    { id: 'canada-03', cat: 'canada', name: 'Canada no. 3', img: null },
    { id: 'canada-04', cat: 'canada', name: 'Canada no. 4', img: null },
    { id: 'canada-05', cat: 'canada', name: 'Canada no. 5', img: null },
    { id: 'canada-06', cat: 'canada', name: 'Canada no. 6', img: null },
    { id: 'canada-07', cat: 'canada', name: 'Canada no. 7', img: null },
    { id: 'canada-08', cat: 'canada', name: 'Canada no. 8', img: null },
    { id: 'canada-09', cat: 'canada', name: 'Canada no. 9', img: null },
    { id: 'canada-10', cat: 'canada', name: 'Canada no. 10', img: null },
    { id: 'canada-11', cat: 'canada', name: 'Canada no. 11', img: null },
    { id: 'canada-12', cat: 'canada', name: 'Canada no. 12', img: null },
    { id: 'cactus-01', cat: 'cactus', name: 'Cactus, square', img: null },
    { id: 'cactus-02', cat: 'cactus', name: 'Cactus, tall', img: null }
  ];

  var IMG_BASE = '/shop/stickers/images/';
  var KEY = 'katsuma-shop-cart';
  var MAX_QTY = 20;

  function byId(id) {
    for (var i = 0; i < SHEETS.length; i++) if (SHEETS[i].id === id) return SHEETS[i];
    return null;
  }
  function catName(id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i].name;
    return '';
  }
  function money(cents) { return '$' + (cents / 100).toFixed(2); }
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function sheetArt(s, cls) {
    var box = el('div', { class: cls });
    if (s.img) box.appendChild(el('img', { src: IMG_BASE + s.img, alt: s.name + ' sticker sheet', loading: 'lazy' }));
    else if (cls === 'sheet') box.appendChild(el('span', { class: 'blank', text: 'Photo soon' }));
    return box;
  }

  // ------------------------------------------------------------- cart
  // A line is { id, size, qty }. Anything that doesn't match the
  // catalogue (a sheet I've since removed, say) is dropped on load.
  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY)) || [];
      return raw.filter(function (l) { return byId(l.id) && SIZES[l.size] && l.qty > 0; });
    } catch (e) { return []; }
  }
  function save(lines) {
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch (e) {}
    updateCount(lines);
  }
  function add(id, size) {
    var lines = load();
    var hit = lines.filter(function (l) { return l.id === id && l.size === size; })[0];
    if (hit) hit.qty = Math.min(MAX_QTY, hit.qty + 1);
    else lines.push({ id: id, size: size, qty: 1 });
    save(lines);
  }
  function count(lines) { return lines.reduce(function (n, l) { return n + l.qty; }, 0); }
  function subtotal(lines) { return lines.reduce(function (n, l) { return n + l.qty * SIZES[l.size].price; }, 0); }
  function updateCount(lines) {
    var n = count(lines || load());
    document.querySelectorAll('[data-cart-count]').forEach(function (c) { c.textContent = n ? ' (' + n + ')' : ''; });
  }

  // -------------------------------------------------- stickers page
  function renderCatalogue(root) {
    var filters = document.getElementById('filters');
    var note = document.getElementById('cat-note');
    var current = 'all';

    function chip(id, label, n) {
      var b = el('button', { type: 'button', class: 'chip', 'data-cat': id, 'aria-pressed': 'false' });
      b.appendChild(document.createTextNode(label));
      b.appendChild(el('span', { class: 'n', text: String(n) }));
      b.addEventListener('click', function () { select(id, true); });
      return b;
    }
    filters.appendChild(chip('all', 'All', SHEETS.length));
    CATEGORIES.forEach(function (c) {
      filters.appendChild(chip(c.id, c.name, SHEETS.filter(function (s) { return s.cat === c.id; }).length));
    });

    SHEETS.forEach(function (s) {
      var group = 'size-' + s.id;
      var sizes = el('fieldset', { class: 'sizes' }, [el('legend', { text: 'Size for ' + s.name })]);
      Object.keys(SIZES).forEach(function (k, i) {
        var input = el('input', { type: 'radio', name: group, value: k });
        if (i === 0) input.checked = true;
        var lab = el('label', {}, [input, el('b', { text: money(SIZES[k].price) })]);
        lab.appendChild(document.createTextNode(SIZES[k].label));
        sizes.appendChild(lab);
      });
      var msg = el('p', { class: 'added', 'aria-live': 'polite' });
      var btn = el('button', { type: 'button', class: 'btn wide', text: 'Add to cart' });
      btn.addEventListener('click', function () {
        var size = sizes.querySelector('input:checked').value;
        add(s.id, size);
        msg.innerHTML = '';
        msg.appendChild(document.createTextNode('Added ' + SIZES[size].label + '. '));
        msg.appendChild(el('a', { href: '/shop/cart/', text: 'View cart' }));
      });
      root.appendChild(el('article', { class: 'card', 'data-cat': s.cat }, [
        sheetArt(s, 'sheet'),
        el('h3', { text: s.name }),
        el('p', { class: 'cat', text: catName(s.cat) }),
        sizes, btn, msg
      ]));
    });

    // the category lives in the hash so /shop/stickers/#fish can be shared
    function select(id, push) {
      if (id !== 'all' && !catName(id)) id = 'all';
      current = id;
      filters.querySelectorAll('.chip').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-cat') === id));
      });
      root.querySelectorAll('.card').forEach(function (c) {
        c.hidden = id !== 'all' && c.getAttribute('data-cat') !== id;
      });
      var c = CATEGORIES.filter(function (x) { return x.id === id; })[0];
      note.textContent = c ? c.note : '';
      if (push) history.replaceState(null, '', id === 'all' ? location.pathname : '#' + id);
    }
    window.addEventListener('hashchange', function () { select(location.hash.slice(1) || 'all'); });
    select(location.hash.slice(1) || 'all');
  }

  // ------------------------------------------------------ cart page
  function renderCart(root) {
    var list = document.getElementById('lines');
    var sub = document.getElementById('subtotal');
    var go = document.getElementById('checkout');
    var status = document.getElementById('checkout-status');

    function draw() {
      var lines = load();
      list.innerHTML = '';
      if (!lines.length) {
        list.appendChild(el('p', { class: 'empty' }, [
          document.createTextNode('Nothing in here yet. '),
          el('a', { href: '/shop/stickers/', text: 'The stickers are this way.' })
        ]));
      }
      lines.forEach(function (l, i) {
        var s = byId(l.id);
        function step(d) {
          return function () {
            var all = load();
            all[i].qty = Math.max(0, Math.min(MAX_QTY, all[i].qty + d));
            save(all.filter(function (x) { return x.qty > 0; }));
            draw();
          };
        }
        var minus = el('button', { type: 'button', 'aria-label': 'One fewer', text: '−' });
        var plus = el('button', { type: 'button', 'aria-label': 'One more', text: '+' });
        minus.addEventListener('click', step(-1));
        plus.addEventListener('click', step(1));
        var remove = el('button', { type: 'button', class: 'linkish', text: 'Remove' });
        remove.addEventListener('click', step(-l.qty));
        list.appendChild(el('div', { class: 'line' }, [
          sheetArt(s, 'thumb'),
          el('div', { class: 'what' }, [
            el('div', { text: s.name }),
            el('span', { class: 'meta', text: catName(s.cat) + ' · ' + SIZES[l.size].label }),
            el('div', { class: 'qty' }, [minus, el('span', { text: String(l.qty), 'aria-label': 'Quantity' }), plus])
          ]),
          el('div', { class: 'right' }, [
            el('div', { text: money(l.qty * SIZES[l.size].price) }),
            remove
          ])
        ]));
      });
      sub.textContent = money(subtotal(lines));
      go.disabled = !lines.length || !CHECKOUT_URL;
      if (!CHECKOUT_URL) status.textContent = "Checkout isn't switched on yet. Your cart will keep until it is.";
    }

    go.addEventListener('click', function () {
      var lines = load();
      if (!lines.length || !CHECKOUT_URL) return;
      go.disabled = true;
      status.textContent = 'Opening checkout…';
      fetch(CHECKOUT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: lines })
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (!d.url) throw new Error(d.error || 'no url');
        location.href = d.url;
      }).catch(function () {
        go.disabled = false;
        status.textContent = "Checkout didn't open. Nothing was charged. Try again in a minute.";
      });
    });
    draw();
  }

  // ---------------------------------------------------- thanks page
  // Stripe only sends people here after a paid session, so the cart can go.
  function renderThanks() { save([]); }

  document.addEventListener('DOMContentLoaded', function () {
    var cat = document.getElementById('catalogue');
    var cart = document.getElementById('cart');
    if (cat) renderCatalogue(cat);
    if (cart) renderCart(cart);
    if (document.getElementById('thanks')) renderThanks();
    updateCount();
  });
})();
