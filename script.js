const products = [
  { id: 1, name: "T-Shirt", price: 15.00, desc: "Comfortable cotton tee" },
  { id: 2, name: "Shoes", price: 40.00, desc: "Stylish running shoes" },
  { id: 3, name: "Hat", price: 10.00, desc: "Classic baseball cap" },
  { id: 4, name: "Socks", price: 5.50, desc: "Pair of cozy socks" }
];

function getCart() { return JSON.parse(localStorage.getItem('cart')) || []; }
function setCart(cart) { localStorage.setItem('cart', JSON.stringify(cart)); updateCartCount(); }

function updateCartCount() {
  const countEls = document.querySelectorAll('#cart-count');
  const totalItems = getCart().length;
  countEls.forEach(el => el.textContent = totalItems);
}

function loadProducts() {
  const list = document.getElementById('product-list');
  if (!list) return;
  list.innerHTML = '';
  products.forEach(p => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <h3>${p.name}</h3>
      <p>${p.desc}</p>
      <p><strong>R${p.price.toFixed(2)}</strong></p>
      <div class="actions">
        <button class="btn" data-id="${p.id}">Add to Cart</button>
      </div>`;
    list.appendChild(div);
  });
  list.addEventListener('click', e => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    addToCart(Number(btn.dataset.id));
  });
}

function addToCart(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  const cart = getCart();
  cart.push(product);
  setCart(cart);
}

function loadCartPage() {
  const container = document.getElementById('cart-contents');
  if (!container) return;
  const cart = getCart();
  const summaryWrap = document.getElementById('cart-summary');
  const emptyMsg = document.getElementById('empty-msg');
  container.innerHTML = '';

  if (cart.length === 0) {
    emptyMsg.classList.remove('hidden');
    summaryWrap.classList.add('hidden');
    return;
  }

  emptyMsg.classList.add('hidden');
  summaryWrap.classList.remove('hidden');

  cart.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <div><strong>${item.name}</strong><br><small>R${item.price.toFixed(2)}</small></div>
      <div><button data-idx="${idx}" class="btn ghost">Remove</button></div>`;
    container.appendChild(row);
  });

  container.addEventListener('click', e => {
    const btn = e.target.closest('button[data-idx]');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const newCart = getCart();
    newCart.splice(idx, 1);
    setCart(newCart);
    loadCartPage();
  });

  const subtotal = cart.reduce((s, it) => s + it.price, 0);
  document.getElementById('cart-subtotal').textContent = subtotal.toFixed(2);
}

// **FIXED: Now includes GTM Data Layer Push and simple summary rendering**
function loadCheckoutPage() {
    const summaryEl = document.getElementById('checkout-summary');
    if (!summaryEl) return;
    const cart = getCart();
    const noCart = document.getElementById('no-cart');
    const checkoutCard = document.getElementById('checkout-card');

    if (cart.length === 0) {
        checkoutCard.classList.add('hidden');
        noCart.classList.remove('hidden');
        return;
    }

    let html = '<ul>';
    cart.forEach(it => html += `<li>${it.name} — R${it.price.toFixed(2)}</li>`);
    html += '</ul>';
    const total = cart.reduce((s, it) => s + it.price, 0);
    html += `<p><strong>Total: R${total.toFixed(2)}</strong></p>`;
    summaryEl.innerHTML = html;

    document.getElementById('checkout-form').addEventListener('submit', e => {
        e.preventDefault();
        const name = document.getElementById('fullname').value.trim();
        const email = document.getElementById('email').value.trim();
        const addr = document.getElementById('address').value.trim();
        if (!name || !email || !addr) return alert('Fill in all fields');

        // --- GATHER DATA & CONSOLIDATE ITEMS FOR GTM/IMPACT.COM ---
        const orderId = "ORDER_" + Date.now();
        
        // Consolidate items into the required GTM/e-commerce array format
        const consolidatedItems = cart.reduce((acc, item) => {
            let existing = acc.find(i => i.sku === ('sku-' + item.id)); 
            if (!existing) {
                existing = { 
                    'sku': 'sku-' + item.id,
                    'name': item.name, 
                    'category': 'Apparel',
                    'price': item.price, // Unit price
                    'quantity': 0
                };
                acc.push(existing);
            }
            existing.quantity += 1;
            return acc;
        }, []);


        // --- PUSH TRANSACTION DATA LAYER (FIRES GTM CONVERSION TAG) ---
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            'event': 'transaction', 
            'transactionId': orderId,
            'transactionTotal': total.toFixed(2),
            'currencyCode': 'ZAR',
            'orderDiscount': 0.00,
            'customerEmail': 'iuasbgifjlpdblbshpi', // HASH THIS VALUE IN PRODUCTION!
            'customerId': 'customer1',
            'customerStatus' : 'NEW',
            'transactionProducts': consolidatedItems 
        });
        
        // --- FINAL ACTIONS (Must happen AFTER the dataLayer push) ---
        localStorage.removeItem('cart');
        updateCartCount();
        location.href = `thankyou.html?name=${encodeURIComponent(name)}`;
    });
}

function loadThankYouPage() {
  const p = document.getElementById('thanks-msg');
  if (!p) return;
  const name = new URLSearchParams(location.search).get('name');
  p.textContent = name
    ? `Thanks, ${decodeURIComponent(name)}! Your order has been placed.`
    : 'Thanks! Your order has been placed.';
}

// **FIXED INITIALIZATION BLOCK: Prevents errors by isolating page logic**
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount(); // Runs on all pages

  // Only run these functions if their unique container elements exist
  if (document.getElementById('product-list')) {
    loadProducts();
  }

  if (document.getElementById('cart-contents')) {
    loadCartPage();
  }
  
  if (document.getElementById('checkout-form')) {
    loadCheckoutPage();
  }
  
  if (document.getElementById('thanks-msg')) {
    loadThankYouPage();
  }
});
