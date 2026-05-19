// ═══════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════
const SHEET_ID = '1071nhgKo4kStR5KkikpWEq8LKKDnMqE7FOhp3wZv9dw';

// Province/State colors
const PROV_COLORS = {
  // Canada
  ON:'#E8672A', BC:'#2A7BE8', AB:'#D4A017', QC:'#C4392F',
  MB:'#8A3DBF', SK:'#1D9E6E', NB:'#D4681A', NS:'#C4293A',
  PE:'#A0522D', NL:'#3A5EC4',
  // Nashville Run
  NY:'#1565C0', PA:'#4527A0', OH:'#00838F', KY:'#558B2F', TN:'#6A1B9A',
  // Florida Run
  WV:'#37474F', VA:'#AD1457', NC:'#00695C', SC:'#4E342E', GA:'#BF360C', FL:'#0277BD'
};

// US state name map for Open Brewery DB API
const US_STATES = {
  NY:'new_york', PA:'pennsylvania', OH:'ohio', KY:'kentucky', TN:'tennessee',
  WV:'west_virginia', VA:'virginia', NC:'north_carolina', SC:'south_carolina',
  GA:'georgia', FL:'florida'
};

// ── HAVERSINE DISTANCE (km) ────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── DASHBOARD UPDATE ───────────────────────────────────
function updateDashboard() {
  // Visited breweries in Sheet order (jeep_post rows come first since Sheet is chronological)
  const visited = allBreweries.filter(b => b.jeep_post && b.lat && b.lng);

  // Total km: chain distance between consecutive visited stops
  let totalKm = 0;
  for (let i = 1; i < visited.length; i++) {
    totalKm += haversine(visited[i-1].lat, visited[i-1].lng, visited[i].lat, visited[i].lng);
  }

  const provinces = new Set(visited.map(b => b.province).filter(Boolean));
  const avgKm = visited.length > 1 ? Math.round(totalKm / (visited.length - 1)) : 0;

  document.getElementById('dashVisited').textContent   = visited.length;
  document.getElementById('dashKm').textContent        = Math.round(totalKm).toLocaleString();
  document.getElementById('dashProvinces').textContent = provinces.size;
  document.getElementById('dashAvgKm').textContent     = visited.length > 1 ? avgKm : '—';

  // Trail route dots
  const trailEl = document.getElementById('trailList');
  if (!visited.length) {
    trailEl.innerHTML = '<span class="trail-empty">No visited breweries yet — add a jeep_post URL to your Sheet to start tracking.</span>';
    return;
  }
  trailEl.innerHTML = visited.map((b, i) => `
    <div class="trail-stop">
      <div class="trail-dot" title="${b.name} · ${b.city}" onclick="openModal('${b.id}')">${i+1}</div>
      ${i < visited.length - 1 ? '<div class="trail-line"></div>' : ''}
    </div>
  `).join('');
}

// ── VISITED STATE ──────────────────────────────────────
const visitedSet = new Set(JSON.parse(localStorage.getItem('visitedBreweries') || '[]'));
function saveVisited() { localStorage.setItem('visitedBreweries', JSON.stringify([...visitedSet])); }
function toggleVisited(id, event) {
  event.stopPropagation();
  visitedSet.has(id) ? visitedSet.delete(id) : visitedSet.add(id);
  saveVisited();
  updateVisitedStat();
  render();
  const btn = document.getElementById('visitedBtn');
  if (btn) {
    btn.textContent = visitedSet.has(id) ? '✅ Visited!' : '🚙 Mark Visited';
    btn.classList.toggle('marked', visitedSet.has(id));
  }
}
function updateVisitedStat() {
  document.getElementById('statVisited').textContent = visitedSet.size;
}

