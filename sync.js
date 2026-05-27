// ═══════════════════════════════════════════════════════
// SYNC.JS - Visited Tracking & Cloud Sync
// ═══════════════════════════════════════════════════════

const visitedSet = new Set(JSON.parse(localStorage.getItem('visitedBreweries') || '[]'));

function saveVisited() {
  localStorage.setItem('visitedBreweries', JSON.stringify([...visitedSet]));
}

async function toggleVisited(id, event) {
  if (event) event.stopPropagation();
  const brewery = allBreweries.find(b => b.id === id);
  if (!brewery) return;

  const isNowVisited = !visitedSet.has(id);
  if (isNowVisited) {
    visitedSet.add(id);
    brewery.visit_date = new Date().toISOString().split('T')[0];
  } else {
    visitedSet.delete(id);
    brewery.visit_date = '';
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

  // Geocode missing coords in background
  if (isNowVisited) {
    try { await autoGeocodeIfNeeded(brewery); } catch (e) { console.warn('geocode skipped:', e); }
  }

  // Sync to Google Sheet
  if (USE_CLOUD_SYNC && API_URL && API_URL !== 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') {
    await syncVisitedToCloud(brewery, isNowVisited);
  } else {
    updateSyncStatus(isNowVisited ? 'marked-local' : 'unmarked-local');
  }
}

async function syncVisitedToCloud(brewery, visited) {
  try {
    // Use GET with params — Apps Script doGet handles this without CORS issues
    const params = new URLSearchParams({
      action: 'mark_visited',
      brewery: brewery.name,
      visited: visited ? 'TRUE' : 'FALSE',
      province: brewery.province || '',
      city: brewery.city || '',
      address: brewery.address || '',
      postal: brewery.postal || '',
      phone: brewery.phone || '',
      website: brewery.website || '',
      lat: brewery.lat || '',
      lng: brewery.lng || '',
      id: brewery.id || ''
    });
    await fetch(`${API_URL}?${params.toString()}`, { method: 'GET' });
    updateSyncStatus(visited ? 'marked-cloud' : 'unmarked-cloud');
  } catch(e) {
    console.warn('Cloud sync failed:', e);
    updateSyncStatus('error');
  }
}

async function loadVisitedFromCloud() {
  if (!USE_CLOUD_SYNC || !API_URL || API_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') {
    updateDashboard();
    return;
  }
  try {
    const response = await fetch(`${API_URL}?action=get_visited`);
    const data = await response.json();
    if (data.success && data.visited && data.visited.length) {
      let changed = false;
      data.visited.forEach(v => {
        const brewery = allBreweries.find(b => b.name === v.name);
        if (brewery && !visitedSet.has(brewery.id)) {
          visitedSet.add(brewery.id);
          if (v.visit_date) brewery.visit_date = v.visit_date;
          changed = true;
        }
      });
      if (changed) {
        saveVisited();
        updateVisitedStat();
        updateDashboard();
        render();
      }
    }
  } catch(e) {
    console.warn('Could not load visited from cloud:', e);
    updateDashboard();
  }
}

function updateSyncStatus(status) {
  const messages = {
    'marked-local':   '✓ Marked visited (saved locally)',
    'unmarked-local': '✓ Unmarked (saved locally)',
    'marked-cloud':   '✓ Marked visited (synced to sheet)',
    'unmarked-cloud': '✓ Unmarked (synced to sheet)',
    'error':          '⚠️ Sync error — saved locally only'
  };
  const notification = document.createElement('div');
  notification.style.cssText = `
    position:fixed;bottom:90px;right:16px;
    background:${status.includes('cloud') ? '#28a745' : '#6c757d'};
    color:#fff;padding:10px 16px;border-radius:8px;
    box-shadow:0 2px 10px rgba(0,0,0,.25);z-index:10000;
    font-size:13px;font-family:sans-serif;
    animation:fadeIn .2s ease;`;
  notification.textContent = messages[status] || status;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 2500);
}

// ── AUTO-GEOCODE missing coords when a brewery is checked in ──
async function autoGeocodeIfNeeded(brewery) {
  if (brewery.lat && brewery.lat !== 0) return false;
  const country = isUSProvince(brewery.province) ? 'USA' : 'Canada';
  const queries = [
    brewery.address ? `${brewery.address}, ${brewery.city}, ${brewery.province}, ${country}` : null,
    `${brewery.name}, ${brewery.city}, ${brewery.province}, ${country}`,
    `${brewery.city}, ${brewery.province}, ${country}`
  ].filter(Boolean);

  for (const query of queries) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'BreweryAtlas/1.0' } }
      );
      if (!res.ok) continue;
      const results = await res.json();
      if (results.length) {
        brewery.lat = parseFloat(results[0].lat);
        brewery.lng = parseFloat(results[0].lon);
        await syncCoordsToSheet(brewery);
        return true;
      }
      await new Promise(r => setTimeout(r, 1000));
    } catch(e) { console.warn('Geocode attempt failed:', e); }
  }
  return false;
}

function isUSProvince(code) {
  return typeof US_STATES !== 'undefined' && US_STATES.hasOwnProperty(code);
}

async function syncCoordsToSheet(brewery) {
  if (!API_URL || API_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') return;
  try {
    await fetch(
      `${API_URL}?action=sync&breweryName=${encodeURIComponent(brewery.name)}&lat=${brewery.lat}&lng=${brewery.lng}`
    );
  } catch(e) { console.warn('Coord sync failed:', e); }
}
