// ═══════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════
const SHEET_ID = '1071nhgKo4kStR5KkikpWEq8LKKDnMqE7FOhp3wZv9dw';
const API_URL = 'https://script.google.com/macros/s/AKfycbxzjP9f2u9vZcATrlDgsx4QyIwBF_nfL6tZmYkx-j_SsSVoAAxtP3iwkn5bp16DVFpjtA/exec';
const USE_CLOUD_SYNC = true;

const PROV_COLORS = {
  ON:'#E8672A', BC:'#2A7BE8', AB:'#D4A017', QC:'#C4392F',
  MB:'#8A3DBF', SK:'#1D9E6E', NB:'#D4681A', NS:'#C4293A',
  PE:'#A0522D', NL:'#3A5EC4',
  NY:'#1565C0', PA:'#4527A0', OH:'#00838F', KY:'#558B2F', TN:'#6A1B9A',
  WV:'#37474F', VA:'#AD1457', NC:'#00695C', SC:'#4E342E', GA:'#BF360C', FL:'#0277BD'
};

const US_STATES = {
  NY:'new_york', PA:'pennsylvania', OH:'ohio', KY:'kentucky', TN:'tennessee',
  WV:'west_virginia', VA:'virginia', NC:'north_carolina', SC:'south_carolina',
  GA:'georgia', FL:'florida'
};

// ── US BREWERY CACHE ───────────────────────────────────
const US_CACHE_KEY = 'usBreweriesCache';
const US_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCachedUS() {
  try {
    const raw = localStorage.getItem(US_CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > US_CACHE_TTL) { localStorage.removeItem(US_CACHE_KEY); return null; }
    return data;
  } catch { return null; }
}

function setCachedUS(data) {
  try { localStorage.setItem(US_CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

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
  const visited = allBreweries.filter(b => visitedSet.has(b.id) && b.lat && b.lng);
  let totalKm = 0;
  for (let i = 1; i < visited.length; i++) {
    totalKm += haversine(visited[i-1].lat, visited[i-1].lng, visited[i].lat, visited[i].lng);
  }
  const provinces = new Set(visited.map(b => b.province).filter(Boolean));
  document.getElementById('dashVisited').textContent   = visited.length;
  document.getElementById('dashKm').textContent        = Math.round(totalKm).toLocaleString();
  document.getElementById('dashProvinces').textContent = provinces.size;
}

// ── VISITED STATE ──────────────────────────────────────
const visitedSet = new Set(JSON.parse(localStorage.getItem('visitedBreweries') || '[]'));
function saveVisited() { localStorage.setItem('visitedBreweries', JSON.stringify([...visitedSet])); }

async function autoGeocodeIfNeeded(brewery) {
  if (brewery.lat === 0 || brewery.lng === 0) {
    const queries = [
      brewery.address ? `${brewery.address}, ${brewery.city}, ${brewery.province}, Canada` : null,
      `${brewery.name}, ${brewery.city}, ${brewery.province}, Canada`,
      `${brewery.city}, ${brewery.province}, Canada`
    ].filter(q => q);
    for (const query of queries) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
          { headers: { 'User-Agent': 'BreweryAtlas/1.0' } }
        );
        if (response.ok) {
          const results = await response.json();
          if (results.length > 0) {
            brewery.lat = parseFloat(results[0].lat);
            brewery.lng = parseFloat(results[0].lon);
            await syncToGoogleSheets(brewery);
            return true;
          }
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch {}
    }
  }
  return false;
}

async function syncToGoogleSheets(brewery) {
  const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbwrgzLaGWHShxmPhNE1UB1TYjwN6IW4eWSFD7bpOm1-ERGP8HH8phoswJuWj5pFwUtWlw/exec';
  try {
    const url = `${SHEETS_API_URL}?action=sync&breweryName=${encodeURIComponent(brewery.name)}&lat=${brewery.lat}&lng=${brewery.lng}`;
    await fetch(url, { method: 'GET' });
  } catch {}
}

async function toggleVisited(id, event) {
  event.stopPropagation();
  const brewery = allBreweries.find(b => b.id === id);
  if (!brewery) return;
  const isNowVisited = !visitedSet.has(id);
  if (isNowVisited) {
    await autoGeocodeIfNeeded(brewery);
    visitedSet.add(id);
  } else {
    visitedSet.delete(id);
  }
  saveVisited();
  updateVisitedStat();
  updateDashboard();
  render();
  const btn = document.getElementById('visitedBtn');
  if (btn) {
    btn.textContent = isNowVisited ? '✅ Visited!' : '🚙 Mark Visited';
    btn.classList.toggle('marked', isNowVisited);
  }
  if (USE_CLOUD_SYNC && API_URL !== 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') {
    await syncVisitedToCloud(brewery.name, isNowVisited);
  } else {
    updateSyncStatus(isNowVisited ? 'marked-local' : 'unmarked-local');
  }
}

async function syncVisitedToCloud(breweryName, visited) {
  try {
    await fetch(API_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brewery: breweryName, visited })
    });
    updateSyncStatus(visited ? 'marked-cloud' : 'unmarked-cloud');
  } catch {
    updateSyncStatus('error');
  }
}