// ─────────────────────────────────────────────────────
// SAMPLE DATA
// ─────────────────────────────────────────────────────
const SAMPLE_DATA = [
  {
    id:'b001', name:'Collective Arts Brewing', legal_name:'Collective Arts Brewing Co.',
    province:'ON', city:'Hamilton', region:'Niagara & Hamilton', type:'micro',
    lat:43.2664, lng:-79.8370, address:'207 Burlington St E', postal:'L8L 4H2',
    phone:'905-528-8017', website:'https://collectiveartsbrewing.com',
    instagram:'@collectiveartsbrewing', facebook:'collectivearts', untappd:'collectiveartsbrewing',
    taproom:true, patio:true, kitchen:true, pet:true, tours:true, accessible:true,
    styles:'IPA, Lager, Sour, Stout, Pale Ale', founded:2013, ocb_member:true,
    status:'active', verified_date:'2025-01-15', notes:'Known for artist-designed can labels.'
  },
  {
    id:'b002', name:'Bellwoods Brewery', legal_name:'Bellwoods Brewery Inc.',
    province:'ON', city:'Toronto', region:'Greater Toronto Area', type:'micro',
    lat:43.6480, lng:-79.4220, address:'124 Ossington Ave', postal:'M6J 2Z5',
    phone:'416-535-4586', website:'https://bellwoodsbrewery.com',
    instagram:'@bellwoodsbrewery', facebook:'bellwoodsbrewery', untappd:'bellwoods_brewery',
    taproom:true, patio:true, kitchen:true, pet:false, tours:false, accessible:false,
    styles:'Wild Ale, Sour, IPA, Stout, Farmhouse', founded:2012, ocb_member:true,
    status:'active', verified_date:'2025-01-15', notes:'Famous for wild and mixed-fermentation ales.'
  },
  {
    id:'b003', name:"Beau's All Natural Brewing", legal_name:"Beau's All Natural Brewing Company",
    province:'ON', city:'Vankleek Hill', region:'Eastern Ontario & Cottage Country', type:'regional',
    lat:45.5217, lng:-74.6570, address:'10 Terry Fox Dr', postal:'K0B 1R0',
    phone:'866-585-2337', website:'https://beaus.ca',
    instagram:'@beausbeer', facebook:'beausbeer', untappd:'beaus_all_natural',
    taproom:true, patio:true, kitchen:true, pet:true, tours:true, accessible:true,
    styles:'Lager, IPA, Wit, Seasonal', founded:2006, ocb_member:true,
    status:'active', verified_date:'2025-01-15', notes:'Famous for Oktoberfest. Employee-owned.'
  },
  {
    id:'b004', name:'Garrison Brewing', legal_name:'Garrison Brewing Company',
    province:'NS', city:'Halifax', region:'Halifax Regional Municipality', type:'micro',
    lat:44.6488, lng:-63.5752, address:'1149 Marginal Rd', postal:'B3H 4P7',
    phone:'902-453-5343', website:'https://garrisonbrewing.com',
    instagram:'@garrisonbrewing', facebook:'garrisonbrewing', untappd:'garrison_brewing',
    taproom:true, patio:true, kitchen:false, pet:true, tours:true, accessible:true,
    styles:'IPA, Stout, Wheat, Seasonal, Lager', founded:1997, ocb_member:false,
    status:'active', verified_date:'2025-01-15', notes:'Halifax waterfront. One of Atlantic Canada\'s largest.'
  },
];

// ─────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────
let allBreweries = [];
let activeFeats  = new Set();

// ─────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────
async function init() {
  try {
    const url  = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Breweries`;
    const res  = await fetch(url);
    const text = await res.text();
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const cols = json.table.cols.map(c => c.label.toLowerCase().trim());
    const rows = json.table.rows.map(row => {
      const obj = {};
      cols.forEach((col, i) => {
        const cell = row.c && row.c[i];
        obj[col] = cell && cell.v !== null && cell.v !== undefined ? cell.v : '';
      });
      ['taproom','patio','kitchen','pet','tours','accessible','ocb_member'].forEach(k => {
        obj[k] = obj[k] === true || obj[k] === 'TRUE' || obj[k] === 'true' || obj[k] === 1;
      });
      obj.lat = parseFloat(obj.lat) || 0;
      obj.lng = parseFloat(obj.lng) || 0;
      return obj;
    });
    allBreweries = rows.filter(b => b.name && (!b.status || b.status === 'active'));
    allBreweries.forEach(b => { if (b.jeep_post) visitedSet.add(b.id); });
  } catch(e) {
    console.warn('Sheet load failed — using sample data:', e);
    allBreweries = SAMPLE_DATA;
  }

  // ── FETCH US BREWERIES FROM OPEN BREWERY DB ────────────
  document.getElementById('breweryGrid').innerHTML =
    '<div class="empty"><div class="empty-icon">🍺</div><h3>LOADING US BREWERIES...</h3><p>Fetching all 11 states along your routes.</p></div>';

  try {
    const stateCodes = Object.keys(US_STATES);
    const fetches = stateCodes.map(async code => {
      const stateName = US_STATES[code];
      // Fetch up to 200 per state (API max per_page=200)
      const pages = [1, 2, 3];
      const results = await Promise.all(pages.map(p =>
        fetch(`https://api.openbrewerydb.org/v1/breweries?by_state=${stateName}&per_page=200&page=${p}&by_type=micro,brewpub,nano,regional,large,planning,contract,proprietor`)
          .then(r => r.json()).catch(() => [])
      ));
      return results.flat().map(b => ({
        id:       'us_' + b.id,
        name:     b.name,
        province: code,
        city:     b.city,
        region:   b.state,
        type:     b.brewery_type,
        lat:      parseFloat(b.latitude)  || 0,
        lng:      parseFloat(b.longitude) || 0,
        address:  b.street || '',
        postal:   b.postal_code || '',
        phone:    b.phone || '',
        website:  b.website_url || '',
        styles:   '',
        founded:  '',
        ocb_member: false,
        taproom:  true,
        patio:    false, kitchen:false, pet:false, tours:false, accessible:false,
        status:   'active',
        notes:    `Open Brewery DB · ${b.brewery_type}`
      })).filter(b => b.name && b.lat && b.lng);
    });

    const usResults = await Promise.all(fetches);
    const usBreweries = usResults.flat();
    allBreweries = [...allBreweries, ...usBreweries];
    console.log(`Loaded ${usBreweries.length} US breweries across ${stateCodes.length} states`);
  } catch(e) {
    console.warn('US brewery fetch failed:', e);
  }

  updateStats();
  render();
}

