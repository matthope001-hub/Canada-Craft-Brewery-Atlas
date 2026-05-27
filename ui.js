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

  const canadaNames = {
    'AB': 'Alberta', 'BC': 'British Columbia', 'MB': 'Manitoba',
    'NB': 'New Brunswick', 'NL': 'Newfoundland & Labrador', 'NS': 'Nova Scotia',
    'NT': 'Northwest Territories', 'NU': 'Nunavut', 'ON': 'Ontario',
    'PE': 'Prince Edward Island', 'QC': 'Quebec', 'SK': 'Saskatchewan', 'YT': 'Yukon'
  };
  const usNames = {
    'AL': 'Alabama', 'FL': 'Florida', 'GA': 'Georgia', 'KY': 'Kentucky',
    'NC': 'North Carolina', 'NY': 'New York', 'OH': 'Ohio', 'PA': 'Pennsylvania',
    'SC': 'South Carolina', 'TN': 'Tennessee', 'VA': 'Virginia', 'WV': 'West Virginia'
  };

  const allCodes = [...new Set(allBreweries.map(b => b.province).filter(Boolean))];
  const canadaCodes = allCodes.filter(p => canadaNames[p]).sort();
  const usCodes     = allCodes.filter(p => usNames[p]).sort();
  const otherCodes  = allCodes.filter(p => !canadaNames[p] && !usNames[p]).sort();

  let html = '<option value="">All Provinces/States</option>';
  if (canadaCodes.length) {
    html += '<optgroup label="🍁 Canada">';
    html += canadaCodes.map(p => `<option value="${p}">${canadaNames[p]}</option>`).join('');
    html += '</optgroup>';
  }
  if (usCodes.length) {
    html += '<optgroup label="🇺🇸 United States">';
    html += usCodes.map(p => `<option value="${p}">${usNames[p]}</option>`).join('');
    html += '</optgroup>';
  }
  if (otherCodes.length) {
    html += '<optgroup label="Other">';
    html += otherCodes.map(p => `<option value="${p}">${p}</option>`).join('');
    html += '</optgroup>';
  }

  sel.innerHTML = html;
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
