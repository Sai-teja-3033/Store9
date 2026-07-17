/* ============================================================
   staff.js
   Drives staff.html: route guard, sidebar navigation (Billing
   only), catalogue search wiring, and billing init. Staff has
   no access to product management or settings.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const session = requireRole('staff');
  if (!session) return;

  document.getElementById('current-user-label').textContent = session.username;
  document.getElementById('logout-btn').addEventListener('click', performLogout);

  const settings = getSettings();
  document.querySelectorAll('.brand-name').forEach(el => (el.textContent = settings.storeName));

  initStaffNavigation();
  initBilling();

  const searchInput = document.getElementById('catalogue-search');
  renderCatalogue('', addToCart);
  searchInput.addEventListener('input', () => {
    renderCatalogue(searchInput.value.trim(), addToCart);
  });
});

function initStaffNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.view-section');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.view;
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      sections.forEach(sec => sec.classList.toggle('active', sec.id === `view-${target}`));
      document.getElementById('page-title').textContent = item.dataset.label;
      closeMobileSidebar();
    });
  });

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
