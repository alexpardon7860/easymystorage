/**
 * register.js — Registration form logic
 *
 * Handles:
 *  - Frontend validation (mirrors backend rules)
 *  - Fetch POST to /api/register.php
 *  - Inline field errors + toast notifications
 *  - No page reload
 */

'use strict';

// ── Toast notification helper ────────────────────────────────────
/**
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration  ms before auto-dismiss
 */
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

// ── Inline alert (above the form) ────────────────────────────────
function showAlert(message, type = 'error') {
  const box = document.getElementById('form-alert');
  const msg = document.getElementById('form-alert-msg');
  const icon = box.querySelector('.alert-icon');
  if (!box) return;

  box.className = `alert alert-${type}`;
  icon.textContent = type === 'success' ? '✅' : type === 'info' ? 'ℹ️' : '❌';
  msg.textContent  = message;
  box.classList.remove('hidden');
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function hideAlert() {
  const box = document.getElementById('form-alert');
  if (box) box.classList.add('hidden');
}

// ── Field-level error helpers ────────────────────────────────────
function setFieldError(fieldId, errorId, message) {
  const field = document.getElementById(fieldId);
  const err   = document.getElementById(errorId);
  if (field) field.classList.add('error');
  if (err)   { err.textContent = message; err.classList.remove('hidden'); }
}
function clearFieldError(fieldId, errorId) {
  const field = document.getElementById(fieldId);
  const err   = document.getElementById(errorId);
  if (field) field.classList.remove('error');
  if (err)   { err.textContent = ''; err.classList.add('hidden'); }
}
function clearAllErrors() {
  ['name','email','password','confirm-password'].forEach(id => {
    clearFieldError(id, `${id}-error`.replace('confirm-password', 'confirm'));
  });
  clearFieldError('confirm-password', 'confirm-error');
  hideAlert();
}

// ── Frontend Validation ──────────────────────────────────────────
function validateForm(name, email, password, confirmPassword) {
  let valid = true;

  if (!name || name.trim().length < 2) {
    setFieldError('name', 'name-error', 'Full name must be at least 2 characters.');
    valid = false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    setFieldError('email', 'email-error', 'Please enter a valid email address.');
    valid = false;
  }

  if (!password || password.length < 6) {
    setFieldError('password', 'password-error', 'Password must be at least 6 characters.');
    valid = false;
  }

  if (password !== confirmPassword) {
    setFieldError('confirm-password', 'confirm-error', 'Passwords do not match.');
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
    btn.textContent = 'Creating account…';
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText || 'Create Account';
  }
}

// ── Form Submit Handler ──────────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault();
  clearAllErrors();

  const form    = document.getElementById('register-form');
  const btn     = document.getElementById('submit-btn');
  const name    = document.getElementById('name').value.trim();
  const email   = document.getElementById('email').value.trim();
  const password         = document.getElementById('password').value;
  const confirmPassword  = document.getElementById('confirm-password').value;
  const role             = document.getElementById('role').value;

  // Frontend validation first
  if (!validateForm(name, email, password, confirmPassword)) return;

  setLoading(btn, true);

  try {
    const response = await fetch('api/register.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, password, confirm_password: confirmPassword, role })
    });

    const data = await response.json();

    if (data.success) {
      showAlert(data.message, 'success');
      showToast(data.message, 'success');
      form.reset();

      // Redirect to login after a short delay
      setTimeout(() => { window.location.href = 'login.html'; }, 2000);
    } else {
      showAlert(data.message, 'error');
      showToast(data.message, 'error');
    }
  } catch (err) {
    const msg = 'Network error. Please check your connection and try again.';
    showAlert(msg, 'error');
    showToast(msg, 'error');
    console.error('[Register]', err);
  } finally {
    setLoading(btn, false);
  }
}

// ── Live field validation (on blur) ─────────────────────────────
document.getElementById('name')?.addEventListener('blur', function () {
  if (this.value.trim().length < 2) {
    setFieldError('name', 'name-error', 'Full name must be at least 2 characters.');
  } else { clearFieldError('name', 'name-error'); }
});

document.getElementById('email')?.addEventListener('blur', function () {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(this.value.trim())) {
    setFieldError('email', 'email-error', 'Please enter a valid email address.');
  } else { clearFieldError('email', 'email-error'); }
});

document.getElementById('password')?.addEventListener('blur', function () {
  if (this.value.length < 6) {
    setFieldError('password', 'password-error', 'Password must be at least 6 characters.');
  } else { clearFieldError('password', 'password-error'); }
});

document.getElementById('confirm-password')?.addEventListener('blur', function () {
  const pw = document.getElementById('password')?.value;
  if (this.value !== pw) {
    setFieldError('confirm-password', 'confirm-error', 'Passwords do not match.');
  } else { clearFieldError('confirm-password', 'confirm-error'); }
});

// ── Attach form submit ────────────────────────────────────────────
document.getElementById('register-form')?.addEventListener('submit', handleRegister);

// ── Redirect already-logged-in users ────────────────────────────
(function checkSession() {
  const user = sessionStorage.getItem('uf_user');
  if (user) window.location.href = 'dashboard.html';
})();
