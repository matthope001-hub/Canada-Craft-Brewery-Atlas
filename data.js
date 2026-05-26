// ═══════════════════════════════════════════════════════
// DATA.JS - Data Loading Functions
// ═══════════════════════════════════════════════════════

// State variables
let allBreweries = [];
let currentView = 'grid';
let routeActive = false;
let routeLine = null;

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
    const usBreweries = rows.filter(b => b.name && (!b.status || b.status.toLowerCase() === 'active'));

    // Add sheet breweries (manual additions), then continue to also load API
    if (usBreweries.length > 0) {
      usBreweries.forEach(b => { if (b.visited) visitedSet.add(b.id); });
      allBreweries = [...allBreweries, ...usBreweries];
      console.log(`✅ Loaded ${usBreweries.length} US breweries from Sheet`);
      updateStats();
      render();
      updateDashboard();
      if (currentView === 'map') renderMap();
    } else {
      console.log('⚠️ US_Breweries sheet is empty');
    }
  } catch(e) {
    console.warn('⚠️ US_Breweries sheet load failed:', e);
  }

  // ── STEP 2: Also load from API (merges with sheet data above) ──────────
  const cached = getCachedUS();
  if (cached) {
    console.log(`📦 US cache hit — ${cached.length} breweries (skipping API calls)`);
    allBreweries = [...allBreweries, ...cached];
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
        id: 'us_' + b.id, name: b.name, province: code, city: b.city, region: b.state,
        type: b.brewery_type, lat: parseFloat(b.latitude) || 0, lng: parseFloat(b.longitude) || 0,
        address: b.street || '', postal: b.postal_code || '', phone: b.phone || '',
        website: b.website_url || '', styles: '', founded: '', ocb_member: false,
        taproom:true, patio:false, kitchen:false, pet:false, tours:false, accessible:false,
        status: 'active', notes: `Open Brewery DB · ${b.brewery_type}`
      })).filter(b => b.name && b.lat && b.lng);
    });

    const usBreweries = (await Promise.all(fetches)).flat();
    setCachedUS(usBreweries);
    allBreweries = [...allBreweries, ...usBreweries];
    console.log(`✅ Loaded ${usBreweries.length} US breweries from API — cached for 24h`);
    updateStats();
    render();
    if (currentView === 'map') renderMap();
  } catch(e) {
    console.warn('❌ US brewery API fetch failed:', e);
  }

  // ── STEP 3: Fill gaps from OpenStreetMap (Overpass) ──────────
  loadOverpassBreweries();
}

// ═══════════════════════════════════════════════════════
// OPENSTREETMAP / OVERPASS — fills gaps OBD misses
// ═══════════════════════════════════════════════════════
// Bounding boxes [south, west, north, east] per state for Overpass queries.
const STATE_BBOX = {
  NY:[40.50,-79.76,45.02,-71.86], PA:[39.72,-80.52,42.27,-74.69],
  OH:[38.40,-84.82,41.98,-80.52], KY:[36.50,-89.57,39.15,-81.96],
  TN:[34.98,-90.31,36.68,-81.65], WV:[37.20,-82.64,40.64,-77.72],
  VA:[36.54,-83.68,39.47,-75.24], NC:[33.84,-84.32,36.59,-75.46],
  SC:[32.03,-83.35,35.22,-78.54], GA:[30.36,-85.61,35.00,-80.84],
  FL:[24.40,-87.63,31.00,-80.03]
};

// Normalize a name for comparison: lowercase, strip punctuation and common suffixes
function normName(n) {
  return (n || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\b(brewing|brewery|breweries|company|co|llc|inc|the|taproom|beer|ales?|craft)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Is this OSM brewery already covered by an existing one?
// Duplicate if same normalized name AND within ~150m, OR exact normalized name match in same city.
function isDuplicate(osm, existing) {
  const osmN = normName(osm.name);
  if (!osmN) return true; // unnamed → skip
  return existing.some(b => {
    if (b.province !== osm.province) return false;
    const bN = normName(b.name);
    if (!bN) return false;
    const nameMatch = bN === osmN || bN.includes(osmN) || osmN.includes(bN);
    if (!nameMatch) return false;
    // name matches — confirm with proximity if both have coords
    if (b.lat && b.lng && osm.lat && osm.lng) {
      return haversine(b.lat, b.lng, osm.lat, osm.lng) < 0.15; // 150m
    }
    return true; // name matches and no coords to disprove
  });
}

async function loadOverpassBreweries() {
  try {
    const codes = Object.keys(STATE_BBOX);
    const fetches = codes.map(async code => {
      const [s,w,n,e] = STATE_BBOX[code];
      const q = `[out:json][timeout:25];(node["craft"="brewery"](${s},${w},${n},${e});way["craft"="brewery"](${s},${w},${n},${e}););out center tags;`;
      const endpoints = [
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass-api.de/api/interpreter'
      ];
      let json = null;
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method:'POST',
            headers:{'Content-Type':'application/x-www-form-urlencoded'},
            body:'data=' + encodeURIComponent(q)
          });
          if (!res.ok) continue;
          json = await res.json();
          break;
        } catch { /* try next endpoint */ }
      }
      if (!json) return [];
      try {
        return (json.elements || []).map(el => {
          const t = el.tags || {};
          const lat = el.lat || (el.center && el.center.lat);
          const lng = el.lon || (el.center && el.center.lon);
          return {
            id: 'osm_' + el.id, name: t.name || '', province: code,
            city: t['addr:city'] || '', region: t['addr:city'] || '',
            type: 'micro', lat: parseFloat(lat)||0, lng: parseFloat(lng)||0,
            address: [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' '),
            postal: t['addr:postcode'] || '', phone: t.phone || t['contact:phone'] || '',
            website: t.website || t['contact:website'] || '',
            styles:'', founded:'', ocb_member:false,
            taproom:true, patio:false, kitchen:false, pet:false, tours:false, accessible:false,
            status:'active', notes:'OpenStreetMap'
          };
        }).filter(b => b.name && b.lat && b.lng);
      } catch { return []; }
    });

    const osmAll = (await Promise.all(fetches)).flat();
    // Dedup against what we already loaded, and against each other
    const added = [];
    osmAll.forEach(o => {
      if (!isDuplicate(o, allBreweries) && !isDuplicate(o, added)) added.push(o);
    });

    if (added.length) {
      allBreweries = [...allBreweries, ...added];
      console.log(`✅ Added ${added.length} unique breweries from OpenStreetMap (skipped ${osmAll.length - added.length} duplicates)`);
      updateStats();
      render();
      updateDashboard();
      if (currentView === 'map') renderMap();
    } else {
      console.log(`OpenStreetMap: no new breweries (${osmAll.length} all duplicates)`);
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

// NOTE: init() is called from main.js after all functions are loaded
