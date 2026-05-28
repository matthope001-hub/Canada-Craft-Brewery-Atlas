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

  // ── 3. Welcome banner under the hero (always visible) ───
  function addWelcomeBanner() {
    if (document.getElementById('guestBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'guestBanner';
    banner.innerHTML =
      '<span style="font-size:14px;">👋</span>' +
      '<span><strong>Welcome, guest!</strong> ' +
      'You\u2019re viewing Jeep &amp; Ginger Brew Atlas in read-only mode \u2014 ' +
      'browse, search, and explore the map. Check-ins are disabled.</span>';
    banner.style.cssText =
      'display:flex;align-items:center;gap:10px;' +
      'background:#EDF7D8;border-bottom:1px solid #C5E89A;' +
      'color:#3a5a10;font:500 12px/1.4 "DM Sans",sans-serif;' +
      'letter-spacing:.01em;padding:12px 16px;';

    // Insert directly after the hero, before the stats bar
    const hero = document.querySelector('.hero');
    const statsBar = document.querySelector('.stats-bar');
    if (statsBar) {
      statsBar.parentNode.insertBefore(banner, statsBar);
    } else if (hero) {
      hero.parentNode.insertBefore(banner, hero.nextSibling);
    } else {
      document.body.insertBefore(banner, document.body.firstChild);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addWelcomeBanner);
  } else {
    addWelcomeBanner();
  }
})();
