// Vercel Serverless Function — proxies Overpass API requests server-side.
// Place at /api/overpass.js. Frontend calls /api/overpass?bbox=south,west,north,east

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

module.exports = async function handler(req, res) {
  const bbox = String(req.query.bbox || '').split(',').map(Number);
  if (bbox.length !== 4 || bbox.some(isNaN)) {
    res.status(400).json({ error: 'bbox must be "south,west,north,east"' });
    return;
  }
  const [s, w, n, e] = bbox;
  const query = `[out:json][timeout:60];(node["craft"="brewery"](${s},${w},${n},${e});way["craft"="brewery"](${s},${w},${n},${e}););out center tags;`;

  const diagnostics = [];
  for (const url of MIRRORS) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'CanadaCraftBreweryAtlas/1.0'
        },
        body: 'data=' + encodeURIComponent(query)
      });
      if (!r.ok) {
        const text = await r.text();
        diagnostics.push({ url, status: r.status, body: text.slice(0, 200) });
        continue;
      }
      const data = await r.json();
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
      res.status(200).json(data);
      return;
    } catch (err) {
      diagnostics.push({ url, error: String(err && err.message || err) });
    }
  }
  res.status(502).json({ error: 'All Overpass mirrors failed', diagnostics });
};
