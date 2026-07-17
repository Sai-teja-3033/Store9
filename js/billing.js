/* ============================================================
   billing.js
   Shopping-cart logic for the billing screen: add/remove items,
   change quantity, compute totals, generate + save a bill,
   print it, and build a WhatsApp share link.
   ============================================================ */

let cart = []; // { productId, name, price, qty }
let lastGeneratedBill = null;

function initBilling() {
  renderCart();
  updateBillMeta();

  document.getElementById('generate-bill-btn').addEventListener('click', handleGenerateBill);
  document.getElementById('print-bill-btn').addEventListener('click', handlePrintBill);
  document.getElementById('whatsapp-bill-btn').addEventListener('click', handleWhatsAppBill);
  document.getElementById('new-bill-btn').addEventListener('click', resetBillingScreen);

  // Keep bill number / date / time fresh on load
  setInterval(updateBillMeta, 30000);
}

function updateBillMeta() {
  const dateEl = document.getElementById('bill-date');
  const timeEl = document.getElementById('bill-time');
  const now = new Date();
  if (dateEl) dateEl.textContent = formatDate(now.toISOString());
  if (timeEl) timeEl.textContent = formatTime(now.toISOString());
}

function addToCart(productId) {
  const product = getProductById(productId);
  if (!product) return;
  if (Number(product.stock) <= 0) {
    toast('This product is out of stock.');
    return;
  }

  const existing = cart.find(item => item.productId === productId);
  const qtyInCart = existing ? existing.qty : 0;

  if (qtyInCart + 1 > Number(product.stock)) {
    toast(`Only ${product.stock} in stock.`);
    return;
  }

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ productId: product.id, name: product.name, price: Number(product.price), qty: 1 });
  }
  renderCart();
  toast(`${product.name} added to bill.`);
}

function changeQty(productId, delta) {
  const item = cart.find(i => i.productId === productId);
  if (!item) return;
  const product = getProductById(productId);
  const maxStock = product ? Number(product.stock) : Infinity;

  const newQty = item.qty + delta;
  if (newQty <= 0) {
    removeFromCart(productId);
    return;
  }
  if (newQty > maxStock) {
    toast(`Only ${maxStock} in stock.`);
    return;
  }
  item.qty = newQty;
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.productId !== productId);
  renderCart();
}

function getCartSubtotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function renderCart() {
  const list = document.getElementById('cart-items');
  const emptyState = document.getElementById('cart-empty-state');
  const subtotalEl = document.getElementById('cart-subtotal');
  const grandTotalEl = document.getElementById('cart-grand-total');
  const generateBtn = document.getElementById('generate-bill-btn');

  list.innerHTML = '';

  if (cart.length === 0) {
    emptyState.classList.add('visible');
  } else {
    emptyState.classList.remove('visible');
    cart.forEach(item => {
      const row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = `
        <div class="cart-item-info">
          <span class="cart-item-name">${escapeHTML(item.name)}</span>
          <span class="cart-item-price">${formatCurrency(item.price)} each</span>
        </div>
        <div class="cart-item-qty">
          <button class="stock-btn" data-id="${item.productId}" data-action="dec">−</button>
          <span>${item.qty}</span>
          <button class="stock-btn" data-id="${item.productId}" data-action="inc">+</button>
        </div>
        <div class="cart-item-line-total">${formatCurrency(item.price * item.qty)}</div>
        <button class="icon-btn cart-remove-btn" data-id="${item.productId}" title="Remove item">✕</button>
      `;
      list.appendChild(row);
    });

    list.querySelectorAll('.stock-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = btn.dataset.action === 'inc' ? 1 : -1;
        changeQty(btn.dataset.id, delta);
      });
    });
    list.querySelectorAll('.cart-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
    });
  }

  const subtotal = getCartSubtotal();
  subtotalEl.textContent = formatCurrency(subtotal);
  grandTotalEl.textContent = formatCurrency(subtotal);
  generateBtn.disabled = cart.length === 0;
}

