// ═══════════════════════════════════════════════════════
// CONFIG.JS - Configuration & Constants
// ═══════════════════════════════════════════════════════

const SHEET_ID = '1071nhgKo4kStR5KkikpWEq8LKKDnMqE7FOhp3wZv9dw';

const API_URL = 'https://script.google.com/macros/s/AKfycbwrgzLaGWHShxmPhNE1UB1TYjwN6IW4eWSFD7bpOm1-ERGP8HH8phoswJuWj5pFwUtWlw/exec';

const USE_CLOUD_SYNC = true;

const PROV_COLORS = {
  ON:'#E8672A', BC:'#2A7BE8', AB:'#D4A017', QC:'#C4392F',
  MB:'#8A3DBF', SK:'#1D9E6E', NB:'#D4681A', NS:'#C4293A',
  PE:'#A0522D', NL:'#3A5EC4',
  AL:'#9E1B32', NY:'#1565C0', PA:'#4527A0', OH:'#00838F',
  KY:'#558B2F', TN:'#6A1B9A', WV:'#37474F', VA:'#AD1457',
  NC:'#00695C', SC:'#4E342E', GA:'#BF360C', FL:'#0277BD'
};

const US_STATES = {
  AL:'Alabama', NY:'New York', PA:'Pennsylvania', OH:'Ohio',
  KY:'Kentucky', TN:'Tennessee', WV:'West Virginia', VA:'Virginia',
  NC:'North Carolina', SC:'South Carolina', GA:'Georgia', FL:'Florida'
};

const US_CACHE_KEY = 'usBreweriesCache';
const US_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// ── PROVINCE / STATE NORMALIZER ──────────────────────────
// The sheet has mixed formats: "NY" and "New York" both appear,
// "California" has no code, "MIssouri" has a typo, etc.
// This maps every variant to a single canonical 2-letter code so
// stats, filters, milestones, and the map all see one ON, one NY, etc.
const PROVINCE_NAME_TO_CODE = {
  // Canadian provinces & territories
  'alberta':'AB','british columbia':'BC','manitoba':'MB',
  'new brunswick':'NB','newfoundland':'NL','newfoundland and labrador':'NL',
  'newfoundland & labrador':'NL','nova scotia':'NS','ontario':'ON',
  'prince edward island':'PE','quebec':'QC','québec':'QC',
  'saskatchewan':'SK','yukon':'YT','northwest territories':'NT','nunavut':'NU',

  // US states (all 50 + DC)
  'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR',
  'california':'CA','colorado':'CO','connecticut':'CT','delaware':'DE',
  'district of columbia':'DC','washington dc':'DC','washington d.c.':'DC',
  'florida':'FL','georgia':'GA','hawaii':'HI','idaho':'ID','illinois':'IL',
  'indiana':'IN','iowa':'IA','kansas':'KS','kentucky':'KY','louisiana':'LA',
  'maine':'ME','maryland':'MD','massachusetts':'MA','michigan':'MI',
  'minnesota':'MN','mississippi':'MS','missouri':'MO','montana':'MT',
  'nebraska':'NE','nevada':'NV','new hampshire':'NH','new jersey':'NJ',
  'new mexico':'NM','new york':'NY','north carolina':'NC','north dakota':'ND',
  'ohio':'OH','oklahoma':'OK','oregon':'OR','pennsylvania':'PA',
  'rhode island':'RI','south carolina':'SC','south dakota':'SD',
  'tennessee':'TN','texas':'TX','utah':'UT','vermont':'VT','virginia':'VA',
  'washington':'WA','west virginia':'WV','wisconsin':'WI','wyoming':'WY'
};

