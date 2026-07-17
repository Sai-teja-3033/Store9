/* ============================================================
   storage.js
   Central LocalStorage data layer for Konda Store Manager.
   Every other script talks to LocalStorage through these
   functions only — nothing else in the app touches
   localStorage directly. Keeps the "database" in one place.
   ============================================================ */

const DB_KEYS = {
  PRODUCTS: 'ks_products',
  BILLS: 'ks_bills',
  SESSION: 'ks_session',
  SETTINGS: 'ks_settings',
  BILL_SEQ: 'ks_bill_seq'
};

/* ---------------- Generic helpers ---------------- */

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Storage read error for', key, e);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('Storage write error for', key, e);
    return false;
  }
}

/* ---------------- Settings ---------------- */

const DEFAULT_SETTINGS = {
  storeName: 'Konda Store',
  storeTagline: 'Quality you can trust',
  currency: '₹'
};

function getSettings() {
  return readJSON(DB_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

function saveSettings(settings) {
  return writeJSON(DB_KEYS.SETTINGS, settings);
}

/* ---------------- Session ---------------- */

function setSession(session) {
  // session = { role: 'owner' | 'staff', username: string, loginTime: ISOString }
  return writeJSON(DB_KEYS.SESSION, session);
}

function getSession() {
  return readJSON(DB_KEYS.SESSION, null);
}

function clearSession() {
  localStorage.removeItem(DB_KEYS.SESSION);
}

/* ---------------- Products ---------------- */

function seedProductsIfEmpty() {
  const existing = readJSON(DB_KEYS.PRODUCTS, null);
  if (existing === null) {
    const sample = [
      { id: genId(), name: 'Photo Frame', category: 'Home Decor', price: 250, stock: 40 },
      { id: genId(), name: 'Keychain', category: 'Accessories', price: 150, stock: 60 },
      { id: genId(), name: 'Coffee Mug', category: 'Kitchenware', price: 199, stock: 35 },
      { id: genId(), name: 'Wall Clock', category: 'Home Decor', price: 899, stock: 12 },
      { id: genId(), name: 'Notebook', category: 'Stationery', price: 60, stock: 100 },
      { id: genId(), name: 'Table Lamp', category: 'Lighting', price: 1250, stock: 8 }
    ];
    writeJSON(DB_KEYS.PRODUCTS, sample);
  }
}

function getProducts() {
  return readJSON(DB_KEYS.PRODUCTS, []);
}

function saveProducts(products) {
  return writeJSON(DB_KEYS.PRODUCTS, products);
}

function getProductById(id) {
  return getProducts().find(p => p.id === id) || null;
}

function isDuplicateProductName(name, excludeId) {
  const norm = name.trim().toLowerCase();
  return getProducts().some(
    p => p.name.trim().toLowerCase() === norm && p.id !== excludeId
  );
}

function addProduct(product) {
  const products = getProducts();
  product.id = genId();
  products.push(product);
  saveProducts(products);
  return product;
}

function updateProduct(id, updates) {
  const products = getProducts();
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return false;
  products[idx] = { ...products[idx], ...updates };
  saveProducts(products);
  return true;
}

function deleteProduct(id) {
  const products = getProducts().filter(p => p.id !== id);
  saveProducts(products);
}

function adjustStock(id, delta) {
  const products = getProducts();
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return false;
  products[idx].stock = Math.max(0, Number(products[idx].stock) + delta);
  saveProducts(products);
  return true;
}

/* ---------------- Bills / Sales ---------------- */

function getBills() {
  return readJSON(DB_KEYS.BILLS, []);
}

function saveBills(bills) {
  return writeJSON(DB_KEYS.BILLS, bills);
}

function addBill(bill) {
  const bills = getBills();
  bills.unshift(bill); // newest first
  saveBills(bills);
  return bill;
}

function deleteBill(id) {
  const bills = getBills().filter(b => b.id !== id);
  saveBills(bills);
}

function getNextBillNumber() {
  let seq = readJSON(DB_KEYS.BILL_SEQ, 1000);
  seq += 1;
  writeJSON(DB_KEYS.BILL_SEQ, seq);
  return 'KS-' + seq;
}

/* ---------------- Derived stats ---------------- */

function isSameDay(isoDate, refDate) {
  const d = new Date(isoDate);
  return (
    d.getFullYear() === refDate.getFullYear() &&
    d.getMonth() === refDate.getMonth() &&
    d.getDate() === refDate.getDate()
  );
}

function getTodayStats() {
  const bills = getBills();
  const today = new Date();
  const todaysBills = bills.filter(b => isSameDay(b.createdAt, today));
  const todaysRevenue = todaysBills.reduce((sum, b) => sum + b.grandTotal, 0);
  return {
    todaysBillsCount: todaysBills.length,
    todaysRevenue: todaysRevenue,
    todaysSalesCount: todaysBills.reduce(
      (sum, b) => sum + b.items.reduce((s, it) => s + it.qty, 0),
      0
    )
  };
}

function getAllTimeRevenue() {
  return getBills().reduce((sum, b) => sum + b.grandTotal, 0);
}

/* ---------------- Utilities ---------------- */

function genId() {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

function formatCurrency(amount) {
  const settings = getSettings();
  const num = Number(amount) || 0;
  return settings.currency + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* Ensure sample products exist the first time the app runs */
seedProductsIfEmpty();
