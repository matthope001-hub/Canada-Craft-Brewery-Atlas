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
      } else if (dateStr.includes('-')) {
        const p = dateStr.split('-');
        if (p.length === 3) visitDate = `${p[1]}/${p[2]}/${p[0].slice(-2)}`;
      } else if (dateStr.includes('/')) { visitDate = dateStr; }
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
      <div style="font-size:13px;color:var(--ink)">${b.address}, ${b.city}, ${b.province} ${b.postal}</div>
      ${b.phone ? `<div style="font-size:12px;color:var(--muted);margin-top:4px">📞 ${b.phone}</div>` : ''}
    </div>
    ${styleArr.length ? `<div class="modal-section"><div class="modal-section-label">Beer Styles</div><div class="styles">${styleArr.map(s => `<span class="style-tag">${s}</span>`).join('')}</div></div>` : ''}
    ${feats.length ? `<div class="modal-section"><div class="modal-section-label">Features &amp; Amenities</div><div class="features">${feats.map(f => `<span class="feat-tag">${f}</span>`).join('')}</div></div>` : ''}
    ${b.notes ? `<div class="modal-section"><div class="modal-section-label">Notes</div><div style="font-size:12px;color:var(--muted);line-height:1.7">${b.notes}</div></div>` : ''}
    <div class="modal-section">
      <div class="modal-section-label">Socials &amp; Web</div>
      <div class="social-links">
        ${b.website ? `<a class="social-link" href="${b.website}" target="_blank">🌐 Website</a>` : ''}
        ${b.jeep_post ? `<a class="social-link" href="${b.jeep_post}" target="_blank" style="background:#EDF7D8;border-color:#C5E89A">🚙 Our Visit</a>` : ''}
        ${b.instagram ? `<a class="social-link" href="https://instagram.com/${b.instagram.replace('@', '')}" target="_blank">📸 Instagram</a>` : ''}
        ${b.facebook ? `<span class="social-link">Facebook: ${b.facebook}</span>` : ''}
      </div>
    </div>
    <div class="modal-actions">
      <a class="btn-directions" href="${mapsUrl}" target="_blank">📍 Get Directions</a>
      ${b.website ? `<a class="btn-web" href="${b.website}" target="_blank">Website ↗</a>` : ''}
      <button id="visitedBtn" class="btn-visited ${visitedSet.has(b.id) ? 'marked' : ''}" onclick="toggleVisited('${b.id}', event)">
        ${visitedSet.has(b.id) ? '✅ Visited!' : '🚙 Mark Visited'}
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
// VISITED LIST
// ─────────────────────────────────────────────────────
function showVisitedList() {
  const visited = allBreweries.filter(b => visitedSet.has(b.id)).sort((a, b) => {
    if (a.province !== b.province) return a.province.localeCompare(b.province);
    return a.name.localeCompare(b.name);
  });
  const provinceNames = {
    'ON': 'Ontario', 'BC': 'British Columbia', 'AB': 'Alberta', 'QC': 'Quebec',
    'MB': 'Manitoba', 'SK': 'Saskatchewan', 'NS': 'Nova Scotia', 'NB': 'New Brunswick',
    'PE': 'Prince Edward Island', 'NL': 'Newfoundland & Labrador',
    'AL': 'Alabama', 'NY': 'New York', 'PA': 'Pennsylvania', 'OH': 'Ohio',
    'KY': 'Kentucky', 'TN': 'Tennessee', 'WV': 'West Virginia', 'VA': 'Virginia',
    'NC': 'North Carolina', 'SC': 'South Carolina', 'GA': 'Georgia', 'FL': 'Florida'
  };
  if (!visited.length) {
    document.getElementById('visitedListContent').innerHTML = '<p style="text-align:center;color:#999;padding:40px;">No visited breweries yet.</p>';
  } else {
    let html = '', currentProvince = '';
    visited.forEach(b => {
      if (b.province !== currentProvince) {
        if (currentProvince !== '') html += '</div>';
        currentProvince = b.province;
        html += `<div style="margin-bottom:30px;"><h3 style="color:#78BE20;border-bottom:2px solid #78BE20;padding-bottom:8px;margin-bottom:16px;">${provinceNames[currentProvince] || currentProvince}</h3>`;
      }
      let visitDate = '';
      if (b.visit_date) {
        const dateStr = String(b.visit_date);
        if (dateStr.startsWith('Date(')) {
          const match = dateStr.match(/Date\((\d+),(\d+),(\d+)\)/);
          if (match) visitDate = `${String(parseInt(match[2]) + 1).padStart(2, '0')}/${String(match[3]).padStart(2, '0')}/${match[1].slice(-2)}`;
        } else if (dateStr.includes('-')) { const p = dateStr.split('-'); if (p.length === 3) visitDate = `${p[1]}/${p[2]}/${p[0].slice(-2)}`; }
        else { visitDate = dateStr; }
      }
      html += `<div style="padding:12px;border-bottom:1px solid #eee;cursor:pointer;transition:background 0.2s;"
        onclick="openModal('${b.id}');document.getElementById('visitedListOverlay').style.display='none';"
        onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
        <div style="font-weight:600;color:#333;margin-bottom:4px;">${b.name}</div>
        <div style="font-size:14px;color:#666;">${b.city}${visitDate ? ` • Visited: ${visitDate}` : ''}</div>
      </div>`;
    });
    html += '</div>';
    html += `<div style="margin-top:30px;padding-top:20px;border-top:2px solid #eee;text-align:center;color:#999;"><strong>${visited.length}</strong> ${visited.length === 1 ? 'brewery' : 'breweries'} visited</div>`;
    document.getElementById('visitedListContent').innerHTML = html;
  }
  const overlay = document.getElementById('visitedListOverlay');
  if (overlay) { overlay.classList.add('open'); }
}

function closeVisitedList(event) {
  if (!event || event.target.id === 'visitedListOverlay') {
    const overlay = document.getElementById('visitedListOverlay');
    overlay.classList.remove('open');
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