function validateCustomerFields() {
  clearBillingFormErrors();
  const nameInput = document.getElementById('customer-name');
  const phoneInput = document.getElementById('customer-phone');
  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  let valid = true;

  if (!name) {
    setFieldError('customer-name-error', 'Customer name is required.');
    valid = false;
  }

  const phoneDigits = phone.replace(/\D/g, '');
  if (!phone) {
    setFieldError('customer-phone-error', 'Customer phone is required.');
    valid = false;
  } else if (phoneDigits.length < 10 || phoneDigits.length > 13) {
    setFieldError('customer-phone-error', 'Enter a valid phone number (10-13 digits).');
    valid = false;
  }

  if (cart.length === 0) {
    toast('Add at least one product to the bill.');
    valid = false;
  }

  return valid ? { name, phone: phoneDigits } : null;
}

function clearBillingFormErrors() {
  document.querySelectorAll('#billing-form .field-error').forEach(el => (el.textContent = ''));
}

function handleGenerateBill() {
  const customer = validateCustomerFields();
  if (!customer) return;

  const now = new Date();
  const billNumber = getNextBillNumber();

  const bill = {
    id: genId(),
    billNumber: billNumber,
    customerName: customer.name,
    customerPhone: customer.phone,
    createdAt: now.toISOString(),
    items: cart.map(i => ({ productId: i.productId, name: i.name, price: i.price, qty: i.qty })),
    subtotal: getCartSubtotal(),
    grandTotal: getCartSubtotal(),
    createdBy: (getSession() || {}).username || 'unknown'
  };

  // Deduct stock for each sold item
  bill.items.forEach(item => adjustStock(item.productId, -item.qty));

  addBill(bill);
  lastGeneratedBill = bill;

  renderGeneratedBill(bill);
  toast('Bill generated successfully.');

  document.getElementById('billing-form-section').classList.add('collapsed');
  document.getElementById('generated-bill-section').classList.add('visible');
}

function renderGeneratedBill(bill) {
  const settings = getSettings();
  document.getElementById('gb-store-name').textContent = settings.storeName;
  document.getElementById('gb-bill-number').textContent = bill.billNumber;
  document.getElementById('gb-date').textContent = formatDate(bill.createdAt);
  document.getElementById('gb-time').textContent = formatTime(bill.createdAt);
  document.getElementById('gb-customer-name').textContent = bill.customerName;
  document.getElementById('gb-customer-phone').textContent = bill.customerPhone;

  const itemsBody = document.getElementById('gb-items-body');
  itemsBody.innerHTML = '';
  bill.items.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHTML(item.name)}</td>
      <td>${item.qty}</td>
      <td>${formatCurrency(item.price)}</td>
      <td>${formatCurrency(item.price * item.qty)}</td>
    `;
    itemsBody.appendChild(tr);
  });

  document.getElementById('gb-grand-total').textContent = formatCurrency(bill.grandTotal);
}

function buildWhatsAppMessage(bill) {
  const settings = getSettings();
  const lines = [];
  lines.push(`🧾 ${settings.storeName}`);
  lines.push('');
  lines.push(`Bill No: ${bill.billNumber}`);
  lines.push(`Date: ${formatDate(bill.createdAt)} ${formatTime(bill.createdAt)}`);
  lines.push('');
  lines.push(`Customer: ${bill.customerName}`);
  lines.push('');
  lines.push('Items:');
  bill.items.forEach(item => {
    lines.push(`- ${item.name} x${item.qty}  ${formatCurrency(item.price * item.qty)}`);
  });
  lines.push('');
  lines.push(`Total: ${formatCurrency(bill.grandTotal)}`);
  lines.push('');
  lines.push('Thank you for shopping with us.');
  return lines.join('\n');
}

function handlePrintBill() {
  if (!lastGeneratedBill) return;
  window.print();
}

function handleWhatsAppBill() {
  if (!lastGeneratedBill) return;
  const message = buildWhatsAppMessage(lastGeneratedBill);
  const phone = lastGeneratedBill.customerPhone;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

function resetBillingScreen() {
  cart = [];
  lastGeneratedBill = null;
  document.getElementById('billing-form').reset();
  clearBillingFormErrors();
  renderCart();
  updateBillMeta();
  document.getElementById('billing-form-section').classList.remove('collapsed');
  document.getElementById('generated-bill-section').classList.remove('visible');
  if (typeof renderCatalogue === 'function') {
    renderCatalogue(document.getElementById('catalogue-search').value.trim(), addToCart);
  }
}