function normalizeProvince(raw) {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';
  const key = trimmed.toLowerCase();
  // Full name → code
  if (PROVINCE_NAME_TO_CODE[key]) return PROVINCE_NAME_TO_CODE[key];
  // Already a 2-letter code → uppercase it
  if (/^[a-z]{2}$/i.test(trimmed)) return trimmed.toUpperCase();
  // International / unknown — return cleaned original (proper-case)
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

// ── SAMPLE DATA — shown if Sheet fails to load ──────────
// Add a few real breweries here as a fallback so the app
// never shows a blank screen.
const SAMPLE_DATA = [
  {
    id: 'sample_collective_arts',
    name: 'Collective Arts Brewing',
    legal_name: 'Collective Arts Brewing Co.',
    province: 'ON', city: 'Hamilton', region: 'Niagara & Hamilton',
    type: 'micro', lat: 43.2553, lng: -79.8692,
    address: '207 Burlington St E', postal: 'L8L 4H2',
    phone: '905-528-8017', website: 'https://collectiveartsbrewing.com',
    instagram: '@collectiveartsbrewing', facebook: 'collectivearts',
    founded: '2013', status: 'active',
    taproom: true, patio: true, kitchen: false, pet: true,
    tours: false, accessible: true, ocb_member: true,
    styles: 'IPA, Lager, Sour, Pale Ale',
    notes: 'Famous for artist-designed cans.',
    visited: false, visit_date: ''
  },
  {
    id: 'sample_steam_whistle',
    name: 'Steam Whistle Brewing',
    legal_name: 'Steam Whistle Brewing Inc.',
    province: 'ON', city: 'Toronto', region: 'Toronto',
    type: 'regional', lat: 43.6426, lng: -79.3899,
    address: '255 Bremner Blvd', postal: 'M5V 3M9',
    phone: '416-362-2337', website: 'https://steamwhistle.ca',
    instagram: '@steamwhistle', facebook: 'steamwhistle',
    founded: '2000', status: 'active',
    taproom: true, patio: true, kitchen: false, pet: false,
    tours: true, accessible: true, ocb_member: true,
    styles: 'Pilsner',
    notes: 'Iconic green bottles. Located in the historic Roundhouse.',
    visited: false, visit_date: ''
  },
  {
    id: 'sample_tofino',
    name: 'Tofino Brewing Co.',
    legal_name: 'Tofino Brewing Company Ltd.',
    province: 'BC', city: 'Tofino', region: 'Vancouver Island',
    type: 'micro', lat: 49.1529, lng: -125.9069,
    address: '681 Industrial Way', postal: 'V0R 2Z0',
    phone: '250-725-2899', website: 'https://tofinobrewing.com',
    instagram: '@tofinobrewing', facebook: 'tofinobrewing',
    founded: '2011', status: 'active',
    taproom: true, patio: true, kitchen: false, pet: true,
    tours: false, accessible: true, ocb_member: false,
    styles: 'IPA, Wheat, Lager, Pale Ale',
    notes: 'Surf-inspired brewery on Vancouver Island.',
    visited: false, visit_date: ''
  },
  {
    id: 'sample_dieu_du_ciel',
    name: 'Dieu du Ciel!',
    legal_name: 'Brasserie Dieu du Ciel! Inc.',
    province: 'QC', city: 'Montréal', region: 'Montréal',
    type: 'brewpub', lat: 45.5246, lng: -73.6001,
    address: '29 Laurier Ave W', postal: 'H2T 2N2',
    phone: '514-490-9555', website: 'https://dieuduciel.com',
    instagram: '@dieuduciel', facebook: 'dieuduciel',
    founded: '1998', status: 'active',
    taproom: true, patio: false, kitchen: true, pet: false,
    tours: false, accessible: false, ocb_member: false,
    styles: 'Stout, IPA, Porter, Saison',
    notes: 'One of Canada\'s most celebrated craft breweries.',
    visited: false, visit_date: ''
  },
  {
    id: 'sample_big_rock',
    name: 'Big Rock Brewery',
    legal_name: 'Big Rock Brewery Inc.',
    province: 'AB', city: 'Calgary', region: 'Calgary',
    type: 'regional', lat: 51.0278, lng: -114.0347,
    address: '5555 76 Ave SE', postal: 'T2C 4L8',
    phone: '403-720-3239', website: 'https://bigrockbeer.com',
    instagram: '@bigrockbrewery', facebook: 'bigrockbrewery',
    founded: '1985', status: 'active',
    taproom: true, patio: true, kitchen: true, pet: false,
    tours: true, accessible: true, ocb_member: false,
    styles: 'Traditional Ale, IPA, Lager, Stout',
    notes: 'One of Canada\'s original craft breweries.',
    visited: false, visit_date: ''
  }
];
