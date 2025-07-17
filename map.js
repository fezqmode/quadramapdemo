// map.js
document.addEventListener('DOMContentLoaded', async () => {
  // initialize map
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // load enriched risk data
  let riskData;
  try {
    const res = await fetch('riskData_enriched.json');
    if (!res.ok) throw new Error(res.status);
    riskData = await res.json();
  } catch (e) {
    console.error('Could not load riskData_enriched.json', e);
    return;
  }

  // helper: interpolate between green and red
  function colorForScore(s) {
    const t = Math.max(0, Math.min(1, s / 100));
    // interpolate R,G,B
    const r = Math.round(0   + t * (255 - 0));
    const g = Math.round(255 - t * (255 - 0));
    const b = 0;
    return `rgb(${r},${g},${b})`;
  }

  // load geojson and draw
  fetch('custom.geo.json')
    .then(r => r.json())
    .then(geo => {
      L.geoJSON(geo, {
        style: feature => {
          const iso = feature.properties.iso_a3 || feature.properties.ISO_A3;
          const entry = riskData[iso] || { score: 0 };
          return {
            fillColor:   colorForScore(entry.score),
            color:       '#333',
            weight:      1,
            fillOpacity: 0.7
          };
        },
        onEachFeature: (feature, layer) => {
          const iso = feature.properties.iso_a3 || feature.properties.ISO_A3;
          const entry = riskData[iso] || {};
          const name = feature.properties.ADMIN || feature.properties.admin;
          const sc = entry.score || 0;
          const eo = entry.eo_count || 0;
          const de = entry.det_count || 0;
          const li = entry.license_count || 0;
          const url = entry.url || '#';
          // tooltip with breakdown
          layer.bindTooltip(`
            <strong>${name}</strong><br>
            Score: ${sc}<br>
            EO: ${eo}, Det: ${de}, Lic: ${li}
          `, { sticky: true });
          // hover effects
          layer.on('mouseover', () => {
            layer.setStyle({ weight: 3, fillOpacity: 0.9 });
            layer.bringToFront();
          });
          layer.on('mouseout', () => {
            layer.setStyle({
              fillColor: colorForScore(sc),
              weight: 1,
              fillOpacity: 0.7
            });
          });
          // click to landing page
          layer.on('click', () => {
            if (url && url !== '#') window.open(url, '_blank');
          });
        }
      }).addTo(map);
    })
    .catch(err => console.error('Failed to load GeoJSON', err));
});