async function loadVisitedFromCloud() {
  if (!USE_CLOUD_SYNC || API_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') {
    updateDashboard(); return;
  }
  try {
    const response = await fetch(`${API_URL}?action=get_visited`);
    const data = await response.json();
    if (data.success && data.visited) {
      data.visited.forEach(v => {
        const brewery = allBreweries.find(b => b.name === v.name);
        if (brewery) visitedSet.add(brewery.id);
      });
      saveVisited();
      updateVisitedStat();
      updateDashboard();
      render();
    }
  } catch {
    updateDashboard();
  }
}

function updateSyncStatus(status) {
  const messages = {
    'marked-local': '✓ Marked visited (saved locally)',
    'unmarked-local': '✓ Unmarked (saved locally)',
    'marked-cloud': '✓ Marked visited (synced to cloud)',
    'unmarked-cloud': '✓ Unmarked (synced to cloud)',
    'error': '⚠️ Sync error - saved locally only'
  };
  const notification = document.createElement('div');
  notification.className = 'sync-notification';
  notification.textContent = messages[status] || status;
  notification.style.cssText = `
    position:fixed;bottom:20px;right:20px;
    background:${status.includes('cloud') ? '#28a745' : '#6c757d'};
    color:white;padding:12px 20px;border-radius:4px;
    box-shadow:0 2px 10px rgba(0,0,0,0.2);z-index:10000;font-size:14px;
    animation:slideIn 0.3s ease-out;`;
  document.body.appendChild(notification);
  setTimeout(() => { notification.style.animation = 'slideOut 0.3s ease-out'; setTimeout(() => notification.remove(), 300); }, 2000);
}

function updateVisitedStat() {
  const visitedWithCoords = allBreweries.filter(b => visitedSet.has(b.id) && b.lat && b.lng);
  document.getElementById('statVisited').textContent = visitedWithCoords.length;
}

// ─────────────────────────────────────────────────────
// SAMPLE DATA
// ─────────────────────────────────────────────────────
const SAMPLE_DATA = [
  { id:'b001', name:'Collective Arts Brewing', legal_name:'Collective Arts Brewing Co.', province:'ON', city:'Hamilton', region:'Niagara & Hamilton', type:'micro', lat:43.2664, lng:-79.8370, address:'207 Burlington St E', postal:'L8L 4H2', phone:'905-528-8017', website:'https://collectiveartsbrewing.com', instagram:'@collectiveartsbrewing', facebook:'collectivearts', taproom:true, patio:true, kitchen:true, pet:true, tours:true, accessible:true, styles:'IPA, Lager, Sour, Stout, Pale Ale', founded:2013, ocb_member:true, status:'active', verified_date:'2025-01-15', notes:'Known for artist-designed can labels.' },
  { id:'b002', name:'Bellwoods Brewery', legal_name:'Bellwoods Brewery Inc.', province:'ON', city:'Toronto', region:'Greater Toronto Area', type:'micro', lat:43.6480, lng:-79.4220, address:'124 Ossington Ave', postal:'M6J 2Z5', phone:'416-535-4586', website:'https://bellwoodsbrewery.com', instagram:'@bellwoodsbrewery', facebook:'bellwoodsbrewery', taproom:true, patio:true, kitchen:true, pet:false, tours:false, accessible:false, styles:'Wild Ale, Sour, IPA, Stout, Farmhouse', founded:2012, ocb_member:true, status:'active', verified_date:'2025-01-15', notes:'Famous for wild and mixed-fermentation ales.' },
  { id:'b003', name:"Beau's All Natural Brewing", legal_name:"Beau's All Natural Brewing Company", province:'ON', city:'Vankleek Hill', region:'Eastern Ontario & Cottage Country', type:'regional', lat:45.5217, lng:-74.6570, address:'10 Terry Fox Dr', postal:'K0B 1R0', phone:'866-585-2337', website:'https://beaus.ca', instagram:'@beausbeer', facebook:'beausbeer', taproom:true, patio:true, kitchen:true, pet:true, tours:true, accessible:true, styles:'Lager, IPA, Wit, Seasonal', founded:2006, ocb_member:true, status:'active', verified_date:'2025-01-15', notes:'Famous for Oktoberfest. Employee-owned.' },
  { id:'b004', name:'Garrison Brewing', legal_name:'Garrison Brewing Company', province:'NS', city:'Halifax', region:'Halifax Regional Municipality', type:'micro', lat:44.6488, lng:-63.5752, address:'1149 Marginal Rd', postal:'B3H 4P7', phone:'902-453-5343', website:'https://garrisonbrewing.com', instagram:'@garrisonbrewing', facebook:'garrisonbrewing', taproom:true, patio:true, kitchen:false, pet:true, tours:true, accessible:true, styles:'IPA, Stout, Wheat, Seasonal, Lager', founded:1997, ocb_member:false, status:'active', verified_date:'2025-01-15', notes:"Halifax waterfront. One of Atlantic Canada's largest." },
];

