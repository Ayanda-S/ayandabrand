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
  //alert(product.name + " added to cart");
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

    // ... (HTML rendering code for summary) ...

    document.getElementById('checkout-form').addEventListener('submit', e => {
        e.preventDefault();
        const name = document.getElementById('fullname').value.trim();
        const email = document.getElementById('email').value.trim();
        const addr = document.getElementById('address').value.trim();
        if (!name || !email || !addr) return alert('Fill in all fields');

        // --- 1. GATHER DATA & CONSOLIDATE ITEMS ---
        const total = cart.reduce((s, it) => s + it.price, 0);
        const orderId = "ORDER_" + Date.now(); // Generate a unique ID for the order
        
        // Consolidate items for GTM e-commerce array
        const consolidatedItems = cart.reduce((acc, item) => {
            let existing = acc.find(i => i.sku === ('sku-' + item.id)); // Use SKU to group
            if (!existing) {
                existing = { 
                    'sku': 'sku-' + item.id, // Your identifier
                    'name': item.name, 
                    'category': 'E-commerce', // Replace with real category if available
                    'price': item.price,
                    'quantity': 0
                };
                acc.push(existing);
            }
            existing.quantity += 1;
            return acc;
        }, []);


        // --- 2. PUSH TRANSACTION DATA LAYER (IMPACT.COM FORMAT) ---
        // NOTE: window.dataLayer must exist (it's initialized in your <head>)
        window.dataLayer = window.dataLayer || [];
        if (window.dataLayer) {
            window.dataLayer.push({
                // This is the required 'event' to trigger the GTM tag
                'event': 'transaction', 

                // Order Level Details
                'transactionId': orderId,
                'transactionTotal': total.toFixed(2),
                'currencyCode': 'ZAR', // Use your local currency or USD if required
                'orderDiscount': 0,
                // Customer Details (Use the keys GTM is looking for)
                // NOTE: HASHING IS CRITICAL. You must implement SHA1 hashing of the email
                //'customerEmailSha1': '15as241f578de7501Gd9052H1', 
                'customerId': 'customer1', // Get this from your logged-in user session
                'customerStatus' : 'NEW'
                // Item Level Details (The consolidated array)
                'transactionProducts': consolidatedItems 
            });
            console.log("Data Layer Pushed Successfully for Order: " + orderId);

        } else {
            console.error("dataLayer object is not available.");
        }
        
        // --- 3. FINAL ACTIONS (Must happen AFTER the dataLayer push) ---
        localStorage.removeItem('cart');
        updateCartCount();
        location.href = `thankyou.html?name=${encodeURIComponent(name)}`;
    });
}
/*function loadCheckoutPage() {
    const summaryEl = document.getElementById('checkout-summary');
    if (!summaryEl) return;
    const cart = getCart();
    // ... (rest of cart check and summary display code is unchanged) ...

    document.getElementById('checkout-form').addEventListener('submit', e => {
        e.preventDefault();
        const name = document.getElementById('fullname').value.trim();
        const email = document.getElementById('email').value.trim();
        const addr = document.getElementById('address').value.trim();
        if (!name || !email || !addr) return alert('Fill in all fields');
        
        // --- 1. GATHER ORDER DETAILS HERE ---
        const total = cart.reduce((s, it) => s + it.price, 0);
        
        // Since you're not tracking quantity in the cart, we need to consolidate items
        const consolidatedItems = cart.reduce((acc, item) => {
            const existing = acc.find(i => i.id === item.id);
            if (existing) {
                existing.quantity += 1;
                existing.subTotal += item.price; // Update subtotal
            } else {
                acc.push({ 
                    id: item.id, 
                    name: item.name, 
                    price: item.price,
                    subTotal: item.price,
                    quantity: 1, 
                    sku: 'sku-' + item.id, // Example SKU generation
                    category: 'E-commerce' // Example Category
                });
            }
            return acc;
        }, []);

        const trackingItems = consolidatedItems.map(item => ({
            subTotal: item.subTotal.toFixed(2), // Total price for this line item (e.g., 2 x 15.00 = 30.00)
            category: item.category,
            sku: item.sku,
            quantity: item.quantity,
            name: item.name
        }));
        
        // --- 2. EXECUTE CONVERSION TRACKING ---
        // NOTE: 'ire' function must be globally available for this to work.
        if (typeof ire === 'function') {
            ire('trackConversion', 64780, {
                 // --- Order and Customer Details ---
                 orderId: "ORDER_" + Date.now(),
                 customerId: "customer1",    
                 customerEmail: "15as241f578de7501Gd9052H1, 
                 customerStatus: "New",
                 currencyCode: "ZAR",
                 orderPromoCode: "",
                 orderDiscount: 0.00,
                 // --- Items Array ---
                 items: trackingItems
              },
              {
              verifySiteDefinitionMatch:true
              }
            );
        } else {
            console.error("Conversion tracking function 'ire' is not defined.");
        }
        
        // --- 3. FINAL ACTIONS (Must happen AFTER tracking) ---
        localStorage.removeItem('cart');
        updateCartCount();
        location.href = `thankyou.html?name=${encodeURIComponent(name)}`;
    });
}*/
/*function loadCheckoutPage() {
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
    localStorage.removeItem('cart');
    updateCartCount();
    location.href = `thankyou.html?name=${encodeURIComponent(name)}`;
  });
}*/

function loadThankYouPage() {
  const p = document.getElementById('thanks-msg');
  if (!p) return;
  const name = new URLSearchParams(location.search).get('name');
  p.textContent = name
    ? `Thanks, ${decodeURIComponent(name)}! Your order has been placed.`
    : 'Thanks! Your order has been placed.';
}

document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  loadProducts();
  loadCartPage();
  loadCheckoutPage();
  loadThankYouPage();
});
