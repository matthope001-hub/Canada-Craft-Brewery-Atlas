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
  AL:'#9E1B32', NY:'#1565C0', PA:'#4527A0', OH:'#00838F', KY:'#558B2F', TN:'#6A1B9A',
  WV:'#37474F', VA:'#AD1457', NC:'#00695C', SC:'#4E342E', GA:'#BF360C', FL:'#0277BD'
};
const US_STATES = {
  AL:'Alabama', NY:'New York', PA:'Pennsylvania', OH:'Ohio', KY:'Kentucky', TN:'Tennessee',
  WV:'West Virginia', VA:'Virginia', NC:'North Carolina', SC:'South Carolina',
  GA:'Georgia', FL:'Florida'
};
const US_CACHE_KEY = 'usBreweriesCache';
const US_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
