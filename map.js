// map.js

document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('mapid').setView([20, 0], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // Simple CSV parser
  function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (!lines.length) return [];
    const hdr = lines[0].split(',');
    return lines.slice(1).map(line => {
      const vals = line.split(',');
      const row = {};
      hdr.forEach((h, i) => row[h.trim()] = (vals[i] || '').trim());
      return row;
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
        const entry = riskData[iso] || { score: 0, risk: 'low', eo: 0, det: 0, lic: 0, url: `https://fezqmode.github.io/quadramapdemo/${iso}` };
        let popup = `
          <strong>${f.properties.admin}</strong><br>
          <em>Risk score:</em> ${entry.score}<br>
          <em>Risk level:</em> ${entry.risk}<br>
          <em>Executive orders:</em> ${entry.eo}<br>
          <em>Determinations:</em> ${entry.det}<br>
          <em>Licenses:</em> ${entry.lic}<br>
          <a href="${entry.url}" target="_blank" rel="noopener">Country Program Page</a>
        `;
        layer.bindPopup(popup);

        // Make entire country clickable
        if (entry.url) {
          layer.on('click', function() {
            window.open(entry.url, '_blank');
          });
        }
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
  }).catch(err => {
    document.body.innerHTML = '<pre style="color:red;padding:2em;background:#fff;">Data load error: ' + err + '</pre>';
    console.error('Data load error:', err);
  });
});
