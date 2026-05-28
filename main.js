// ═══════════════════════════════════════════════════════
// MAIN.JS - Routes, Modals, Map, and Remaining Functions
// ═══════════════════════════════════════════════════════

// Map-specific state (state variables like currentView, routeActive, etc. are in data.js)
let map = null;
let mapMarkers = [];

// ─────────────────────────────────────────────────────
// FILTER
// ─────────────────────────────────────────────────────
function filterBreweries() {
  render();
  if (currentView === 'map') renderMap();
}

function getFiltered() {
  const q = document.getElementById('searchInput').value.toLowerCase().trim();
  const prov = document.getElementById('provinceFilter').value;
  const type = document.getElementById('typeFilter').value;
  let results = allBreweries.filter(b => {
    if (prov && b.province !== prov) return false;
    if (type && b.type !== type) return false;
    if (activeFeats.has('ocb') && !b.ocb_member) return false;
    if (activeFeats.has('taproom') && !b.taproom) return false;
    if (activeFeats.has('patio') && !b.patio) return false;
    if (activeFeats.has('kitchen') && !b.kitchen) return false;
    if (activeFeats.has('pet') && !b.pet) return false;
    if (activeFeats.has('tours') && !b.tours) return false;
    if (activeFeats.has('accessible') && !b.accessible) return false;
    if (activeFeats.has('visited') && !visitedSet.has(b.id)) return false;
    if (q) {
      const hay = `${b.name} ${b.city} ${b.province} ${b.styles} ${b.region}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  if (routeActive && routeLine) {
    const { from, to } = routeLine;
    const dx = to.lng - from.lng, dy = to.lat - from.lat;
    const lenSq = dx * dx + dy * dy;
    results = results
      .filter(b => b.lat && b.lng && distToSegment(b.lat, b.lng, from.lat, from.lng, to.lat, to.lng) < 100)
      .sort((a, b) => {
        const tA = ((a.lng - from.lng) * dx + (a.lat - from.lat) * dy) / lenSq;
        const tB = ((b.lng - from.lng) * dx + (b.lat - from.lat) * dy) / lenSq;
        return tA - tB;
      });
  } else {
    results.sort((a, b) => {
      if (a.province !== b.province) return a.province.localeCompare(b.province);
      return a.name.localeCompare(b.name);
    });
  }
  return results;
}

function toggleFeat(btn) {
  const f = btn.dataset.feat;
  activeFeats.has(f) ? activeFeats.delete(f) : activeFeats.add(f);
  btn.classList.toggle('active');
  render();
  if (currentView === 'map') renderMap();
}

// ─────────────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────────────
function render() {
  const filtered = getFiltered();
  const grid = document.getElementById('breweryGrid');
  document.getElementById('countDisplay').textContent = filtered.length;
  document.getElementById('statShowing').textContent = filtered.length;

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty"><div class="empty-icon">🍺</div><h3>No Breweries Found</h3><p>Try adjusting your search or filters.</p></div>`;
    return;
  }

  const PAGE = 120;
  const visible = filtered.slice(0, PAGE);
  const overflow = filtered.length > PAGE;

  grid.innerHTML = visible.map(b => {
    const color = PROV_COLORS[b.province] || '#78BE20';
    const styleArr = typeof b.styles === 'string' ? b.styles.split(',').map(s => s.trim()).filter(Boolean) : [];
    const feats = [
      b.taproom && ['🍺', 'Taproom'],
      b.patio && ['☀️', 'Patio'],
      b.kitchen && ['🍔', 'Kitchen'],
      b.pet && ['🐾', 'Pet OK'],
      b.tours && ['🗺️', 'Tours'],
      b.accessible && ['♿', 'Accessible'],
    ].filter(Boolean);
    const mapsUrl = `https://maps.google.com/?q=${b.lat},${b.lng}`;
    const isVisited = visitedSet.has(b.id);
    let visitDate = '';
    if (isVisited && b.visit_date) {
      const dateStr = String(b.visit_date);
      if (dateStr.startsWith('Date(')) {
        const match = dateStr.match(/Date\((\d+),(\d+),(\d+)\)/);
        if (match) {
          visitDate = `${String(parseInt(match[2]) + 1).padStart(2, '0')}/${String(match[3]).padStart(2, '0')}/${match[1].slice(-2)}`;
        }
      } else if (dateStr.includes('T')) {
        // ISO timestamp e.g. 2026-05-27T07:00:00.000Z
        const d = new Date(dateStr);
        if (!isNaN(d)) visitDate = `${String(d.getUTCMonth()+1).padStart(2,'0')}/${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCFullYear()).slice(-2)}`;
      } else if (dateStr.includes('-')) {
        const p = dateStr.split('-');
        if (p.length === 3) visitDate = `${p[1]}/${p[2]}/${p[0].slice(-2)}`;
      } else if (dateStr.includes('/')) {
        visitDate = dateStr;
      }
    }
    return `
    <div class="card ${isVisited ? 'visited' : ''}" style="--province-color:${color}" onclick="openModal('${b.id}')">
      ${isVisited && visitDate ? `<div class="visit-badge">${visitDate}</div>` : ''}
      <div class="card-header">
        <div style="display:flex;gap:7px;align-items:center">
          <div class="province-dot"></div>
          <span class="card-region">${b.province} · ${b.region || b.city}</span>
        </div>
        ${b.ocb_member ? '<span class="ocb-badge">✓ Member</span>' : ''}
      </div>
      <div class="card-name">${b.name}</div>
      <div class="card-city">${b.city}${b.founded ? ' · Est. ' + b.founded : ''}</div>
      <div class="styles">${styleArr.slice(0, 4).map(s => `<span class="style-tag">${s}</span>`).join('')}${styleArr.length > 4 ? `<span class="style-tag">+${styleArr.length - 4}</span>` : ''}</div>
      <div class="features">${feats.slice(0, 4).map(([e, l]) => `<span class="feat-tag">${e} ${l}</span>`).join('')}${feats.length > 4 ? `<span class="feat-tag">+${feats.length - 4} more</span>` : ''}</div>
      <div class="card-footer">
        <a class="btn-directions" href="${mapsUrl}" target="_blank" onclick="event.stopPropagation()">📍 Get Directions</a>
        ${b.website ? `<a class="btn-web" href="${b.website}" target="_blank" onclick="event.stopPropagation()">Web ↗</a>` : ''}
      </div>
    </div>`;
  }).join('') + (overflow ? `<div class="empty" style="grid-column:1/-1;padding:24px;text-align:center"><p style="color:var(--muted);font-size:12px">Showing first ${PAGE} of ${filtered.length} breweries — search or filter to narrow results</p></div>` : '');
}

function formatPhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return raw;
}

function formatPostal(raw, province) {
  if (!raw) return '';
  const s = String(raw).trim().toUpperCase().replace(/\s/g, '');
  // Canadian postal: A1A1A1 → A1A 1A1
  if (/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(s)) return `${s.slice(0,3)} ${s.slice(3)}`;
  // US zip: 12345 or 123456789 → 12345 or 12345-6789
  if (/^\d{5}$/.test(s)) return s;
  if (/^\d{9}$/.test(s)) return `${s.slice(0,5)}-${s.slice(5)}`;
  return raw;
}

function formatWebsite(raw) {
  if (!raw) return '';
  // Strip protocol for display
  return String(raw).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

function formatInstagram(raw) {
  if (!raw) return '';
  return String(raw).startsWith('@') ? raw : '@' + raw;
}

function formatAddress(b) {
  const parts = [b.address, b.city, b.province, formatPostal(b.postal, b.province)].filter(Boolean);
  return parts.join(', ');
}

// ─────────────────────────────────────────────────────
// MODAL  ← FIXES CARD CLICK
// ─────────────────────────────────────────────────────
function openModal(id) {
  const b = allBreweries.find(x => x.id === id);
  if (!b) return;
  const color = PROV_COLORS[b.province] || '#78BE20';
  const styleArr = typeof b.styles === 'string' ? b.styles.split(',').map(s => s.trim()).filter(Boolean) : [];
  const mapsUrl = `https://maps.google.com/?q=${b.lat},${b.lng}`;
  const feats = [
    b.taproom && '🍺 Taproom', b.patio && '☀️ Patio',
    b.kitchen && '🍔 Kitchen', b.pet && '🐾 Pet Friendly',
    b.tours && '🗺️ Tours', b.accessible && '♿ Accessible',
  ].filter(Boolean);

  document.getElementById('modal').innerHTML = `
    <div class="modal-top">
      <div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
          <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>
          <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:${color};letter-spacing:.08em;text-transform:uppercase">${b.province} · ${b.city}</span>
          ${b.ocb_member ? '<span class="ocb-badge">✓ Guild Member</span>' : ''}
        </div>
        <div class="modal-name">${b.name}</div>
        ${b.legal_name && b.legal_name !== b.name ? `<div style="font-size:11px;color:var(--muted);font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">${b.legal_name}</div>` : ''}
      </div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-grid" style="margin-bottom:18px">
      <div class="modal-stat"><div class="modal-stat-val">${b.founded || '—'}</div><div class="modal-stat-label">Founded</div></div>
      <div class="modal-stat"><div class="modal-stat-val" style="text-transform:capitalize">${b.type || '—'}</div><div class="modal-stat-label">Brewery Type</div></div>
    </div>
    <div class="modal-section">
      <div class="modal-section-label">Address</div>
      <div style="font-size:13px;color:var(--ink)">${formatAddress(b)}</div>
      ${b.phone ? `<div style="font-size:12px;color:var(--muted);margin-top:4px">📞 <a href="tel:${b.phone.replace(/\D/g,'')}" style="color:inherit;text-decoration:none">${formatPhone(b.phone)}</a></div>` : ''}
    </div>
    ${styleArr.length ? `<div class="modal-section"><div class="modal-section-label">Beer Styles</div><div class="styles">${styleArr.map(s => `<span class="style-tag">${s}</span>`).join('')}</div></div>` : ''}
    ${feats.length ? `<div class="modal-section"><div class="modal-section-label">Features &amp; Amenities</div><div class="features">${feats.map(f => `<span class="feat-tag">${f}</span>`).join('')}</div></div>` : ''}
    ${b.notes ? `<div class="modal-section"><div class="modal-section-label">Notes</div><div style="font-size:12px;color:var(--muted);line-height:1.7">${b.notes}</div></div>` : ''}
    <div class="modal-section">
      <div class="modal-section-label">Socials &amp; Web</div>
      <div class="social-links">
        ${b.website ? `<a class="social-link" href="${b.website}" target="_blank">🌐 ${formatWebsite(b.website)}</a>` : ''}
        ${b.jeep_post ? `<a class="social-link" href="${b.jeep_post}" target="_blank" style="background:#EDF7D8;border-color:#C5E89A">🚙 Our Visit</a>` : ''}
        ${b.instagram ? `<a class="social-link" href="https://instagram.com/${b.instagram.replace('@', '')}" target="_blank">📸 ${formatInstagram(b.instagram)}</a>` : ''}
        ${b.facebook ? `<a class="social-link" href="https://facebook.com/${b.facebook}" target="_blank">👥 Facebook</a>` : ''}
      </div>
    </div>
    <div class="modal-actions">
      <a class="btn-directions" href="${mapsUrl}" target="_blank">📍 Get Directions</a>
      ${b.website ? `<a class="btn-web" href="${b.website}" target="_blank">Website ↗</a>` : ''}
      <button id="visitedBtn" class="btn-visited ${visitedSet.has(b.id) ? 'marked' : ''}" onclick="toggleVisited('${b.id}', event)">
        ${visitedSet.has(b.id) ? '<img src="/jeep_icon.png" style="width:20px;height:13px;object-fit:contain;vertical-align:middle;margin-right:4px;">Visited!' : '<img src="/jeep_icon.png" style="width:20px;height:13px;object-fit:contain;vertical-align:middle;margin-right:4px;">Mark Visited'}
      </button>
    </div>
    <div class="verified-row">
      <span><span class="status-dot"></span>${b.status || 'active'}</span>
      <span>ID: ${b.id}</span>
      <span>Verified: ${b.verified_date || b.verified || 'pending'}</span>
    </div>`;

  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// toggleVisited is defined in sync.js — do not duplicate here

// ─────────────────────────────────────────────────────
// VISITED LIST + MILESTONES DASHBOARD
// ─────────────────────────────────────────────────────

// Thorold, ON as home base (general Niagara region, no exact address)
const HOME = { lat: 43.1198, lng: -79.1993 };

function parseVisitDate(raw) {
  if (!raw) return null;
  const s = String(raw);
  if (s.startsWith('Date(')) {
    const m = s.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (m) return new Date(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));
  }
  if (s.includes('T')) { const d = new Date(s); return isNaN(d) ? null : d; }
  if (s.includes('-')) { const d = new Date(s); return isNaN(d) ? null : d; }
  return null;
}

function fmtDate(d) {
  if (!d) return '';
  return `${String(d.getUTCMonth ? d.getMonth()+1 : d.getUTCMonth()+1).padStart(2,'0')}/${String(d.getDate ? d.getDate() : d.getUTCDate()).padStart(2,'0')}/${String(d.getFullYear ? d.getFullYear() : d.getUTCFullYear()).slice(-2)}`;
}

function distFrom(b, origin) {
  if (!b.lat || !b.lng) return null;
  return haversine(origin.lat, origin.lng, b.lat, b.lng);
}

function buildMilestones(visited) {
  const CANADIAN_PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];

  // Sort by date for chronological milestones
  const byDate = [...visited].filter(b => parseVisitDate(b.visit_date))
    .sort((a,b) => parseVisitDate(a.visit_date) - parseVisitDate(b.visit_date));

  const withCoords = visited.filter(b => b.lat && b.lng);
  const distances  = withCoords.map(b => ({ b, km: distFrom(b, HOME) }));

  const furthest  = distances.length ? distances.reduce((a,c) => c.km > a.km ? c : a) : null;
  const closest   = distances.length ? distances.reduce((a,c) => c.km < a.km ? c : a) : null;
  const northmost = withCoords.length ? withCoords.reduce((a,c) => c.lat > a.lat ? c : a) : null;
  const southmost = withCoords.length ? withCoords.reduce((a,c) => c.lat < a.lat ? c : a) : null;
  const eastmost  = withCoords.length ? withCoords.reduce((a,c) => c.lng > a.lng ? c : a) : null;
  const westmost  = withCoords.length ? withCoords.reduce((a,c) => c.lng < a.lng ? c : a) : null;

  const provinces = [...new Set(visited.map(b => b.province).filter(Boolean))];
  const canadianProvsVisited = provinces.filter(p => CANADIAN_PROVINCES.includes(p));
  const hasUS = visited.some(b => !CANADIAN_PROVINCES.includes(b.province));

  const countMilestones = [
    { count: 1,   emoji: '🏁', label: 'First Brewery' },
    { count: 5,   emoji: '⭐', label: '5 Breweries' },
    { count: 10,  emoji: '🔟', label: '10 Breweries' },
    { count: 25,  emoji: '🥉', label: '25 Breweries' },
    { count: 50,  emoji: '🥈', label: '50 Breweries' },
    { count: 100, emoji: '🥇', label: '100 Breweries' },
    { count: 200, emoji: '🏆', label: '200 Breweries' },
    { count: 500, emoji: '🍺', label: '500 Breweries' },
  ];

  const provMilestones = [
    { count: 1,  emoji: '🍁', label: 'First Canadian Province' },
    { count: 3,  emoji: '🍁🍁', label: '3 Provinces' },
    { count: 5,  emoji: '🍁🍁🍁', label: '5 Provinces' },
    { count: 10, emoji: '🇨🇦', label: 'All 10 Provinces!' },
  ];

  let html = `<div style="margin-bottom:24px;">`;

  // ── STATS ROW ──
  html += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px;">
    <div style="background:#f5f2ec;border-radius:10px;padding:14px;text-align:center;">
      <div style="font-size:28px;font-weight:800;color:#78BE20;">${visited.length}</div>
      <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.08em;">Breweries</div>
    </div>
    <div style="background:#f5f2ec;border-radius:10px;padding:14px;text-align:center;">
      <div style="font-size:28px;font-weight:800;color:#78BE20;">${canadianProvsVisited.length}</div>
      <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.08em;">Provinces</div>
    </div>
    <div style="background:#f5f2ec;border-radius:10px;padding:14px;text-align:center;">
      <div style="font-size:28px;font-weight:800;color:#78BE20;">${furthest ? Math.round(furthest.km).toLocaleString() : '—'}</div>
      <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.08em;">Max km</div>
    </div>
  </div>`;

  // ── COUNT MILESTONES ──
  html += `<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#aaa;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #eee;">Visit Count Milestones</div>`;
  html += `<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">`;
  countMilestones.forEach(m => {
    const earned = visited.length >= m.count;
    const brew   = byDate[m.count - 1];
    const detail = earned && brew ? ` — ${brew.name}${brew.city ? ', '+brew.city : ''}` : '';
    html += `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:${earned ? '#EDF7D8' : '#f9f9f9'};border:1px solid ${earned ? '#C5E89A' : '#eee'};">
      <span style="font-size:20px;${earned ? '' : 'filter:grayscale(1);opacity:.4;'}">${m.emoji}</span>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:600;color:${earned ? '#1a1a18' : '#aaa'};">${m.label}</div>
        ${earned ? `<div style="font-size:11px;color:#5fa012;">${detail}</div>` : `<div style="font-size:11px;color:#ccc;">${m.count - visited.length} more to go</div>`}
      </div>
      ${earned ? '<span style="color:#78BE20;font-size:16px;">✓</span>' : ''}
    </div>`;
  });
  html += `</div>`;

  // ── PROVINCE MILESTONES ──
  html += `<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#aaa;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #eee;">Province Milestones</div>`;
  html += `<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">`;
  provMilestones.forEach(m => {
    const earned = canadianProvsVisited.length >= m.count;
    html += `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:${earned ? '#EDF7D8' : '#f9f9f9'};border:1px solid ${earned ? '#C5E89A' : '#eee'};">
      <span style="font-size:20px;${earned ? '' : 'filter:grayscale(1);opacity:.4;'}">${m.emoji}</span>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:600;color:${earned ? '#1a1a18' : '#aaa'};">${m.label}</div>
        ${earned ? `<div style="font-size:11px;color:#5fa012;">${canadianProvsVisited.length}/10 provinces visited</div>` : `<div style="font-size:11px;color:#ccc;">${m.count - canadianProvsVisited.length} more provinces to go</div>`}
      </div>
      ${earned ? '<span style="color:#78BE20;font-size:16px;">✓</span>' : ''}
    </div>`;
  });
  // US milestone
  html += `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:${hasUS ? '#EDF7D8' : '#f9f9f9'};border:1px solid ${hasUS ? '#C5E89A' : '#eee'};">
    <span style="font-size:20px;${hasUS ? '' : 'filter:grayscale(1);opacity:.4;'}">🇺🇸</span>
    <div style="flex:1;">
      <div style="font-size:13px;font-weight:600;color:${hasUS ? '#1a1a18' : '#aaa'};">First US Brewery</div>
      ${hasUS ? `<div style="font-size:11px;color:#5fa012;">${visited.filter(b=>!CANADIAN_PROVINCES.includes(b.province)).length} US breweries visited</div>` : `<div style="font-size:11px;color:#ccc;">Cross the border!</div>`}
    </div>
    ${hasUS ? '<span style="color:#78BE20;font-size:16px;">✓</span>' : ''}
  </div>`;
  html += `</div>`;

  // ── GEOGRAPHIC RECORDS ──
  html += `<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#aaa;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #eee;">Geographic Records</div>`;
  html += `<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">`;

  const geoRecords = [
    { emoji: '🗺️', label: 'Furthest from Home', b: furthest?.b, detail: furthest ? `${Math.round(furthest.km).toLocaleString()} km away` : null },
    { emoji: '📍', label: 'Closest to Home',    b: closest?.b,  detail: closest  ? `${Math.round(closest.km).toLocaleString()} km away` : null },
    { emoji: '⬆️', label: 'Northernmost',        b: northmost,   detail: northmost ? `${northmost.city}, ${northmost.province}` : null },
    { emoji: '⬇️', label: 'Southernmost',        b: southmost,   detail: southmost ? `${southmost.city}, ${southmost.province}` : null },
    { emoji: '➡️', label: 'Easternmost',         b: eastmost,    detail: eastmost  ? `${eastmost.city}, ${eastmost.province}` : null },
    { emoji: '⬅️', label: 'Westernmost',         b: westmost,    detail: westmost  ? `${westmost.city}, ${westmost.province}` : null },
  ];

  geoRecords.forEach(r => {
    const earned = !!r.b;
    html += `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:${earned ? '#EDF7D8' : '#f9f9f9'};border:1px solid ${earned ? '#C5E89A' : '#eee'};" ${earned ? `onclick="openModal('${r.b.id}');document.getElementById('visitedListOverlay').classList.remove('open');" style="cursor:pointer;"` : ''}>
      <span style="font-size:20px;">${r.emoji}</span>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:600;color:${earned ? '#1a1a18' : '#aaa'};">${r.label}</div>
        ${earned ? `<div style="font-size:11px;color:#5fa012;">${r.b.name} — ${r.detail}</div>` : `<div style="font-size:11px;color:#ccc;">Visit more breweries to unlock</div>`}
      </div>
      ${earned ? '<span style="color:#78BE20;font-size:12px;">↗</span>' : ''}
    </div>`;
  });
  html += `</div>`;

  // ── FIRST BREWERY ──
  if (byDate.length) {
    const first = byDate[0];
    html += `<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#aaa;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #eee;">Hall of Fame</div>`;
    html += `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:#EDF7D8;border:1px solid #C5E89A;cursor:pointer;" onclick="openModal('${first.id}');document.getElementById('visitedListOverlay').classList.remove('open');">
      <span style="font-size:20px;">🏁</span>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:600;color:#1a1a18;">First Brewery Ever Visited</div>
        <div style="font-size:11px;color:#5fa012;">${first.name} — ${first.city}, ${first.province} · ${fmtDate(parseVisitDate(first.visit_date))}</div>
      </div>
      <span style="color:#78BE20;font-size:12px;">↗</span>
    </div>`;
  }

  html += `</div>`;
  return html;
}

function showVisitedList() {
  const visited = allBreweries.filter(b => visitedSet.has(b.id));
  const byProvince = [...visited].sort((a, b) => {
    if (a.province !== b.province) return a.province.localeCompare(b.province);
    return a.name.localeCompare(b.name);
  });
  const provinceNames = {
    'ON':'Ontario','BC':'British Columbia','AB':'Alberta','QC':'Quebec',
    'MB':'Manitoba','SK':'Saskatchewan','NS':'Nova Scotia','NB':'New Brunswick',
    'PE':'Prince Edward Island','NL':'Newfoundland & Labrador',
    'AL':'Alabama','FL':'Florida','GA':'Georgia','KY':'Kentucky',
    'NC':'North Carolina','NY':'New York','OH':'Ohio','PA':'Pennsylvania',
    'SC':'South Carolina','TN':'Tennessee','VA':'Virginia','WV':'West Virginia'
  };

  if (!visited.length) {
    document.getElementById('visitedListContent').innerHTML = `
      <div style="text-align:center;padding:40px;color:#999;">
        <div style="font-size:48px;margin-bottom:12px;">🍺</div>
        <p>No visited breweries yet.<br>Start checking in!</p>
      </div>`;
  } else {
    // ── TABS ──
    let html = `
      <div style="display:flex;gap:4px;background:#f0ede8;border-radius:8px;padding:3px;margin-bottom:20px;">
        <button onclick="switchVisitedTab('milestones')" id="tabMilestones" style="flex:1;padding:8px;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;background:#1a1a18;color:#fff;">🏆 Milestones</button>
        <button onclick="switchVisitedTab('list')" id="tabList" style="flex:1;padding:8px;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;background:transparent;color:#888;">📋 All Visits (${visited.length})</button>
      </div>
      <div id="visitedTabMilestones">${buildMilestones(visited)}</div>
      <div id="visitedTabList" style="display:none;">`;

    let currentProvince = '';
    byProvince.forEach(b => {
      if (b.province !== currentProvince) {
        if (currentProvince !== '') html += '</div>';
        currentProvince = b.province;
        html += `<div style="margin-bottom:24px;"><h3 style="color:#78BE20;border-bottom:2px solid #78BE20;padding-bottom:8px;margin-bottom:12px;">${provinceNames[currentProvince] || currentProvince}</h3>`;
      }
      let visitDate = '';
      if (b.visit_date) {
        const d = parseVisitDate(b.visit_date);
        if (d) visitDate = fmtDate(d);
      }
      html += `<div style="padding:12px;border-bottom:1px solid #eee;cursor:pointer;transition:background .15s;"
        onclick="openModal('${b.id}');document.getElementById('visitedListOverlay').classList.remove('open');"
        onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
        <div style="font-weight:600;color:#333;margin-bottom:2px;">${b.name}</div>
        <div style="font-size:12px;color:#888;">${b.city}${visitDate ? ` · ${visitDate}` : ''}</div>
      </div>`;
    });
    html += `</div><div style="margin-top:24px;padding-top:16px;border-top:2px solid #eee;text-align:center;color:#999;font-size:13px;"><strong>${visited.length}</strong> ${visited.length === 1 ? 'brewery' : 'breweries'} visited</div></div>`;

    document.getElementById('visitedListContent').innerHTML = html;
  }
  const overlay = document.getElementById('visitedListOverlay');
  if (overlay) overlay.classList.add('open');
}

function switchVisitedTab(tab) {
  const milestones = document.getElementById('visitedTabMilestones');
  const list       = document.getElementById('visitedTabList');
  const tabM       = document.getElementById('tabMilestones');
  const tabL       = document.getElementById('tabList');
  if (tab === 'milestones') {
    milestones.style.display = ''; list.style.display = 'none';
    tabM.style.background = '#1a1a18'; tabM.style.color = '#fff';
    tabL.style.background = 'transparent'; tabL.style.color = '#888';
  } else {
    milestones.style.display = 'none'; list.style.display = '';
    tabL.style.background = '#1a1a18'; tabL.style.color = '#fff';
    tabM.style.background = 'transparent'; tabM.style.color = '#888';
  }
}

function closeVisitedList(event) {
  if (!event || event.target.id === 'visitedListOverlay') {
    document.getElementById('visitedListOverlay').classList.remove('open');
  }
}

// ─────────────────────────────────────────────────────
// MAP VIEW
// ─────────────────────────────────────────────────────
function setView(view) {
  currentView = view;
  const gridWrap = document.getElementById('gridWrap');
  const mapView = document.getElementById('mapView');
  const btnGrid = document.getElementById('btnGrid');
  const btnMap = document.getElementById('btnMap');
  const routeBar = document.getElementById('routePlanner');
  if (view === 'map') {
    gridWrap.classList.add('hidden'); mapView.classList.add('active');
    btnGrid.classList.remove('active'); btnMap.classList.add('active');
    routeBar.classList.add('active');
    initMap(); renderMap();
  } else {
    gridWrap.classList.remove('hidden'); mapView.classList.remove('active');
    btnGrid.classList.add('active'); btnMap.classList.remove('active');
    routeBar.classList.remove('active');
    render();
  }
}

function initMap() {
  if (map) return;
  map = L.map('mapView').setView([44.5, -76.5], 5);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap © CARTO', maxZoom: 19 }).addTo(map);
  renderMap();
}

function renderMap() {
  if (!map || typeof L === 'undefined') return;
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];
  const filtered = getFiltered().filter(b => b.lat && b.lng);
  filtered.forEach(b => {
    const color = PROV_COLORS[b.province] || '#78BE20';
    const isVisited = visitedSet.has(b.id);
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:${isVisited ? 14 : 10}px;height:${isVisited ? 14 : 10}px;background:${isVisited ? '#78BE20' : color};border-radius:50%;border:2px solid ${isVisited ? '#fff' : 'rgba(255,255,255,0.4)'};box-shadow:0 0 ${isVisited ? '8px #78BE2088' : '4px rgba(0,0,0,0.5)'};cursor:pointer;"></div>`,
      iconSize: [isVisited ? 14 : 10, isVisited ? 14 : 10],
      iconAnchor: [isVisited ? 7 : 5, isVisited ? 7 : 5]
    });
    const marker = L.marker([b.lat, b.lng], { icon }).addTo(map);
    marker.on('click', () => openModal(b.id));
    mapMarkers.push(marker);
  });
}

