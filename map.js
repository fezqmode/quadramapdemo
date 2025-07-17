// map.js
document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {};

  // 1. Load enriched JSON (fall back to riskData.json)
  fetch('riskData_enriched.json')
    .then(res => {
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    })
    .catch(() => fetch('riskData.json').then(r => r.json()))
    .then(data => {
      riskData = data;
      drawCountries();
      addLegend();
    })
    .catch(err => console.error('Failed to load any risk data:', err));

  // 2. Draw countries
  function drawCountries() {
    fetch('custom.geo.json')
      .then(r => r.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: styleByRisk,
          onEachFeature: bindFeature
        }).addTo(map);
      })
      .catch(err => console.error('GeoJSON load failed:', err));
  }

  // 3. Color interpolation helper (green→red)
  function interpolateColor(minCol, maxCol, t) {
    const [r1,g1,b1] = minCol.match(/\w\w/g).map(x=>parseInt(x,16));
    const [r2,g2,b2] = maxCol.match(/\w\w/g).map(x=>parseInt(x,16));
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }

  // 4. Style by numeric score
  function styleByRisk(feature) {
    const iso = (feature.properties.iso_a3 || feature.properties.ISO_A3 || '').toUpperCase();
    const entry = riskData[iso] || {};
    const score = entry.score || 0;
    const maxScore = 100;                // adjust as needed
    const t = Math.min(score / maxScore, 1);
    return {
      fillColor:   interpolateColor('00ff00','ff0000', t),
      color:       '#333',
      weight:      1,
      fillOpacity: 0.6
    };
  }

  // 5. Tooltip, hover, click
  function bindFeature(feature, layer) {
    const iso = (feature.properties.iso_a3 || feature.properties.ISO_A3 || '').toUpperCase();
    const name = feature.properties.admin || feature.properties.ADMIN || iso;
    const ent  = riskData[iso] || {};

    const tooltipContent = `
      <strong>${name}</strong><br>
      Score: ${ent.score || 0}<br>
      OFAC EOs: ${ent.eo_count || 0}<br>
      OFAC Dets: ${ent.det_count || 0}<br>
      OFAC Licenses: ${ent.license_count || 0}<br>
      Sanctioned Entities: ${ent.open_sanctions_count || 0}
    `;
    layer.bindTooltip(tooltipContent, { sticky: true });

    layer.on('mouseover', () => {
      layer.setStyle({ weight: 3, fillOpacity: 0.8 });
      layer.bringToFront();
    });
    layer.on('mouseout', () => {
      layer.setStyle(styleByRisk(feature));
    });
    layer.on('click', () => {
      if (ent.ofac_url) window.open(ent.ofac_url, '_blank');
    });
  }

  // 6. Legend
  function addLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');
      div.innerHTML = `
        <i style="background: #ff0000"></i> High score<br>
        <i style="background: #ffff00"></i> Medium score<br>
        <i style="background: #00ff00"></i> Low score
      `;
      return div;
    };
    legend.addTo(map);
  }
});