// ─────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────
let allBreweries = [];
let activeFeats  = new Set();

// ─────────────────────────────────────────────────────
// INIT — Canadian first, US lazy-loaded in background
// ─────────────────────────────────────────────────────
async function init() {
  // ── STEP 1: Load Canadian breweries from Sheet ──────
  try {
    const url  = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=cleaned`;
    const res  = await fetch(url);
    const text = await res.text();
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const cols = json.table.cols.map(c => c.label.toLowerCase().trim().replace(/ /g,'_'));
    const rows = json.table.rows.map(row => {
      const obj = {};
      cols.forEach((col, i) => {
        const cell = row.c && row.c[i];
        if (!cell || cell.v === null || cell.v === undefined) { obj[col] = ''; return; }
        obj[col] = cell.v;
      });
      return {
        id: obj.id || `can_${Math.random().toString(36).substr(2, 9)}`,
        name: obj.brewery_name || obj.name,
        province: obj.province, city: obj.city, region: obj.city, type: 'micro',
        lat: parseFloat(obj.lat) || 0, lng: parseFloat(obj.lng) || 0,
        address: obj.street_address || obj.address || '',
        postal: obj.postal_code || obj.postal || '',
        phone: obj.phone || '', website: obj.website || '',
        instagram: obj.instagram || '', facebook: obj.facebook || '', email: obj.email || '',
        founded: obj.founded || '', status: obj.status || 'active',
        data_source: obj.data_source || '',
        visited: obj.visited === 'TRUE' || obj.visited === true || obj.visited === 'Yes',
        visit_date: obj.visit_date || '',
        taproom:false, patio:false, kitchen:false, pet:false, tours:false, accessible:false,
        ocb_member:false, styles:''
      };
    });
    allBreweries = rows.filter(b => b.name && (!b.status || b.status.toLowerCase() === 'active'));
    allBreweries.forEach(b => { if (b.visited) visitedSet.add(b.id); });
    console.log(`Loaded ${allBreweries.length} Canadian breweries`);
  } catch(e) {
    console.warn('Sheet load failed — using sample data:', e);
    allBreweries = SAMPLE_DATA;
  }

  // ── STEP 2: Render Canadian breweries immediately ───
  updateStats();
  render();
  updateDashboard();

  // ── STEP 3: Load cloud visited (non-blocking) ───────
  loadVisitedFromCloud();

  // ── STEP 4: Load US breweries in background ─────────
  loadUSBreweries();
}

async function loadUSBreweries() {
  // Show subtle indicator
  const countEl = document.getElementById('countDisplay');
  const origText = countEl.textContent;

  // Try cache first
  const cached = getCachedUS();
  if (cached) {
    console.log(`US cache hit — ${cached.length} breweries (skipping 33 API calls)`);
    allBreweries = [...allBreweries, ...cached];
    updateStats();
    render();
    if (currentView === 'map') renderMap();
    return;
  }

  // No cache — fetch in background
  console.log('Fetching US breweries from Open Brewery DB…');
  try {
    const stateCodes = Object.keys(US_STATES);
    const fetches = stateCodes.map(async code => {
      const stateName = US_STATES[code];
      const results = await Promise.all([1,2,3].map(p =>
        fetch(`https://api.openbrewerydb.org/v1/breweries?by_state=${stateName}&per_page=200&page=${p}&by_type=micro,brewpub,nano,regional,large,planning,contract,proprietor`)
          .then(r => r.json()).catch(() => [])
      ));
      return results.flat().map(b => ({
        id: 'us_' + b.id, name: b.name, province: code, city: b.city, region: b.state,
        type: b.brewery_type, lat: parseFloat(b.latitude) || 0, lng: parseFloat(b.longitude) || 0,
        address: b.street || '', postal: b.postal_code || '', phone: b.phone || '',
        website: b.website_url || '', styles: '', founded: '', ocb_member: false,
        taproom:true, patio:false, kitchen:false, pet:false, tours:false, accessible:false,
        status: 'active', notes: `Open Brewery DB · ${b.brewery_type}`
      })).filter(b => b.name && b.lat && b.lng);
    });

    const usBreweries = (await Promise.all(fetches)).flat();
    setCachedUS(usBreweries); // Cache for 24h
    allBreweries = [...allBreweries, ...usBreweries];
    console.log(`Loaded ${usBreweries.length} US breweries — cached for 24h`);
    updateStats();
    render();
    if (currentView === 'map') renderMap();
  } catch(e) {
    console.warn('US brewery fetch failed:', e);
  }
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

