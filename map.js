// map.js
document.addEventListener('DOMContentLoaded', () => {
  // 1️⃣ Initialize the map
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {};
  let scoreMin = Infinity, scoreMax = -Infinity;

  // 2️⃣ Load enriched JSON (must include a numeric 'score' field)
  fetch('riskData_enriched.json')
    .then(res => {
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    })
    .then(data => {
      riskData = data;
      // compute min/max
      Object.values(riskData).forEach(e => {
        const s = Number(e.score);
        if (!isNaN(s)) {
          scoreMin = Math.min(scoreMin, s);
          scoreMax = Math.max(scoreMax, s);
        }
      });
      drawCountries();
      addGradientLegend();
    })
    .catch(err => console.error('Failed loading enriched JSON:', err));

  // 3️⃣ Draw GeoJSON layer
  function drawCountries() {
    fetch('custom.geo.json')
      .then(res => res.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: styleByScore,
          onEachFeature: attachInteractions
        }).addTo(map);
      })
      .catch(err => console.error('GeoJSON load failed:', err));
  }

  // 4️⃣ Style callback: map score → color
  function styleByScore(feature) {
    const iso = (feature.properties.iso_a3 || feature.properties.ISO_A3 || '').toUpperCase();
    const entry = riskData[iso] || {};
    const s = Number(entry.score);
    let fill = '#ccc';  // no data
    if (!isNaN(s) && scoreMax > scoreMin) {
      // hue from 120° (green) → 0° (red)
      const pct = (s - scoreMin) / (scoreMax - scoreMin);
      const hue = 120 * (1 - pct);
      fill = `hsl(${hue}, 100%, 50%)`;
    }
    return {
      fillColor:   fill,
      color:       '#333',
      weight:      1,
      fillOpacity: 0.7
    };
  }

  // 5️⃣ Interactions: tooltip, hover, click
  function attachInteractions(feature, layer) {
    const iso   = (feature.properties.iso_a3 || feature.properties.ISO_A3 || '').toUpperCase();
    const entry = riskData[iso] || {};
    const name  = feature.properties.admin || feature.properties.ADMIN || iso;
    const score = entry.score != null ? entry.score : '—';
    const eo    = entry.eo_count != null    ? entry.eo_count    : '—';
    const det   = entry.det_count != null   ? entry.det_count   : '—';
    const lic   = entry.license_count != null ? entry.license_count : '—';

    const html = `
      <strong>${name}</strong><br>
      Score: ${score}<br>
      EOs: ${eo} Dets: ${det} Licenses: ${lic}
    `;
    layer.bindTooltip(html, { sticky: true });

    layer.on('mouseover', () => {
      layer.setStyle({ weight: 3, fillOpacity: 0.9 });
      layer.bringToFront();
    });
    layer.on('mouseout', () => {
      layer.setStyle(styleByScore(feature));
    });
    layer.on('click', () => {
      if (entry.ofac_url) window.open(entry.ofac_url, '_blank');
    });
  }

  // 6️⃣ Legend: continuous gradient
  function addGradientLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend gradient-legend');
      // create a horizontal gradient bar via inline style
      div.innerHTML = `
        <div style="
          background: linear-gradient(to right,
            hsl(120,100%,50%),
            hsl(60,100%,50%),
            hsl(0,100%,50%));
          height: 10px;
          margin-bottom: 4px;
        "></div>
        <span>${scoreMin}</span>
        <span style="float:right">${scoreMax}</span>
      `;
      return div;
    };
    legend.addTo(map);
  }
});
