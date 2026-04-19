#!/usr/bin/env node
// Géocode tous les commerçants actifs via OpenStreetMap (Nominatim)
// Usage: node scripts/geocode-merchants.js
// Coller le SQL généré dans le Supabase SQL Editor

const https = require('https');

const SUPABASE_URL = 'smvoupxtiilnhecgcxxh.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtdm91cHh0aWlsbmhlY2djeHhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc1OTYyOSwiZXhwIjoyMDc4MzM1NjI5fQ.6GlR7Zzq8EdpNJoIgbf94hvsmM678-IDR_q8q8Ls4PE';

function get(hostname, path, headers = {}) {
  return new Promise((resolve, reject) => {
    let data = '';
    https.get({ hostname, path, headers }, res => {
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
    }).on('error', reject);
  });
}

async function fetchMerchants() {
  return get(SUPABASE_URL, '/rest/v1/merchants?select=id,name,address&status=eq.active', {
    'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY,
  });
}

async function geocode(address) {
  const q = encodeURIComponent(address + ', Nice, France');
  const data = await get('nominatim.openstreetmap.org', '/search?q=' + q + '&format=json&limit=1', { 'User-Agent': 'ilestchouette-geocoder/1.0' });
  return data?.length > 0 ? { lat: data[0].lat, lon: data[0].lon } : null;
}

async function main() {
  const merchants = await fetchMerchants();
  if (!merchants?.length) { console.log('-- Aucun commerçant actif trouvé'); return; }
  console.log('-- Coller dans Supabase SQL Editor\n');
  for (const m of merchants) {
    await new Promise(r => setTimeout(r, 1200)); // respecter rate limit Nominatim
    const c = await geocode(m.address);
    if (c) console.log(`UPDATE merchants SET latitude=${c.lat}, longitude=${c.lon} WHERE id='${m.id}'; -- ${m.name}`);
    else    console.log(`-- ⚠️ Non trouvé : ${m.name} (${m.address})`);
  }
}

main().catch(console.error);
