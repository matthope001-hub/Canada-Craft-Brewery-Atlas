// ═══════════════════════════════════════════════════════
// DATA.JS - Data Loading Functions
// ═══════════════════════════════════════════════════════

// State variables
let allBreweries = [];
let currentView = 'grid';
let routeActive = false;
let routeLine = null;

// Helper — parse TRUE/FALSE/Yes/1 from sheet cells
function parseBool(v) {
  if (!v) return false;
  const s = String(v).toLowerCase().trim();
  return s === 'true' || s === 'yes' || s === '1';
}

// North American provinces/territories + US states allow-list.
// Anything outside this set (Ireland, Scotland, Korea, Finland, etc.)
// is dropped at load time so it doesn't appear in counts, filters, or map.
const CA_CODES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];
const US_CODES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY'
];
const NA_CODES = new Set([...CA_CODES, ...US_CODES]);
function isNorthAmerican(code) { return NA_CODES.has(code); }

// Fallback if config.js's normalizeProvince isn't loaded (shouldn't happen,
// but keeps data.js safe to load on its own).
const _normProv = typeof normalizeProvince === 'function'
  ? normalizeProvince
  : (v => (v ? String(v).trim().toUpperCase() : ''));

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
        name: obj.brewery_name || obj.name || '',
        legal_name: obj.legal_name || '',
        province: _normProv(obj.province),
        city: obj.city || '',
        region: obj.region || obj.city || '',
        type: obj.type || 'micro',
        lat: parseFloat(obj.lat) || 0,
        lng: parseFloat(obj.lng) || 0,
        address: obj.street_address || obj.address || '',
        postal: obj.postal_code || obj.postal || '',
        phone: obj.phone || '',
        website: obj.website || '',
        instagram: obj.instagram || '',
        facebook: obj.facebook || '',
        email: obj.email || '',
        founded: obj.founded || '',
        status: obj.status || 'active',
        data_source: obj.data_source || '',
        verified: obj.verified || '',
        verified_date: obj.verified_date || '',
        notes: obj.notes || '',
        jeep_post: obj.jeep_post || '',
        styles: obj.styles || '',
        visited: parseBool(obj.visited),
        visit_date: obj.visit_date || '',
        // ── Read boolean feature columns from sheet ──
        taproom:    parseBool(obj.taproom),
        patio:      parseBool(obj.patio),
        kitchen:    parseBool(obj.kitchen),
        pet:        parseBool(obj.pet),
        tours:      parseBool(obj.tours),
        accessible: parseBool(obj.accessible),
        ocb_member: parseBool(obj.ocb_member),
      };
    });

    // ── Filter: drop closed rows, blank names, AND non-North-American ──
    allBreweries = rows.filter(b =>
      b.name && b.name.trim() !== '' &&
      b.status.toLowerCase() !== 'closed' &&
      isNorthAmerican(b.province)
    );
    allBreweries.forEach(b => { if (b.visited) visitedSet.add(b.id); });
    console.log(`✅ Loaded ${allBreweries.length} Canadian breweries`);
  } catch(e) {
    console.warn('Sheet load failed — using sample data:', e);
    allBreweries = SAMPLE_DATA;
  }

  // ── STEP 2: Render immediately ───
  updateStats();
  render();
  updateDashboard();

  // ── STEP 3: Load cloud visited (non-blocking) ───────
  loadVisitedFromCloud();

  // ── STEP 4: Load US breweries in background ─────────
  loadUSBreweries();
}