// ─────────────────────────────────────────────────────
// ROUTE PLANNER
// ─────────────────────────────────────────────────────
function distToSegment(lat, lng, lat1, lng1, lat2, lng2) {
  const dx = lat2 - lat1, dy = lng2 - lng1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq ? ((lat - lat1) * dx + (lng - lng1) * dy) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const nearLat = lat1 + t * dx, nearLng = lng1 + t * dy;
  return haversine(lat, lng, nearLat, nearLng);
}

async function geocode(place) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`);
  const data = await res.json();
  if (!data.length) throw new Error(`Could not find "${place}"`);
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), name: data[0].display_name.split(',')[0] };
}

async function planRoute() {
  const fromStr = document.getElementById('routeFrom').value.trim();
  const toStr = document.getElementById('routeTo').value.trim();
  if (!fromStr || !toStr) { alert('Enter both a start and end location.'); return; }
  const status = document.getElementById('routeStatus');
  status.textContent = 'Geocoding…';
  try {
    const [from, to] = await Promise.all([geocode(fromStr), geocode(toStr)]);
    routeLine = { from, to }; routeActive = true;
    const totalKm = Math.round(haversine(from.lat, from.lng, to.lat, to.lng));
    status.innerHTML = `${from.name} → ${to.name} <span class="route-km-badge">${totalKm.toLocaleString()} km straight-line</span>`;
    document.getElementById('routeClearBtn').style.display = 'inline-block';
    render();
    if (currentView === 'map' && map && typeof L !== 'undefined') {
      if (window._routePolyline) map.removeLayer(window._routePolyline);
      window._routePolyline = L.polyline([[from.lat, from.lng], [to.lat, to.lng]], { color: '#78BE20', weight: 3, dashArray: '8,6', opacity: 0.7 }).addTo(map);
      map.fitBounds([[from.lat, from.lng], [to.lat, to.lng]], { padding: [60, 60] });
    }
  } catch (e) { status.textContent = e.message; }
}

function clearRoute() {
  routeActive = false; routeLine = null;
  document.getElementById('routeStatus').textContent = '';
  document.getElementById('routeClearBtn').style.display = 'none';
  if (window._routePolyline && map) map.removeLayer(window._routePolyline);
  render();
}

// ─────────────────────────────────────────────────────
// KEYBOARD SHORTCUTS
// ─────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('modalOverlay')?.classList.remove('open');
    document.body.style.overflow = '';
  }
});

// ═══════════════════════════════════════════════════════
// Initialize after DOM is loaded
// ═══════════════════════════════════════════════════════
function startApp() {
  if (!document.getElementById('breweryGrid') ||
      !document.getElementById('searchInput')) {
    setTimeout(startApp, 50);
    return;
  }
  init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  setTimeout(startApp, 0);
}
