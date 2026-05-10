/**
 * google-auth.js — Google Identity Services integration
 *
 * Used on both index.html (register) and login.html.
 * Replace YOUR_GOOGLE_CLIENT_ID with your actual Client ID
 * from https://console.cloud.google.com/apis/credentials
 *
 * Flow:
 *  1. GSI library loads and calls window.handleGoogleCredential
 *  2. We decode the JWT to extract profile fields
 *  3. POST those to /api/google-auth.php
 *  4. On success, store user + redirect to dashboard
 */

'use strict';

// ── ⚠️  REPLACE WITH YOUR ACTUAL GOOGLE CLIENT ID ────────────────
const GOOGLE_CLIENT_ID = '1068621105944-p1b09h494f45rbc3siaphbv0qghgnipa.apps.googleusercontent.com';

// ── Decode a JWT payload (base64url) without a library ───────────
function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch (e) {
    console.error('[GoogleAuth] JWT decode failed', e);
    return null;
  }
}

// ── Toast helper (works on any page that has #toast-container) ───
function _gToast(message, type = 'error') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `ems-toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 4500);
}

// ── Button loading helper ─────────────────────────────────────────
function _gSetLoading(loading) {
  const btn = document.getElementById('google-btn');
  if (!btn) return;
  if (loading) {
    btn.classList.add('loading');
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent.trim();
    btn.textContent = 'Connecting…';
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText || 'Continue with Google';
  }
}

// ── Called by GSI library after the user selects their account ───
window.handleGoogleCredential = async function (response) {
  _gSetLoading(true);

  const profile = decodeJwtPayload(response.credential);
  if (!profile) {
    _gToast('Failed to read Google profile. Please try again.', 'error');
    _gSetLoading(false);
    return;
  }

  const payload = {
    google_id: profile.sub,
    name: profile.name,
    email: profile.email,
    avatar: profile.picture || ''
  };

  try {
    const res = await fetch('api/google-auth.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    const data = await res.json();

    if (data.success) {
      // Persist user data — use DiceBear avatar from server, not Google photo
      sessionStorage.setItem('uf_user', JSON.stringify({
        ...data.user,
        token: data.token
      }));

      _gToast(data.message, 'success');

      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
    } else {
      _gToast(data.message, 'error');
      _gSetLoading(false);
    }
  } catch (err) {
    _gToast('Network error during Google login.', 'error');
    _gSetLoading(false);
    console.error('[GoogleAuth]', err);
  }
};

// ── Initialise Google Identity Services on page load ─────────────
window.addEventListener('load', () => {
  if (typeof google === 'undefined') {
    // GSI script not yet loaded — silently skip; user will still
    // see the button but clicking it will show a message.
    document.getElementById('google-btn')?.addEventListener('click', () => {
      _gToast('Google Sign-In is not available. Please check your internet connection.', 'info');
    });
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: window.handleGoogleCredential,
    auto_select: false,
    cancel_on_tap_outside: true,
    context: 'signin'
  });

  // Render the official Google Sign-In button directly inside our styled wrapper.
  // This is the most reliable single-click approach — no prompt() needed.
  const googleBtn = document.getElementById('google-btn');
  if (googleBtn) {
    // Clear any existing text/content in the button
    googleBtn.textContent = '';
    googleBtn.style.padding = '0';
    googleBtn.style.overflow = 'hidden';
    googleBtn.style.display = 'flex';
    googleBtn.style.alignItems = 'center';
    googleBtn.style.justifyContent = 'center';

    google.accounts.id.renderButton(googleBtn, {
      theme: 'filled_black',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      width: Math.min(googleBtn.offsetWidth || 400, 400)
    });
  }
});
