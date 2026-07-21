import { createClient } from '@supabase/supabase-js';
const s = createClient(
  'https://btcwmuyemmkiteqlopce.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0Y3dtdXllbW1raXRlcWxvcGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NzIxMTIsImV4cCI6MjA2MjQ0ODExMn0.NYTXODd9HEglk4b1RKOt1XyrGMiOOs4ltfFyeZknfBE'
);
const digits = (x) => (x||'').toString().replace(/\D/g,'');
const normEmail = (x) => (x||'').toString().trim().toLowerCase();

// Pull all booked_call
let bcAll = [];
let f = 0;
while (true) {
  const { data } = await s.from('booked_call')
    .select('id, email, telefono, venditore, stato, created_at, market')
    .range(f, f + 999);
  if (!data || data.length === 0) break;
  bcAll = bcAll.concat(data);
  if (data.length < 1000) break;
  f += 1000;
}
console.log(`Total booked_call: ${bcAll.length}`);

// For each bc, find lead_generation with matching email/tel that was created AFTER bc within tolerance
const WINDOW_MINUTES = [5, 15, 30, 60, 24*60];
const results = Object.fromEntries(WINDOW_MINUTES.map(w => [w, []]));

let checked = 0;
for (const bc of bcAll) {
  checked++;
  if (checked % 500 === 0) console.error(`${checked}/${bcAll.length}`);
  const bcTime = new Date(bc.created_at).getTime();
  const bcEmail = normEmail(bc.email);
  const bcPhone = digits(bc.telefono);
  if (!bcEmail && !bcPhone) continue;

  // Query lead_generation rows created in the widest window
  const windowMs = WINDOW_MINUTES[WINDOW_MINUTES.length - 1] * 60000;
  const from = new Date(bcTime).toISOString();
  const to = new Date(bcTime + windowMs).toISOString();
  let q = s.from('lead_generation')
    .select('id, email, telefono, created_at, venditore, campagna, ultima_fonte')
    .gte('created_at', from)
    .lte('created_at', to);
  if (bcEmail) q = q.ilike('email', bcEmail);
  else if (bcPhone) q = q.ilike('telefono', `%${bcPhone.slice(-9)}%`);
  const { data: leads } = await q;
  if (!leads || leads.length === 0) continue;

  // Verify actual match (client-side, phone with digit normalization)
  for (const lead of leads) {
    const le = normEmail(lead.email);
    const lp = digits(lead.telefono);
    if (!(bcEmail && le === bcEmail) && !(bcPhone && lp === bcPhone)) continue;
    const deltaMin = (new Date(lead.created_at).getTime() - bcTime) / 60000;
    if (deltaMin < 0) continue; // lead entered BEFORE bc — skip (that's the normal flow)
    for (const w of WINDOW_MINUTES) {
      if (deltaMin <= w) {
        results[w].push({
          bc_id: bc.id,
          lead_id: lead.id,
          email: bcEmail || lead.email,
          bc_time: bc.created_at,
          lead_time: lead.created_at,
          delta_min: +deltaMin.toFixed(1),
          bc_venditore: bc.venditore,
          lead_venditore: lead.venditore,
          lead_campagna: lead.campagna,
        });
        break; // one bucket only (smallest)
      }
    }
  }
}

console.log(`\n=== FREQUENZA CASO KLARISSA (bc PRIMA del lead) ===`);
let cum = 0;
for (const w of WINDOW_MINUTES) {
  cum += results[w].length;
  const label = w < 60 ? `${w} min` : (w < 1440 ? `${w/60} ore` : `${w/1440} giorni`);
  console.log(`  ≤ ${label.padEnd(8)}: ${results[w].length.toString().padStart(4)} casi (cum: ${cum})`);
}

console.log(`\n=== ESEMPI ≤15 min ===`);
for (const r of results[15].slice(0, 15)) {
  console.log(`  ${r.email.substring(0,30).padEnd(30)}  bc→lead in ${String(r.delta_min).padEnd(5)}min  bc_v=${r.bc_venditore}  lead_v=${r.lead_venditore}  camp=${r.lead_campagna}`);
}

// Save full
import fs from 'fs';
const all = [];
for (const w of WINDOW_MINUTES) for (const r of results[w]) all.push({...r, bucket: w});
fs.writeFileSync('/Users/matteonicolanebbioso/Desktop/booked_before_lead_scan.json', JSON.stringify(all, null, 2));
console.log(`\nSaved: ~/Desktop/booked_before_lead_scan.json (${all.length} righe)`);
