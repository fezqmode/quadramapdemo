// map.js

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize the map
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // 2. Helper: simple CSV parser
  function parseCSV(text) {
    const [headerLine, ...lines] = text.trim().split('\n');
    const headers = headerLine.split(',');
    return lines.map(line => {
      const cols = line.split(',');
      return headers.reduce((obj, h, i) => {
        obj[h] = cols[i];
        return obj;
      }, {});
    });
  }

  // 3. Helper: continuous green → red ramp for scores 0–100
  function colorFor(score) {
    const s = Math.max(0, Math.min(100, Number(score) || 0));
    const r = Math.round(255 * s / 100);
    const g = Math.round(255 * (100 - s) / 100);
    return `rgb(${r},${g},0)`;
  }

  // 4. Load GeoJSON, risk data, and OFAC metrics CSV in parallel
  Promise.all([
    fetch('custom.geo.json').then(r => {
      if (!r.ok) throw new Error('GeoJSON load failed');
      return r.json();
    }),
    fetch('riskData.json').then(r => {
      if (!r.ok) throw new Error('Risk data load failed');
      return r.json();
    }),
    fetch('ofac_programs_metrics.csv').then(r => {
      if (!r.ok) throw new Error('CSV load failed');
      return r.text();
    })
  ])
  .then(([geoData, riskData, csvText]) => {
    // 5. Build OFAC metrics lookup keyed by ISO3 code
    const metricsRows = parseCSV(csvText);
    const metricsByIso = {};
    metricsRows.forEach(row => {
      const iso = row['Program Name'].split('-')[0].trim().toUpperCase();
      metricsByIso[iso] = {
        eo:  Number(row.EO_Count) || 0,
        det: Number(row.Determination_Count) || 0,
        lic: Number(row.License_Count) || 0
      };
    });

    // 6. Draw choropleth layer
    L.geoJSON(geoData, {
      style(feature) {
        const iso = feature.properties.iso_a3;
        const entry = riskData[iso] || { score: 0 };
        return {
          fillColor:   colorFor(entry.score),
          color:       '#333',
          weight:      1,
          fillOpacity: 0.7
        };
      },
      onEachFeature(feature, layer) {
        const iso = feature.properties.iso_a3;
        const countryName = feature.properties.admin || 'Unknown';
        const entry = riskData[iso] || { score: 'n/a' };
        const m = metricsByIso[iso] || { eo: 0, det: 0, lic: 0 };
        layer.bindPopup(`
          <strong>${countryName}</strong><br>
          <em>Risk score:</em> ${entry.score}<br>
          <em>Executive orders:</em> ${m.eo}<br>
          <em>Determinations:</em> ${m.det}<br>
          <em>Licenses:</em> ${m.lic}
        `);
      }
    }).addTo(map);

    // 7. Add a legend control
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');
      const stops = [0, 20, 40, 60, 80, 100];
      stops.forEach((v, i) => {
        const next = stops[i + 1] !== undefined ? stops[i + 1] : 100;
        div.innerHTML += `
          <i style="background:${colorFor((v + next) / 2)}"></i>
          ${v}&ndash;${next}<br>
        `;
      });
      return div;
    };
    legend.addTo(map);

  })
  .catch(err => {
    console.error('Data load error:', err);
    alert('Failed to load map data: ' + err.message);
  });
});
