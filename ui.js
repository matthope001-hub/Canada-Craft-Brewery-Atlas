// ═══════════════════════════════════════════════════════
// UI.JS - Rendering & Filter Functions
// ═══════════════════════════════════════════════════════

let activeFeats = new Set();

function filterBreweries() {
  render();
  if (currentView === 'map') renderMap();
}

function updateStats() {
  const total = allBreweries.length;
  const filtered = getFiltered().length;
  const visited = allBreweries.filter(b => visitedSet.has(b.id)).length;
  
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statShowing').textContent = filtered;
  document.getElementById('statVisited').textContent = visited;
  document.getElementById('countDisplay').textContent = filtered;
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
  document.getElementById('dashVisited').textContent = visited.length;
  document.getElementById('dashKm').textContent = Math.round(totalKm).toLocaleString();
  document.getElementById('dashProvinces').textContent = provinces.size;
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Add remaining UI functions (render, getFiltered, etc.) here
// This file would contain all your rendering logic
