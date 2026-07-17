/* ============================================================
   products.js
   Product management logic shared by owner.html (full CRUD
   table) and staff.html (read-only catalogue for billing).
   ============================================================ */

/* ---------------- Owner: Product Management Table ---------------- */

let currentEditId = null; // null = adding a new product, otherwise editing

function initProductManagement() {
  const searchInput = document.getElementById('product-search');
  const addBtn = document.getElementById('add-product-btn');
  const modal = document.getElementById('product-modal');
  const form = document.getElementById('product-form');
  const cancelBtn = document.getElementById('product-cancel-btn');
  const closeBtn = document.getElementById('product-modal-close');

  renderProductTable('');

  searchInput.addEventListener('input', () => {
    renderProductTable(searchInput.value.trim());
  });

  addBtn.addEventListener('click', () => openProductModal(null));
  cancelBtn.addEventListener('click', closeProductModal);
  closeBtn.addEventListener('click', closeProductModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeProductModal();
  });

  form.addEventListener('submit', handleProductFormSubmit);
}

function renderProductTable(searchTerm) {
  const tbody = document.getElementById('product-table-body');
  const emptyState = document.getElementById('product-empty-state');
  if (!tbody) return;

  let products = getProducts();
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    products = products.filter(
      p => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)
    );
  }

  tbody.innerHTML = '';

  if (products.length === 0) {
    emptyState.classList.add('visible');
    return;
  }
  emptyState.classList.remove('visible');

  products.forEach(product => {
    const tr = document.createElement('tr');
    const lowStock = Number(product.stock) <= 5;
    tr.innerHTML = `
      <td class="cell-name">${escapeHTML(product.name)}</td>
      <td>${escapeHTML(product.category)}</td>
      <td class="cell-price">${formatCurrency(product.price)}</td>
      <td>
        <div class="stock-editor">
          <button class="stock-btn" data-action="dec" data-id="${product.id}" aria-label="Decrease stock">−</button>
          <span class="stock-value ${lowStock ? 'stock-low' : ''}">${product.stock}</span>
          <button class="stock-btn" data-action="inc" data-id="${product.id}" aria-label="Increase stock">+</button>
        </div>
      </td>
      <td class="cell-actions">
        <button class="icon-btn edit-btn" data-id="${product.id}" title="Edit product">✎</button>
        <button class="icon-btn delete-btn" data-id="${product.id}" title="Delete product">🗑</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Wire up row-level buttons
  tbody.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openProductModal(btn.dataset.id));
  });
  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteProduct(btn.dataset.id));
  });
  tbody.querySelectorAll('.stock-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const delta = btn.dataset.action === 'inc' ? 1 : -1;
      adjustStock(btn.dataset.id, delta);
      renderProductTable(document.getElementById('product-search').value.trim());
      if (typeof refreshDashboardCards === 'function') refreshDashboardCards();
    });
  });
}

function openProductModal(id) {
  const modal = document.getElementById('product-modal');
  const form = document.getElementById('product-form');
  const title = document.getElementById('product-modal-title');
  form.reset();
  clearProductFormErrors();

  if (id) {
    const product = getProductById(id);
    if (!product) return;
    currentEditId = id;
    title.textContent = 'Edit Product';
    document.getElementById('pf-name').value = product.name;
    document.getElementById('pf-category').value = product.category;
    document.getElementById('pf-price').value = product.price;
    document.getElementById('pf-stock').value = product.stock;
  } else {
    currentEditId = null;
    title.textContent = 'Add Product';
  }

  modal.classList.add('open');
  document.getElementById('pf-name').focus();
}

function closeProductModal() {
  document.getElementById('product-modal').classList.remove('open');
  currentEditId = null;
}

function clearProductFormErrors() {
  document.querySelectorAll('#product-form .field-error').forEach(el => (el.textContent = ''));
}

function handleProductFormSubmit(e) {
  e.preventDefault();
  clearProductFormErrors();

  const name = document.getElementById('pf-name').value.trim();
  const category = document.getElementById('pf-category').value.trim();
  const priceRaw = document.getElementById('pf-price').value;
  const stockRaw = document.getElementById('pf-stock').value;

  let hasError = false;

  if (!name) {
    setFieldError('pf-name-error', 'Product name is required.');
    hasError = true;
  } else if (isDuplicateProductName(name, currentEditId)) {
    setFieldError('pf-name-error', 'A product with this name already exists.');
    hasError = true;
  }

  if (!category) {
    setFieldError('pf-category-error', 'Category is required.');
    hasError = true;
  }

  const price = parseFloat(priceRaw);
  if (priceRaw === '' || isNaN(price) || price <= 0) {
    setFieldError('pf-price-error', 'Enter a valid price greater than 0.');
    hasError = true;
  }

  const stock = parseInt(stockRaw, 10);
  if (stockRaw === '' || isNaN(stock) || stock < 0) {
    setFieldError('pf-stock-error', 'Enter a valid stock quantity (0 or more).');
    hasError = true;
  }

  if (hasError) return;

  if (currentEditId) {
    updateProduct(currentEditId, { name, category, price, stock });
    toast('Product updated successfully.');
  } else {
    addProduct({ name, category, price, stock });
    toast('Product added successfully.');
  }

  closeProductModal();
  renderProductTable(document.getElementById('product-search').value.trim());
  if (typeof refreshDashboardCards === 'function') refreshDashboardCards();
}

function setFieldError(elId, message) {
  const el = document.getElementById(elId);
  if (el) el.textContent = message;
}

function confirmDeleteProduct(id) {
  const product = getProductById(id);
  if (!product) return;
  openConfirmDialog(
    `Delete "${product.name}"? This cannot be undone.`,
    () => {
      deleteProduct(id);
      renderProductTable(document.getElementById('product-search').value.trim());
      if (typeof refreshDashboardCards === 'function') refreshDashboardCards();
      toast('Product deleted.');
    }
  );
}

/* ---------------- Staff / Shared: Product Catalogue ---------------- */

function renderCatalogue(searchTerm, onAddToCart) {
  const grid = document.getElementById('catalogue-grid');
  const emptyState = document.getElementById('catalogue-empty-state');
  if (!grid) return;

  let products = getProducts();
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    products = products.filter(
      p => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)
    );
  }

  grid.innerHTML = '';

  if (products.length === 0) {
    emptyState.classList.add('visible');
    return;
  }
  emptyState.classList.remove('visible');

  products.forEach(product => {
    const card = document.createElement('div');
    const outOfStock = Number(product.stock) <= 0;
    card.className = 'product-card' + (outOfStock ? ' out-of-stock' : '');
    card.innerHTML = `
      <div class="product-card-top">
        <span class="product-card-category">${escapeHTML(product.category)}</span>
        ${outOfStock ? '<span class="badge-out">Out of stock</span>' : ''}
      </div>
      <h3 class="product-card-name">${escapeHTML(product.name)}</h3>
      <div class="product-card-bottom">
        <span class="product-card-price">${formatCurrency(product.price)}</span>
        <button class="btn btn-add-cart" data-id="${product.id}" ${outOfStock ? 'disabled' : ''}>+ Add</button>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll('.btn-add-cart').forEach(btn => {
    btn.addEventListener('click', () => onAddToCart(btn.dataset.id));
  });
}

/* ---------------- Shared UI helpers: toast + confirm dialog ---------------- */

function toast(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

function openConfirmDialog(message, onConfirm) {
  const dialog = document.getElementById('confirm-dialog');
  const msgEl = document.getElementById('confirm-dialog-message');
  const yesBtn = document.getElementById('confirm-dialog-yes');
  const noBtn = document.getElementById('confirm-dialog-no');

  msgEl.textContent = message;
  dialog.classList.add('open');

  const cleanup = () => {
    dialog.classList.remove('open');
    yesBtn.removeEventListener('click', yesHandler);
    noBtn.removeEventListener('click', noHandler);
  };
  const yesHandler = () => {
    cleanup();
    onConfirm();
  };
  const noHandler = () => cleanup();

  yesBtn.addEventListener('click', yesHandler);
  noBtn.addEventListener('click', noHandler);
}
