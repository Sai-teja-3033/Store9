/* ============================================================
   login.js
   Handles the login form on index.html: validates credentials,
   creates a session in LocalStorage, and redirects to the
   correct dashboard. Also auto-redirects if a session already
   exists, so a logged-in user skips the login screen.
   ============================================================ */

const DEFAULT_CREDENTIALS = {
  owner: { username: 'owner', password: '1234' },
  staff: { username: 'staff', password: '1234' }
};

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, go straight to the right dashboard.
  const existingSession = getSession();
  if (existingSession && existingSession.role) {
    redirectForRole(existingSession.role);
    return;
  }

  const form = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const roleTabs = document.querySelectorAll('.role-tab');
  const errorBox = document.getElementById('login-error');

  let selectedRole = 'owner';

  // Role tabs (Owner / Staff) just pre-fill the username for convenience.
  roleTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      roleTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedRole = tab.dataset.role;
      usernameInput.value = DEFAULT_CREDENTIALS[selectedRole].username;
      passwordInput.value = '';
      passwordInput.focus();
      hideError();
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    hideError();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      showError('Please enter both username and password.');
      return;
    }

    const match = Object.entries(DEFAULT_CREDENTIALS).find(
      ([role, creds]) => creds.username === username && creds.password === password
    );

    if (!match) {
      showError('Invalid username or password.');
      return;
    }

    const role = match[0];
    setSession({
      role: role,
      username: username,
      loginTime: new Date().toISOString()
    });

    redirectForRole(role);
  });

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.add('visible');
  }

  function hideError() {
    errorBox.textContent = '';
    errorBox.classList.remove('visible');
  }
});

function redirectForRole(role) {
  if (role === 'owner') {
    window.location.href = 'owner.html';
  } else if (role === 'staff') {
    window.location.href = 'staff.html';
  }
}

/* Guard used at the top of owner.html / staff.html to block
   unauthorized access and force correct role separation. */
function requireRole(requiredRole) {
  const session = getSession();
  if (!session || session.role !== requiredRole) {
    window.location.href = 'index.html';
  }
  return session;
}

function performLogout() {
  clearSession();
  window.location.href = 'index.html';
}