async function loadUSBreweries() {
  // ── STEP 1: Load from US_Breweries Sheet ────────────
  try {
    const url  = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=US_Breweries`;
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
        id: obj.id || `us_${Math.random().toString(36).substr(2, 9)}`,
        name: obj.brewery_name || obj.name || '',
        legal_name: obj.legal_name || '',
        province: _normProv(obj.province),
        city: obj.city || '',
        region: obj.region || obj.city || '',
        type: obj.type || 'micro',
        lat: parseFloat(obj.lat) || 0,
        lng: parseFloat(obj.lng) || 0,
        address: obj.street_address || obj.address || '',
        postal: obj.postal_code || obj.postal || '',
        phone: obj.phone || '',
        website: obj.website || '',
        instagram: obj.instagram || '',
        facebook: obj.facebook || '',
        email: obj.email || '',
        founded: obj.founded || '',
        status: obj.status || 'active',
        data_source: obj.data_source || '',
        notes: obj.notes || '',
        jeep_post: obj.jeep_post || '',
        styles: obj.styles || '',
        visited: parseBool(obj.visited),
        visit_date: obj.visit_date || '',
        taproom:    parseBool(obj.taproom),
        patio:      parseBool(obj.patio),
        kitchen:    parseBool(obj.kitchen),
        pet:        parseBool(obj.pet),
        tours:      parseBool(obj.tours),
        accessible: parseBool(obj.accessible),
        ocb_member: parseBool(obj.ocb_member),
      };
    });

    const usBreweries = rows.filter(b =>
      b.name && b.name.trim() !== '' &&
      b.status.toLowerCase() !== 'closed' &&
      isNorthAmerican(b.province)
    );

    if (usBreweries.length > 0) {
      usBreweries.forEach(b => { if (b.visited) visitedSet.add(b.id); });
      allBreweries = [...allBreweries, ...usBreweries];
      console.log(`✅ Loaded ${usBreweries.length} US breweries from Sheet`);
      updateStats();
      render();
      updateDashboard();
      if (currentView === 'map') renderMap();
    } else {
      console.log('⚠️ US_Breweries sheet is empty — loading from API');
    }
  } catch(e) {
    console.warn('⚠️ US_Breweries sheet load failed:', e);
  }

  // ── STEP 2: Load from Open Brewery DB API ──────────
  const cached = getCachedUS();
  if (cached) {
    console.log(`📦 US cache hit — ${cached.length} breweries`);
    // Normalize cached entries and drop any international leftovers
    cached.forEach(b => { b.province = _normProv(b.province); });
    const cleanCached = cached.filter(b => isNorthAmerican(b.province));
    allBreweries = [...allBreweries, ...cleanCached];
    updateStats();
    render();
    if (currentView === 'map') renderMap();
    loadOverpassBreweries();
    return;
  }

  console.log('🔄 Fetching US breweries from Open Brewery DB…');
  try {
    const stateCodes = Object.keys(US_STATES);
    const fetches = stateCodes.map(async code => {
      const stateName = US_STATES[code];
      const results = await Promise.all([1,2,3].map(p =>
        fetch(`https://api.openbrewerydb.org/v1/breweries?by_state=${stateName}&per_page=200&page=${p}&by_type=micro,brewpub,nano,regional,large,planning,contract,proprietor`)
          .then(r => r.json()).catch(() => [])
      ));
      return results.flat().map(b => ({
        id: 'us_' + b.id, name: b.name, province: _normProv(code),
        city: b.city, region: b.state, type: b.brewery_type,
        lat: parseFloat(b.latitude) || 0, lng: parseFloat(b.longitude) || 0,
        address: b.street || '', postal: b.postal_code || '',
        phone: b.phone || '', website: b.website_url || '',
        styles: '', founded: '', ocb_member: false,
        taproom: true, patio: false, kitchen: false,
        pet: false, tours: false, accessible: false,
        status: 'active', notes: `Open Brewery DB · ${b.brewery_type}`,
        visited: false, visit_date: ''
      })).filter(b => b.name && b.lat && b.lng);
    });

    const usBreweries = (await Promise.all(fetches)).flat();
    setCachedUS(usBreweries);
    allBreweries = [...allBreweries, ...usBreweries];
    console.log(`✅ Loaded ${usBreweries.length} US breweries from API`);
    updateStats();
    render();
    if (currentView === 'map') renderMap();
  } catch(e) {
    console.warn('❌ US brewery API fetch failed:', e);
  }

  loadOverpassBreweries();
}

