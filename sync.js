// ═══════════════════════════════════════════════════════
// SYNC.JS - Visited Tracking & Cloud Sync
// ═══════════════════════════════════════════════════════

const visitedSet = new Set(JSON.parse(localStorage.getItem('visitedBreweries') || '[]'));

function saveVisited() {
  localStorage.setItem('visitedBreweries', JSON.stringify([...visitedSet]));
}

async function toggleVisited(id, event) {
  event.stopPropagation();
  const brewery = allBreweries.find(b => b.id === id);
  if (!brewery) return;
  const isNowVisited = !visitedSet.has(id);
  if (isNowVisited) {
    visitedSet.add(id);          // save FIRST — don't let geocoding block it
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
  // Geocode in the background, wrapped so a failure can't break the check-in
  if (isNowVisited) {
    try { await autoGeocodeIfNeeded(brewery); } catch (e) { console.warn('geocode skipped:', e); }
  }
  if (USE_CLOUD_SYNC && API_URL !== 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') {
    await syncVisitedToCloud(brewery, isNowVisited);
  } else {
    updateSyncStatus(isNowVisited ? 'marked-local' : 'unmarked-local');
  }
}

async function syncVisitedToCloud(brewery, visited) {
  try {
    await fetch(API_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brewery: brewery.name,
        visited,
        province: brewery.province,
        city: brewery.city,
        address: brewery.address,
        postal: brewery.postal,
        phone: brewery.phone,
        website: brewery.website,
        lat: brewery.lat,
        lng: brewery.lng,
        id: brewery.id
      })
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
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

async function autoGeocodeIfNeeded(brewery) {
  if (brewery.lat === 0 || brewery.lng === 0) {
    // Use the brewery's actual country so US breweries aren't geocoded as Canadian.
    const country = isUSProvince(brewery.province) ? 'USA' : 'Canada';
    const queries = [
      brewery.address ? `${brewery.address}, ${brewery.city}, ${brewery.province}, ${country}` : null,
      `${brewery.name}, ${brewery.city}, ${brewery.province}, ${country}`,
      `${brewery.city}, ${brewery.province}, ${country}`
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

// True if the province code is actually a US state (from US_STATES in config.js).
function isUSProvince(code) {
  return typeof US_STATES !== 'undefined' && US_STATES.hasOwnProperty(code);
}

async function syncToGoogleSheets(brewery) {
  const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbwrgzLaGWHShxmPhNE1UB1TYjwN6IW4eWSFD7bpOm1-ERGP8HH8phoswJuWj5pFwUtWlw/exec';
  try {
    const url = `${SHEETS_API_URL}?action=sync&breweryName=${encodeURIComponent(brewery.name)}&lat=${brewery.lat}&lng=${brewery.lng}`;
    await fetch(url, { method: 'GET' });
  } catch {}
}
