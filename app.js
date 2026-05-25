// ═══════════════════════════════════════════════════════
// CONFIGURATION - UPDATE LOADUSBREWERIES FUNCTION
// ═══════════════════════════════════════════════════════

// Replace the existing loadUSBreweries() function in your app.js with this:

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
    usBreweries.forEach(b => { if (b.visited) visitedSet.add(b.id); });
    allBreweries = [...allBreweries, ...usBreweries];
    console.log(`✅ Loaded ${usBreweries.length} US breweries from Sheet`);
    updateStats();
    render();
    updateDashboard();
    if (currentView === 'map') renderMap();
    return;
  } catch(e) {
    console.warn('⚠️ US_Breweries sheet load failed, falling back to API:', e);
  }

  // ── STEP 2: Fallback to API if Sheet fails ──────────
  const cached = getCachedUS();
  if (cached) {
    console.log(`📦 US cache hit — ${cached.length} breweries (skipping API calls)`);
    allBreweries = [...allBreweries, ...cached];
    updateStats();
    render();
    if (currentView === 'map') renderMap();
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
}
