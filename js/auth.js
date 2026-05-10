/**
 * auth.js — EasyMyStorage Auth Helper
 * All main logic is embedded in index.html inline script.
 * This file only provides fallback helpers and bfcache guards.
 */
'use strict';

// ── Auth Guard (bfcache) ──────────────────────────────────────────
window.addEventListener('pageshow', function(event) {
  if (event.persisted && sessionStorage.getItem('uf_user')) {
    window.location.replace('dashboard.html');
  }
});
