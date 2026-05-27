// ═══════════════════════════════════════════════════════
// UI.JS - Rendering & Filter Functions
// ═══════════════════════════════════════════════════════

let activeFeats = new Set();

function filterBreweries() {
  render();
  if (currentView === 'map') renderMap();
}

// ── POPULATE PROVINCE DROPDOWN DYNAMICALLY ──────────────
function populateProvinceDropdown() {
  const sel = document.getElementById('provinceFilter');
  if (!sel) return;
  const current = sel.value;
  const provinceNames = {
    'ON': 'Ontario', 'BC': 'British Columbia', 'AB': 'Alberta', 'QC': 'Quebec',
    'MB': 'Manitoba', 'SK': 'Saskatchewan', 'NS': 'Nova Scotia', 'NB': 'New Brunswick',
    'PE': 'Prince Edward Island', 'NL': 'Newfoundland & Labrador',
    'AL': 'Alabama', 'NY': 'New York', 'PA': 'Pennsylvania', 'OH': 'Ohio',
    'KY': 'Kentucky', 'TN': 'Tennessee', 'WV': 'West Virginia', 'VA': 'Virginia',
    'NC': 'North Carolina', 'SC': 'South Carolina', 'GA': 'Georgia', 'FL': 'Florida'
  };
  const provinces = [...new Set(allBreweries.map(b => b.province).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">All Provinces/States</option>' +
    provinces.map(p => `<option value="${p}">${provinceNames[p] || p}</option>`).join('');
  sel.value = current;
}

function updateStats() {
  const total = allBreweries.length;
  const filtered = getFiltered().length;
  const visited = allBreweries.filter(b => visitedSet.has(b.id)).length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statShowing').textContent = filtered;
  document.getElementById('statVisited').textContent = visited;
  document.getElementById('countDisplay').textContent = filtered;

  populateProvinceDropdown(); // ← FIXES DROPDOWN
}

function updateVisitedStat() {
  const visited = allBreweries.filter(b => visitedSet.has(b.id)).length;
  document.getElementById('statVisited').textContent = visited;
}

function updateDashboard() {
  const visited = allBreweries.filter(b => visitedSet.has(b.id) && b.lat && b.lng);
  let totalKm = 0;
  for (let i = 1; i < visited.length; i++) {
    totalKm += haversine(visited[i-1].lat, visited[i-1].lng, visited[i].lat, visited[i].lng);
  }
  const provinces = new Set(visited.map(b => b.province).filter(Boolean));
  const dv = document.getElementById('dashVisited');
  const dk = document.getElementById('dashKm');
  const dp = document.getElementById('dashProvinces');
  if (dv) dv.textContent = visited.length;
  if (dk) dk.textContent = Math.round(totalKm).toLocaleString();
  if (dp) dp.textContent = provinces.size;
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