// ═══════════════════════════════════════════════════════
// OPENSTREETMAP / OVERPASS
// ═══════════════════════════════════════════════════════
const STATE_BBOX = {
  AL:[30.14,-88.47,35.01,-84.89],
  NY:[40.50,-79.76,45.02,-71.86], PA:[39.72,-80.52,42.27,-74.69],
  OH:[38.40,-84.82,41.98,-80.52], KY:[36.50,-89.57,39.15,-81.96],
  TN:[34.98,-90.31,36.68,-81.65], WV:[37.20,-82.64,40.64,-77.72],
  VA:[36.54,-83.68,39.47,-75.24], NC:[33.84,-84.32,36.59,-75.46],
  SC:[32.03,-83.35,35.22,-78.54], GA:[30.36,-85.61,35.00,-80.84],
  FL:[24.40,-87.63,31.00,-80.03]
};

function normName(n) {
  return (n || '').toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\b(brewing|brewery|breweries|company|co|llc|inc|the|taproom|beer|ales?|craft)\b/g, '')
    .replace(/[^a-z0-9]/g, '').trim();
}

function isDuplicate(osm, existing) {
  const osmN = normName(osm.name);
  if (!osmN) return true;
  return existing.some(b => {
    if (b.province !== osm.province) return false;
    const bN = normName(b.name);
    if (!bN) return false;
    const nameMatch = bN === osmN || bN.includes(osmN) || osmN.includes(bN);
    if (!nameMatch) return false;
    if (b.lat && b.lng && osm.lat && osm.lng) {
      return haversine(b.lat, b.lng, osm.lat, osm.lng) < 0.15;
    }
    return true;
  });
}

async function loadOverpassBreweries() {
  const cachedOSM = getCachedOSM();
  if (cachedOSM) {
    console.log(`📦 OSM cache hit — ${cachedOSM.length} breweries`);
    cachedOSM.forEach(b => { b.province = _normProv(b.province); });
    allBreweries = [...allBreweries, ...cachedOSM];
    updateStats(); render(); updateDashboard();
    if (currentView === 'map') renderMap();
    return;
  }

  try {
    const codes = Object.keys(STATE_BBOX);
    const fetches = codes.map(async code => {
      const [s,w,n,e] = STATE_BBOX[code];
      try {
        const res = await fetch(`/api/overpass?bbox=${s},${w},${n},${e}`);
        if (!res.ok) return [];
        const json = await res.json();
        return (json.elements || []).map(el => {
          const t = el.tags || {};
          const lat = el.lat || (el.center && el.center.lat);
          const lng = el.lon || (el.center && el.center.lon);
          return {
            id: 'osm_' + el.id, name: t.name || '', province: _normProv(code),
            city: t['addr:city'] || '', region: t['addr:city'] || '',
            type: 'micro', lat: parseFloat(lat)||0, lng: parseFloat(lng)||0,
            address: [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' '),
            postal: t['addr:postcode'] || '', phone: t.phone || '',
            website: t.website || '', styles: '', founded: '',
            ocb_member: false, taproom: true, patio: false, kitchen: false,
            pet: false, tours: false, accessible: false,
            status: 'active', notes: 'OpenStreetMap',
            visited: false, visit_date: ''
          };
        }).filter(b => b.name && b.lat && b.lng);
      } catch { return []; }
    });

    const osmAll = (await Promise.all(fetches)).flat();
    const added = [];
    osmAll.forEach(o => {
      if (!isDuplicate(o, allBreweries) && !isDuplicate(o, added)) added.push(o);
    });

    if (added.length) {
      setCachedOSM(added);
      allBreweries = [...allBreweries, ...added];
      console.log(`✅ Added ${added.length} unique breweries from OpenStreetMap`);
      updateStats(); render(); updateDashboard();
      if (currentView === 'map') renderMap();
    }
  } catch(e) {
    console.warn('❌ Overpass fetch failed:', e);
  }
}

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

const OSM_CACHE_KEY = 'osmBreweriesCache';
function getCachedOSM() {
  try {
    const raw = localStorage.getItem(OSM_CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > US_CACHE_TTL) { localStorage.removeItem(OSM_CACHE_KEY); return null; }
    return data;
  } catch { return null; }
}

function setCachedOSM(data) {
  try { localStorage.setItem(OSM_CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

// NOTE: init() is called from main.js after all functions are loaded
