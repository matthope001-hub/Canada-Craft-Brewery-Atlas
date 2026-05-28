// ═══════════════════════════════════════════════════════
// GUEST-GUARD.JS — Read-only guest mode
// Load LAST in guest.html, after main.js.
// Disables every write path and hides edit controls.
// (UI-level read-only: stops casual viewers. The API_URL in
//  config.js is still public, so this is not backend security.)
// ═══════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── 1. Neutralize all write functions ──────────────────
  // toggleVisited is the only check-in entry point (defined in sync.js).
  window.toggleVisited = function (id, event) {
    if (event) event.stopPropagation();
    console.log('Guest mode — check-ins are disabled.');
  };

  // Belt-and-suspenders: stub the cloud writers too, so nothing
  // can POST to the sheet even if called some other way.
  if (typeof window.syncVisitedToCloud === 'function') {
    window.syncVisitedToCloud = function () { return Promise.resolve(); };
  }
  if (typeof window.syncCoordsToSheet === 'function') {
    window.syncCoordsToSheet = function () { return Promise.resolve(); };
  }
  if (typeof window.autoGeocodeIfNeeded === 'function') {
    window.autoGeocodeIfNeeded = function () { return Promise.resolve(false); };
  }

  // ── 2. Hide edit controls ───────────────────────────────
  function hideEditUI() {
    // "Mark Visited" button inside the brewery modal (built dynamically)
    document.querySelectorAll('#visitedBtn').forEach(el => el.remove());

    // "Visited" filter chip in the controls bar
    const chip = document.querySelector('.feat-btn[data-feat="visited"]');
    if (chip) chip.style.display = 'none';
  }

  // Run once the page is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideEditUI);
  } else {
    hideEditUI();
  }

  // The modal is rebuilt every time it opens, so re-hide after each open
  if (typeof window.openModal === 'function') {
    const _origOpenModal = window.openModal;
    window.openModal = function (id) {
      _origOpenModal(id);
      hideEditUI();
    };
  }

  // ── 3. Optional: small "Viewing as guest" banner ────────
  document.addEventListener('DOMContentLoaded', function () {
    const badge = document.createElement('div');
    badge.textContent = 'Read-only guest view';
    badge.style.cssText =
      'position:fixed;top:8px;right:8px;z-index:9999;' +
      'background:rgba(120,190,32,.92);color:#1a1a18;' +
      'font:600 11px/1 sans-serif;letter-spacing:.04em;' +
      'padding:6px 10px;border-radius:14px;pointer-events:none;';
    document.body.appendChild(badge);
  });
})();
