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
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'Washington D.C.'
  };

  // Normalize full names back to codes
  const nameToCode = {};
  Object.entries(canadaNames).forEach(([k,v]) => nameToCode[v.toLowerCase()] = k);
  Object.entries(usNames).forEach(([k,v]) => nameToCode[v.toLowerCase()] = k);

  // Get unique normalized codes from all breweries
  const seen = new Set();
  allBreweries.forEach(b => {
    if (!b.province) return;
    const raw = String(b.province).trim();
    const code = nameToCode[raw.toLowerCase()] || raw.toUpperCase();
    seen.add(code);
  });

  const canadaCodes = [...seen].filter(p => canadaNames[p]).sort((a,b) => canadaNames[a].localeCompare(canadaNames[b]));
  const usCodes     = [...seen].filter(p => usNames[p]).sort((a,b) => usNames[a].localeCompare(usNames[b]));

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
