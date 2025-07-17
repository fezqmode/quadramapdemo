// map.js

document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // Simple CSV parser
  function parseCSV(text) {
    const [hdr, ...rows] = text.trim().split('\n');
    const cols = hdr.split(',');
    return rows.map(r => {
      const vals = r.split(',');
      return cols.reduce((o, h, i) => (o[h]=vals[i], o), {});
    });
  }

  // Green (0) → Red (100) ramp
  function colorFor(score) {
    const s = Math.max(0, Math.min(100, +score));
    const r = Math.round(255 * s/100);
    const g = Math.round(255 * (100-s)/100);
    return `rgb(${r},${g},0)`;
  }

  Promise.all([
    fetch('custom.geo.json').then(r => r.json()),
    fetch('riskData.json').then(r => r.json()),
    fetch('ofac_programs_metrics.csv').then(r => r.text())
  ]).then(([geo, riskData, csv]) => {
    // Build metrics lookup by ISO3
    const metrics = parseCSV(csv);
    const byIso = {};
    metrics.forEach(m => {
      // assume Program Name like "Afghanistan-Related Sanctions"
      const iso = m['Program Name'].split('-')[0].trim().toUpperCase();
      byIso[iso] = {
        eo:  +m.EO_Count,
        det: +m.Determination_Count,
        lic: +m.License_Count
      };
    });

    // Draw choropleth
    L.geoJSON(geo, {
      style(f) {
        const iso = f.properties.iso_a3;
        const entry = riskData[iso] || { score: 0 };
        return {
          fillColor:   colorFor(entry.score),
          color:       '#333',
          weight:      1,
          fillOpacity: 0.7
        };
      },
      onEachFeature(f, layer) {
        const iso = f.properties.iso_a3;
        const entry = riskData[iso] || { score: 'n/a' };
        const m = byIso[iso] || {eo:0,det:0,lic:0};
        layer.bindPopup(`
          <strong>${f.properties.admin}</strong><br>
          <em>Risk score:</em> ${entry.score}<br>
          <em>Executive orders:</em> ${m.eo}<br>
          <em>Determinations:</em> ${m.det}<br>
          <em>Licenses:</em> ${m.lic}
        `);
      }
    }).addTo(map);

    // Legend
    const legend = L.control({position:'bottomright'});
    legend.onAdd = () => {
      const div = L.DomUtil.create('div','legend');
      const stops = [0,20,40,60,80,100];
      stops.forEach((v,i)=> {
        const nxt = stops[i+1]===undefined ? 100 : stops[i+1];
        div.innerHTML +=
          `<i style="background:${colorFor((v+nxt)/2)}"></i> ${v}&ndash;${nxt}<br>`;
      });
      return div;
    };
    legend.addTo(map);
  }).catch(err => console.error('Data load error:', err));
});