// ─────────────────────────────────────────────────────
// FILTER
// ─────────────────────────────────────────────────────
function getFiltered() {
  const q    = document.getElementById('searchInput').value.toLowerCase().trim();
  const prov = document.getElementById('provinceFilter').value;
  const type = document.getElementById('typeFilter').value;
  let results = allBreweries.filter(b => {
    if (prov && b.province !== prov) return false;
    if (type && b.type !== type) return false;
    if (activeFeats.has('ocb')        && !b.ocb_member)           return false;
    if (activeFeats.has('taproom')    && !b.taproom)              return false;
    if (activeFeats.has('patio')      && !b.patio)                return false;
    if (activeFeats.has('kitchen')    && !b.kitchen)              return false;
    if (activeFeats.has('pet')        && !b.pet)                  return false;
    if (activeFeats.has('tours')      && !b.tours)                return false;
    if (activeFeats.has('accessible') && !b.accessible)           return false;
    if (activeFeats.has('visited')    && !visitedSet.has(b.id))   return false;
    if (q) {
      const hay = `${b.name} ${b.city} ${b.province} ${b.styles} ${b.region}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  // Route sorting — filter to within 100km of route line, sorted in road-trip order
  if (routeActive && routeLine) {
    const { from, to } = routeLine;
    const dx = to.lng - from.lng, dy = to.lat - from.lat;
    const lenSq = dx*dx + dy*dy;
    results = results
      .filter(b => b.lat && b.lng && distToSegment(b.lat, b.lng, from.lat, from.lng, to.lat, to.lng) < 100)
      .sort((a, b) => {
        const tA = ((a.lng - from.lng)*dx + (a.lat - from.lat)*dy) / lenSq;
        const tB = ((b.lng - from.lng)*dx + (b.lat - from.lat)*dy) / lenSq;
        return tA - tB;
      });
  }
  return results;
}

function filterBreweries() {
  render();
  if (currentView === 'map') renderMap();
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
  document.getElementById('statShowing').textContent  = filtered.length;

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty">
      <div class="empty-icon">🍺</div>
      <h3>No Breweries Found</h3>
      <p>Try adjusting your search or filters.</p>
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map((b, i) => {
    const color    = PROV_COLORS[b.province] || '#78BE20';
    const styleArr = typeof b.styles === 'string' ? b.styles.split(',').map(s=>s.trim()).filter(Boolean) : [];
    const feats    = [
      b.taproom    && ['🍺','Taproom'],
      b.patio      && ['☀️','Patio'],
      b.kitchen    && ['🍔','Kitchen'],
      b.pet        && ['🐾','Pet OK'],
      b.tours      && ['🗺️','Tours'],
      b.accessible && ['♿','Accessible'],
    ].filter(Boolean);
    const mapsUrl   = `https://maps.google.com/?q=${b.lat},${b.lng}`;
    const isVisited = visitedSet.has(b.id);
    return `
    <div class="card ${isVisited ? 'visited' : ''}" style="--province-color:${color}; animation-delay:${i*25}ms"
         onclick="openModal('${b.id}')">
      <div class="card-header">
        <div style="display:flex;gap:7px;align-items:center">
          <div class="province-dot"></div>
          <span class="card-region">${b.province} · ${b.region||b.city}</span>
        </div>
        ${b.ocb_member ? '<span class="ocb-badge">✓ Member</span>' : ''}
      </div>
      <div class="card-name">${b.name}</div>
      <div class="card-city">${b.city}${b.founded ? ' · Est. '+b.founded : ''}</div>
      ${renderRating(b)}
        ${styleArr.slice(0,4).map(s=>`<span class="style-tag">${s}</span>`).join('')}
        ${styleArr.length>4?`<span class="style-tag">+${styleArr.length-4}</span>`:''}
      </div>
      <div class="features">
        ${feats.slice(0,4).map(([e,l])=>`<span class="feat-tag">${e} ${l}</span>`).join('')}
        ${feats.length>4?`<span class="feat-tag">+${feats.length-4} more</span>`:''}
      </div>
      <div class="card-footer">
        <a class="btn-directions" href="${mapsUrl}" target="_blank" onclick="event.stopPropagation()">📍 Get Directions</a>
        ${b.website ? `<a class="btn-web" href="${b.website}" target="_blank" onclick="event.stopPropagation()">Web ↗</a>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ─────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────
function openModal(id) {
  const b = allBreweries.find(x => x.id === id);
  if (!b) return;
  const color    = PROV_COLORS[b.province] || '#78BE20';
  const styleArr = typeof b.styles === 'string' ? b.styles.split(',').map(s=>s.trim()).filter(Boolean) : [];
  const mapsUrl  = `https://maps.google.com/?q=${b.lat},${b.lng}`;
  const feats    = [
    b.taproom    && '🍺 Taproom',
    b.patio      && '☀️ Patio',
    b.kitchen    && '🍔 Kitchen',
    b.pet        && '🐾 Pet Friendly',
    b.tours      && '🗺️ Tours',
    b.accessible && '♿ Accessible',
  ].filter(Boolean);

  document.getElementById('modal').innerHTML = `
    <div class="modal-top">
      <div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
          <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>
          <span style="font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:11px;color:${color};letter-spacing:.08em;text-transform:uppercase">${b.province} · ${b.city}</span>
          ${b.ocb_member ? '<span class="ocb-badge">✓ Guild Member</span>' : ''}
        </div>
        <div class="modal-name">${b.name}</div>
        ${b.legal_name && b.legal_name !== b.name ? `<div style="font-size:11px;color:var(--muted);font-family:'Helvetica Neue', Helvetica, Arial, sans-serif">${b.legal_name}</div>` : ''}
      </div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>

    <div class="modal-grid" style="margin-bottom:18px">
      <div class="modal-stat">
        <div class="modal-stat-val">${b.founded || '—'}</div>
        <div class="modal-stat-label">Founded</div>
      </div>
      <div class="modal-stat">
        <div class="modal-stat-val" style="text-transform:capitalize">${b.type || '—'}</div>
        <div class="modal-stat-label">Brewery Type</div>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-label">Address</div>
      <div style="font-size:13px;color:var(--ink)">${b.address}, ${b.city}, ${b.province} ${b.postal}</div>
      <div style="font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:11px;color:#2A7BE8;margin-top:4px">📍 ${b.lat}, ${b.lng}</div>
      ${b.phone ? `<div style="font-size:12px;color:var(--muted);margin-top:4px">📞 ${b.phone}</div>` : ''}
    </div>

    ${styleArr.length ? `
    <div class="modal-section">
      <div class="modal-section-label">Beer Styles</div>
      <div class="styles">${styleArr.map(s=>`<span class="style-tag">${s}</span>`).join('')}</div>
    </div>` : ''}

    ${feats.length ? `
    <div class="modal-section">
      <div class="modal-section-label">Features &amp; Amenities</div>
      <div class="features">${feats.map(f=>`<span class="feat-tag">${f}</span>`).join('')}</div>
    </div>` : ''}

    ${b.notes ? `
    <div class="modal-section">
      <div class="modal-section-label">Notes</div>
      <div style="font-size:12px;color:var(--muted);line-height:1.7">${b.notes}</div>
    </div>` : ''}

    <div class="modal-section">
      <div class="modal-section-label">Socials &amp; Web</div>
      <div class="social-links">
        ${b.website   ? `<a class="social-link" href="${b.website}" target="_blank">🌐 Website</a>` : ''}
        ${b.jeep_post ? `<a class="social-link" href="${b.jeep_post}" target="_blank" style="background:#EDF7D8;border-color:#C5E89A">🚙 Our Visit</a>` : ''}
        ${b.instagram ? `<a class="social-link" href="https://instagram.com/${b.instagram.replace('@','')}" target="_blank">📸 Instagram</a>` : ''}
        ${b.untappd   ? `<a class="social-link" href="https://untappd.com/brewery/${b.untappd}" target="_blank">🍺 Untappd</a>` : ''}
        ${b.facebook  ? `<span class="social-link">Facebook: ${b.facebook}</span>` : ''}
      </div>
    </div>

    <div class="modal-actions">
      <a class="btn-directions" href="${mapsUrl}" target="_blank">📍 Get Directions</a>
      ${b.website ? `<a class="btn-web" href="${b.website}" target="_blank">Website ↗</a>` : ''}
      <button id="visitedBtn" class="btn-visited ${visitedSet.has(b.id) ? 'marked' : ''}"
              onclick="toggleVisited('${b.id}', event)">
        ${visitedSet.has(b.id) ? '✅ Visited!' : '🚙 Mark Visited'}
      </button>
    </div>

    <div class="verified-row">
      <span><span class="status-dot"></span>${b.status || 'active'}</span>
      <span>ID: ${b.id}</span>
      <span>Verified: ${b.verified_date || b.verified || 'pending'}</span>
    </div>
  `;
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ─────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────
function updateStats() {
  document.getElementById('statTotal').textContent    = allBreweries.length;
  document.getElementById('statShowing').textContent  = allBreweries.length;
  document.getElementById('countDisplay').textContent = allBreweries.length;
  document.getElementById('statProvinces').textContent = new Set(allBreweries.map(b => b.province)).size;
  updateVisitedStat();
  updateDashboard();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('modalOverlay').classList.remove('open');
    document.body.style.overflow = '';
  }
});

// ═══════════════════════════════════════════════════════
// MAP VIEW
// ═══════════════════════════════════════════════════════
let map = null;
let mapMarkers = [];
let currentView = 'grid';

function setView(view) {
  currentView = view;
  const gridWrap = document.getElementById('gridWrap');
  const mapView  = document.getElementById('mapView');
  const btnGrid  = document.getElementById('btnGrid');
  const btnMap   = document.getElementById('btnMap');
  const routeBar = document.getElementById('routePlanner');

  if (view === 'map') {
    gridWrap.classList.add('hidden');
    mapView.classList.add('active');
    btnGrid.classList.remove('active');
    btnMap.classList.add('active');
    routeBar.classList.add('active');
    initMap();
    renderMap();
  } else {
    gridWrap.classList.remove('hidden');
    mapView.classList.remove('active');
    btnGrid.classList.add('active');
    btnMap.classList.remove('active');
    routeBar.classList.remove('active');
    render();
  }
}

function initMap() {
  if (map) return; // already initialised
  map = L.map('mapView').setView([44.5, -76.5], 5);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO',
    maxZoom: 19
  }).addTo(map);
  renderMap();
}

function renderMap() {
  if (!map || typeof L === 'undefined') return;

  // Clear existing markers
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];

  const filtered = getFiltered().filter(b => b.lat && b.lng);

  filtered.forEach(b => {
    const color     = PROV_COLORS[b.province] || '#78BE20';
    const isVisited = visitedSet.has(b.id);
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:${isVisited ? 14 : 10}px;
        height:${isVisited ? 14 : 10}px;
        background:${isVisited ? '#78BE20' : color};
        border-radius:50%;
        border:2px solid ${isVisited ? '#fff' : 'rgba(255,255,255,0.4)'};
        box-shadow:0 0 ${isVisited ? '8px #78BE2088' : '4px rgba(0,0,0,0.5)'};
        cursor:pointer;
      "></div>`,
      iconSize: [isVisited ? 14 : 10, isVisited ? 14 : 10],
      iconAnchor: [isVisited ? 7 : 5, isVisited ? 7 : 5],
    });

    const marker = L.marker([b.lat, b.lng], { icon })
      .addTo(map)
      .bindPopup(`
        <div class="map-popup-name">${b.name}</div>
        <div class="map-popup-city">${b.city}, ${b.province}</div>
        ${isVisited ? '<div class="map-popup-visited">🚙 Visited</div>' : ''}
        <button class="map-popup-btn" onclick="openModal('${b.id}')">Details</button>
        <a class="map-popup-btn" href="https://maps.google.com/?q=${b.lat},${b.lng}" target="_blank">Directions</a>
      `, { maxWidth: 220 });

    mapMarkers.push(marker);
  });

  // Fit bounds to visible markers
  if (filtered.length > 0) {
    const bounds = L.latLngBounds(filtered.map(b => [b.lat, b.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }
}

// When map is active, renderMap() is called directly from setView() and filterBreweries()
// No render override needed — this was causing infinite recursion

// ═══════════════════════════════════════════════════════
// ROUTE PLANNER
// ═══════════════════════════════════════════════════════
let routeActive = false;
let routeLine   = null; // [fromLat,fromLng] → [toLat,toLng]

async function geocode(place) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`;
  const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const data = await res.json();
  if (!data.length) throw new Error(`Could not find "${place}"`);
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), name: data[0].display_name.split(',')[0] };
}

// Perpendicular distance from point P to line segment A→B (in km)
function distToSegment(pLat, pLng, aLat, aLng, bLat, bLng) {
  // Convert to flat coords (good enough for < 2000km)
  const dx = bLng - aLng, dy = bLat - aLat;
  const lenSq = dx*dx + dy*dy;
  if (lenSq === 0) return haversine(pLat, pLng, aLat, aLng);
  let t = ((pLng - aLng)*dx + (pLat - aLat)*dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return haversine(pLat, pLng, aLat + t*dy, aLng + t*dx);
}

async function planRoute() {
  const fromStr = document.getElementById('routeFrom').value.trim();
  const toStr   = document.getElementById('routeTo').value.trim();
  if (!fromStr || !toStr) { alert('Please enter both a start and end city.'); return; }

  const status = document.getElementById('routeStatus');
  status.textContent = 'Geocoding…';

  try {
    const [from, to] = await Promise.all([geocode(fromStr), geocode(toStr)]);
    routeLine = { from, to };
    routeActive = true;

    const totalKm = Math.round(haversine(from.lat, from.lng, to.lat, to.lng));
    status.innerHTML = `${from.name} → ${to.name} <span class="route-km-badge">${totalKm.toLocaleString()} km straight-line</span>`;
    document.getElementById('routeClearBtn').style.display = 'inline-block';

    // Sort breweries by distance from route (closest first), max 100km corridor
    render();

    // If map is visible, draw route line
    if (currentView === 'map' && map && typeof L !== 'undefined') {
      if (window._routePolyline) map.removeLayer(window._routePolyline);
      window._routePolyline = L.polyline(
        [[from.lat, from.lng], [to.lat, to.lng]],
        { color: '#78BE20', weight: 3, dashArray: '8,6', opacity: 0.7 }
      ).addTo(map);
      map.fitBounds([[from.lat, from.lng], [to.lat, to.lng]], { padding: [60, 60] });
    }
  } catch(e) {
    status.textContent = e.message;
  }
}

function clearRoute() {
  routeActive = false;
  routeLine = null;
  document.getElementById('routeStatus').textContent = '';
  document.getElementById('routeClearBtn').style.display = 'none';
  if (window._routePolyline && map) map.removeLayer(window._routePolyline);
  render();
}

// Route sorting is handled inside getFiltered directly — no override needed

// ═══════════════════════════════════════════════════════
// UNTAPPD RATINGS
// ═══════════════════════════════════════════════════════
// Untappd blocks CORS so we can't fetch ratings live in browser.
// We store ratings in a local cache keyed by untappd slug and
// display them when available. Users can populate via the Sheet
// by adding an `untappd_rating` column (e.g. 3.87).
// If the brewery has a rating in the sheet data, show it.
function renderRating(b) {
  const rating = parseFloat(b.untappd_rating);
  if (!rating || isNaN(rating)) return '';
  const filled  = Math.floor(rating);
  const half    = rating - filled >= 0.5;
  const stars   = '★'.repeat(filled) + (half ? '½' : '') + '☆'.repeat(5 - filled - (half?1:0));
  return `<div class="untappd-rating">
    <span class="stars">${stars}</span>
    ${rating.toFixed(2)}
    <span style="color:var(--dim);font-weight:400">Untappd</span>
  </div>`;
}

// ── START ──────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('modalOverlay').classList.remove('open');
    document.body.style.overflow = '';
  }
});

init();