function filterBreweries() { render(); if (currentView === 'map') renderMap(); }

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
    grid.innerHTML = `<div class="empty"><div class="empty-icon">🍺</div><h3>No Breweries Found</h3><p>Try adjusting your search or filters.</p></div>`;
    return;
  }

  const PAGE = 120;
  const visible = filtered.slice(0, PAGE);
  const overflow = filtered.length > PAGE;

  grid.innerHTML = visible.map(b => {
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
    let visitDate = '';
    if (isVisited && b.visit_date) {
      const dateStr = String(b.visit_date);
      if (dateStr.startsWith('Date(')) {
        const match = dateStr.match(/Date\((\d+),(\d+),(\d+)\)/);
        if (match) {
          visitDate = `${String(parseInt(match[2])+1).padStart(2,'0')}/${String(match[3]).padStart(2,'0')}/${match[1].slice(-2)}`;
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
          <span class="card-region">${b.province} · ${b.region||b.city}</span>
        </div>
        ${b.ocb_member ? '<span class="ocb-badge">✓ Member</span>' : ''}
      </div>
      <div class="card-name">${b.name}</div>
      <div class="card-city">${b.city}${b.founded ? ' · Est. '+b.founded : ''}</div>
      <div class="styles">${styleArr.slice(0,4).map(s=>`<span class="style-tag">${s}</span>`).join('')}${styleArr.length>4?`<span class="style-tag">+${styleArr.length-4}</span>`:''}</div>
      <div class="features">${feats.slice(0,4).map(([e,l])=>`<span class="feat-tag">${e} ${l}</span>`).join('')}${feats.length>4?`<span class="feat-tag">+${feats.length-4} more</span>`:''}</div>
      <div class="card-footer">
        <a class="btn-directions" href="${mapsUrl}" target="_blank" onclick="event.stopPropagation()">📍 Get Directions</a>
        ${b.website ? `<a class="btn-web" href="${b.website}" target="_blank" onclick="event.stopPropagation()">Web ↗</a>` : ''}
      </div>
    </div>`;
  }).join('') + (overflow ? `<div class="empty" style="grid-column:1/-1;padding:24px;text-align:center"><p style="color:var(--muted);font-size:12px">Showing first ${PAGE} of ${filtered.length} breweries — search or filter to narrow results</p></div>` : '');
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
    b.taproom    && '🍺 Taproom', b.patio      && '☀️ Patio',
    b.kitchen    && '🍔 Kitchen', b.pet        && '🐾 Pet Friendly',
    b.tours      && '🗺️ Tours',   b.accessible && '♿ Accessible',
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
    ${styleArr.length ? `<div class="modal-section"><div class="modal-section-label">Beer Styles</div><div class="styles">${styleArr.map(s=>`<span class="style-tag">${s}</span>`).join('')}</div></div>` : ''}
    ${feats.length ? `<div class="modal-section"><div class="modal-section-label">Features &amp; Amenities</div><div class="features">${feats.map(f=>`<span class="feat-tag">${f}</span>`).join('')}</div></div>` : ''}
    ${b.notes ? `<div class="modal-section"><div class="modal-section-label">Notes</div><div style="font-size:12px;color:var(--muted);line-height:1.7">${b.notes}</div></div>` : ''}
    <div class="modal-section">
      <div class="modal-section-label">Socials &amp; Web</div>
      <div class="social-links">
        ${b.website   ? `<a class="social-link" href="${b.website}" target="_blank">🌐 Website</a>` : ''}
        ${b.jeep_post ? `<a class="social-link" href="${b.jeep_post}" target="_blank" style="background:#EDF7D8;border-color:#C5E89A">🚙 Our Visit</a>` : ''}
        ${b.instagram ? `<a class="social-link" href="https://instagram.com/${b.instagram.replace('@','')}" target="_blank">📸 Instagram</a>` : ''}
        ${b.facebook  ? `<span class="social-link">Facebook: ${b.facebook}</span>` : ''}
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
  if (e.key === 'Escape') { document.getElementById('modalOverlay').classList.remove('open'); document.body.style.overflow = ''; }
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
      html: `<div style="width:${isVisited?14:10}px;height:${isVisited?14:10}px;background:${isVisited?'#78BE20':color};border-radius:50%;border:2px solid ${isVisited?'#fff':'rgba(255,255,255,0.4)'};box-shadow:0 0 ${isVisited?'8px #78BE2088':'4px rgba(0,0,0,0.5)'};cursor:pointer;"></div>`,
      iconSize:[isVisited?14:10,isVisited?14:10], iconAnchor:[isVisited?7:5,isVisited?7:5],
    });
    const marker = L.marker([b.lat,b.lng],{icon}).addTo(map).bindPopup(`
      <div class="map-popup-name">${b.name}</div>
      <div class="map-popup-city">${b.city}, ${b.province}</div>
      ${isVisited?'<div class="map-popup-visited">🚙 Visited</div>':''}
      <button class="map-popup-btn" onclick="openModal('${b.id}')">Details</button>
      <a class="map-popup-btn" href="https://maps.google.com/?q=${b.lat},${b.lng}" target="_blank">Directions</a>
    `,{maxWidth:220});
    mapMarkers.push(marker);
  });
  if (filtered.length > 0) map.fitBounds(L.latLngBounds(filtered.map(b=>[b.lat,b.lng])),{padding:[40,40]});
}

// ═══════════════════════════════════════════════════════
// ROUTE PLANNER
// ═══════════════════════════════════════════════════════
let routeActive = false;
let routeLine   = null;

async function geocode(place) {
  const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`,{headers:{'Accept-Language':'en'}});
  const data = await res.json();
  if (!data.length) throw new Error(`Could not find "${place}"`);
  return { lat:parseFloat(data[0].lat), lng:parseFloat(data[0].lon), name:data[0].display_name.split(',')[0] };
}

function distToSegment(pLat, pLng, aLat, aLng, bLat, bLng) {
  const dx=bLng-aLng, dy=bLat-aLat, lenSq=dx*dx+dy*dy;
  if (lenSq===0) return haversine(pLat,pLng,aLat,aLng);
  let t=((pLng-aLng)*dx+(pLat-aLat)*dy)/lenSq;
  t=Math.max(0,Math.min(1,t));
  return haversine(pLat,pLng,aLat+t*dy,aLng+t*dx);
}

async function planRoute() {
  const fromStr=document.getElementById('routeFrom').value.trim();
  const toStr=document.getElementById('routeTo').value.trim();
  if (!fromStr||!toStr){alert('Please enter both a start and end city.');return;}
  const status=document.getElementById('routeStatus');
  status.textContent='Geocoding…';
  try {
    const [from,to]=await Promise.all([geocode(fromStr),geocode(toStr)]);
    routeLine={from,to}; routeActive=true;
    const totalKm=Math.round(haversine(from.lat,from.lng,to.lat,to.lng));
    status.innerHTML=`${from.name} → ${to.name} <span class="route-km-badge">${totalKm.toLocaleString()} km straight-line</span>`;
    document.getElementById('routeClearBtn').style.display='inline-block';
    render();
    if (currentView==='map'&&map&&typeof L!=='undefined') {
      if (window._routePolyline) map.removeLayer(window._routePolyline);
      window._routePolyline=L.polyline([[from.lat,from.lng],[to.lat,to.lng]],{color:'#78BE20',weight:3,dashArray:'8,6',opacity:0.7}).addTo(map);
      map.fitBounds([[from.lat,from.lng],[to.lat,to.lng]],{padding:[60,60]});
    }
  } catch(e) { status.textContent=e.message; }
}

function clearRoute() {
  routeActive=false; routeLine=null;
  document.getElementById('routeStatus').textContent='';
  document.getElementById('routeClearBtn').style.display='none';
  if (window._routePolyline&&map) map.removeLayer(window._routePolyline);
  render();
}

// ── VISITED LIST ────────────────────────────────────────
function showVisitedList() {
  const visited = allBreweries.filter(b=>visitedSet.has(b.id)).sort((a,b)=>{
    if (a.province!==b.province) return a.province.localeCompare(b.province);
    return a.name.localeCompare(b.name);
  });
  const provinceNames={
    'ON':'Ontario','BC':'British Columbia','AB':'Alberta','QC':'Quebec',
    'MB':'Manitoba','SK':'Saskatchewan','NS':'Nova Scotia','NB':'New Brunswick',
    'PE':'Prince Edward Island','NL':'Newfoundland & Labrador',
    'NY':'New York','PA':'Pennsylvania','OH':'Ohio','KY':'Kentucky','TN':'Tennessee',
    'WV':'West Virginia','VA':'Virginia','NC':'North Carolina','SC':'South Carolina','GA':'Georgia','FL':'Florida'
  };
  if (!visited.length) {
    document.getElementById('visitedListContent').innerHTML='<p style="text-align:center;color:#999;padding:40px;">No visited breweries yet.</p>';
  } else {
    let html='', currentProvince='';
    visited.forEach(b => {
      if (b.province!==currentProvince) {
        if (currentProvince!=='') html+='</div>';
        currentProvince=b.province;
        html+=`<div style="margin-bottom:30px;"><h3 style="color:#78BE20;border-bottom:2px solid #78BE20;padding-bottom:8px;margin-bottom:16px;">${provinceNames[currentProvince]||currentProvince}</h3>`;
      }
      let visitDate='';
      if (b.visit_date) {
        const dateStr=String(b.visit_date);
        if (dateStr.startsWith('Date(')) {
          const match=dateStr.match(/Date\((\d+),(\d+),(\d+)\)/);
          if (match) visitDate=`${String(parseInt(match[2])+1).padStart(2,'0')}/${String(match[3]).padStart(2,'0')}/${match[1].slice(-2)}`;
        } else if (dateStr.includes('-')) { const p=dateStr.split('-'); if(p.length===3) visitDate=`${p[1]}/${p[2]}/${p[0].slice(-2)}`; }
        else { visitDate=dateStr; }
      }
      html+=`<div style="padding:12px;border-bottom:1px solid #eee;cursor:pointer;transition:background 0.2s;"
        onclick="openModal('${b.id}');document.getElementById('visitedListOverlay').style.display='none';"
        onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
        <div style="font-weight:600;color:#333;margin-bottom:4px;">${b.name}</div>
        <div style="font-size:14px;color:#666;">${b.city}${visitDate?` • Visited: ${visitDate}`:''}</div>
      </div>`;
    });
    html+='</div>';
    html+=`<div style="margin-top:30px;padding-top:20px;border-top:2px solid #eee;text-align:center;color:#999;"><strong>${visited.length}</strong> ${visited.length===1?'brewery':'breweries'} visited</div>`;
    document.getElementById('visitedListContent').innerHTML=html;
  }
  const overlay=document.getElementById('visitedListOverlay');
  if (overlay) { overlay.style.display='flex'; overlay.classList.add('open'); }
}

function closeVisitedList(event) {
  if (!event||event.target.id==='visitedListOverlay') {
    const overlay=document.getElementById('visitedListOverlay');
    overlay.style.display='none'; overlay.classList.remove('open');
  }
}

init();
