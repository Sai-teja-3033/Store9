/* ============================================================
   owner.js
   Drives owner.html: route guard, sidebar navigation, dashboard
   stat cards, product management init, and the sales/bills
   history view (search + delete).
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const session = requireRole('owner');
  if (!session) return;

  document.getElementById('current-user-label').textContent = session.username;
  document.getElementById('logout-btn').addEventListener('click', performLogout);

  initSidebarNavigation();
  initProductManagement();
  initSalesView();
  initSettingsView();

  refreshDashboardCards();
  renderRecentBills();
});

/* ---------------- Sidebar navigation ---------------- */

function initSidebarNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.view-section');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.view;

      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      sections.forEach(sec => {
        sec.classList.toggle('active', sec.id === `view-${target}`);
      });

      document.getElementById('page-title').textContent = item.dataset.label;

      // Refresh dynamic sections whenever they're opened
      if (target === 'dashboard') {
        refreshDashboardCards();
        renderRecentBills();
      }
      if (target === 'sales') {
        renderSalesTable(document.getElementById('sales-search').value.trim());
      }

      closeMobileSidebar();
    });
  });

  // Mobile hamburger toggle
  const menuBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('visible');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', closeMobileSidebar);
  }

  function closeMobileSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  }
}

/* ---------------- Dashboard cards ---------------- */

function refreshDashboardCards() {
  const stats = getTodayStats();
  const products = getProducts();
  const allTimeRevenue = getAllTimeRevenue();

  setText('stat-todays-sales', stats.todaysSalesCount);
  setText('stat-todays-bills', stats.todaysBillsCount);
  setText('stat-products-count', products.length);
  setText('stat-revenue', formatCurrency(allTimeRevenue));
  setText('stat-todays-revenue', formatCurrency(stats.todaysRevenue));
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function renderRecentBills() {
  const container = document.getElementById('recent-bills-list');
  const emptyState = document.getElementById('recent-bills-empty');
  if (!container) return;

  const bills = getBills().slice(0, 6);
  container.innerHTML = '';

  if (bills.length === 0) {
    emptyState.classList.add('visible');
    return;
  }
  emptyState.classList.remove('visible');

  bills.forEach(bill => {
    const row = document.createElement('div');
    row.className = 'recent-bill-row';
    row.innerHTML = `
      <div class="rb-main">
        <span class="rb-number">${escapeHTML(bill.billNumber)}</span>
        <span class="rb-customer">${escapeHTML(bill.customerName)}</span>
      </div>
      <div class="rb-meta">
        <span>${formatDate(bill.createdAt)} · ${formatTime(bill.createdAt)}</span>
        <span class="rb-total">${formatCurrency(bill.grandTotal)}</span>
      </div>
    `;
    container.appendChild(row);
  });
}

/* ---------------- Sales / Bills view ---------------- */

function initSalesView() {
  const searchInput = document.getElementById('sales-search');
  searchInput.addEventListener('input', () => {
    renderSalesTable(searchInput.value.trim());
  });
  renderSalesTable('');
}

function renderSalesTable(searchTerm) {
  const tbody = document.getElementById('sales-table-body');
  const emptyState = document.getElementById('sales-empty-state');
  if (!tbody) return;

  let bills = getBills();
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    bills = bills.filter(
      b =>
        b.billNumber.toLowerCase().includes(term) ||
        b.customerName.toLowerCase().includes(term) ||
        b.customerPhone.includes(term)
    );
  }

  tbody.innerHTML = '';

  if (bills.length === 0) {
    emptyState.classList.add('visible');
    return;
  }
  emptyState.classList.remove('visible');

  bills.forEach(bill => {
    const itemsSummary = bill.items.map(i => `${i.name} x${i.qty}`).join(', ');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="cell-name">${escapeHTML(bill.billNumber)}</td>
      <td>${escapeHTML(bill.customerName)}<br><span class="cell-sub">${escapeHTML(bill.customerPhone)}</span></td>
      <td class="cell-sub">${formatDate(bill.createdAt)} ${formatTime(bill.createdAt)}</td>
      <td class="cell-sub cell-items">${escapeHTML(itemsSummary)}</td>
      <td class="cell-price">${formatCurrency(bill.grandTotal)}</td>
      <td class="cell-actions">
        <button class="icon-btn delete-btn" data-id="${bill.id}" title="Delete bill">🗑</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteBill(btn.dataset.id));
  });
}

function confirmDeleteBill(id) {
  openConfirmDialog('Delete this bill? This cannot be undone.', () => {
    deleteBill(id);
    renderSalesTable(document.getElementById('sales-search').value.trim());
    refreshDashboardCards();
    renderRecentBills();
    toast('Bill deleted.');
  });
}

/* ---------------- Settings view ---------------- */

function initSettingsView() {
  const form = document.getElementById('settings-form');
  if (!form) return;

  const settings = getSettings();
  document.getElementById('settings-store-name').value = settings.storeName;
  document.getElementById('settings-tagline').value = settings.storeTagline;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const storeName = document.getElementById('settings-store-name').value.trim();
    const tagline = document.getElementById('settings-tagline').value.trim();

    if (!storeName) {
      toast('Store name cannot be empty.');
      return;
    }

    saveSettings({ ...getSettings(), storeName, storeTagline: tagline });
    document.querySelectorAll('.brand-name').forEach(el => (el.textContent = storeName));
    toast('Settings saved.');
  });
}
