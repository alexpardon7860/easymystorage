/**
 * login.js — Login form logic
 *
 * Handles:
 *  - Frontend validation
 *  - Fetch POST to /api/login.php
 *  - Stores user in sessionStorage for dashboard
 *  - Toast + inline alerts
 *  - No page reload
 */

'use strict';

// ── Toast helper (same pattern as register.js) ───────────────────
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// ── Inline alert ─────────────────────────────────────────────────
function showAlert(message, type = 'error') {
  const box  = document.getElementById('form-alert');
  const msg  = document.getElementById('form-alert-msg');
  const icon = box?.querySelector('.alert-icon');
  if (!box) return;

  box.className = `alert alert-${type}`;
  if (icon) icon.textContent = type === 'success' ? '✅' : '❌';
  msg.textContent = message;
  box.classList.remove('hidden');
}
function hideAlert() {
  document.getElementById('form-alert')?.classList.add('hidden');
}

// ── Field helpers ─────────────────────────────────────────────────
function setFieldError(fieldId, errorId, message) {
  document.getElementById(fieldId)?.classList.add('error');
  const err = document.getElementById(errorId);
  if (err) { err.textContent = message; err.classList.remove('hidden'); }
}
function clearField(fieldId, errorId) {
  document.getElementById(fieldId)?.classList.remove('error');
  const err = document.getElementById(errorId);
  if (err) { err.textContent = ''; err.classList.add('hidden'); }
}

// ── Frontend Validation ──────────────────────────────────────────
function validateLogin(email, password) {
  let valid = true;
  hideAlert();
  clearField('email', 'email-error');
  clearField('password', 'password-error');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    setFieldError('email', 'email-error', 'Enter a valid email address.');
    valid = false;
  }

  if (!password || password.length < 1) {
    setFieldError('password', 'password-error', 'Password is required.');
    valid = false;
  }

  return valid;
}

// ── Button loading state ─────────────────────────────────────────
function setLoading(btn, loading) {
  if (loading) {
    btn.classList.add('loading');
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.textContent = 'Signing in…';
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText || 'Sign In';
  }
}

// ── Login Submit Handler ─────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();

  const btn      = document.getElementById('submit-btn');
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!validateLogin(email, password)) return;

  setLoading(btn, true);

  try {
    const response = await fetch('api/login.php', {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({ email, password }),
      credentials: 'include'   // send cookies for session
    });

    const data = await response.json();

    if (data.success) {
      // Persist user data for dashboard (never store password)
      sessionStorage.setItem('uf_user', JSON.stringify({
        ...data.user,
        token: data.token
      }));

      showAlert(data.message, 'success');
      showToast(data.message, 'success');

      // Redirect to dashboard
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
    } else {
      showAlert(data.message, 'error');
      showToast(data.message, 'error');
      setLoading(btn, false);
    }
  } catch (err) {
    const msg = 'Connection error. Please try again.';
    showAlert(msg, 'error');
    showToast(msg, 'error');
    setLoading(btn, false);
    console.error('[Login]', err);
  }
}

// ── Blur-time validation ─────────────────────────────────────────
document.getElementById('email')?.addEventListener('blur', function () {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(this.value.trim())) {
    setFieldError('email', 'email-error', 'Enter a valid email address.');
  } else { clearField('email', 'email-error'); }
});

// ── Attach submit ────────────────────────────────────────────────
document.getElementById('login-form')?.addEventListener('submit', handleLogin);

// ── Redirect if already logged in ───────────────────────────────
(function checkSession() {
  const user = sessionStorage.getItem('uf_user');
  if (user) window.location.href = 'dashboard.html';
})();
