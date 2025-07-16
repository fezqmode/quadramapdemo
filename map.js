// map.js (with debug logging)
document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {};

  // 1) Load riskData.json
  fetch('riskData.json')
    .then(res => {
      if (!res.ok) throw new Error('Failed to load riskData.json: ' + res.status);
      return res.json();
    })
    .then(data => {
      riskData = data;
      drawMap();
      addLegend();
    })
    .catch(err => console.error('riskData.json error:', err));

  // 2) Fetch & render GeoJSON
  function drawMap() {
    fetch('custom.geo.json')
      .then(res => res.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: styleByRisk,
          onEachFeature: attachInteractions
        }).addTo(map);
      })
      .catch(err => console.error('custom.geo.json error:', err));
  }

  // 3) Style callback with console logging
  function styleByRisk(feature) {
    // **Use uppercase** ISO_A3 from your GeoJSON
    const iso = feature.properties.ISO_A3;
    const name = feature.properties.ADMIN;
    const entry = riskData[iso];

    // Debug log
    console.log(`Country: ${name} | ISO: ${iso} | riskData entry:`, entry);

    // If we don’t have a matching entry, fall back to LOW
    const risk = entry && entry.risk ? entry.risk : 'low';

    const colors = {
      high:   '#ff0000',
      medium: '#ffa500',
      low:    '#00ff00'
    };

    return {
      fillColor:   colors[risk] || '#ff0000',  // missing → red
      color:       '#333',
      weight:      1,
      fillOpacity: 0.6
    };
  }

  // 4) Tooltip, hover highlight, click → URL
  function attachInteractions(feature, layer) {
    const iso = feature.properties.ISO_A3;
    const name = feature.properties.ADMIN;
    const entry = riskData[iso] || {};

    layer.bindTooltip(name, { sticky: true });

    layer.on('mouseover', () => {
      layer.setStyle({ weight: 3, fillOpacity: 0.8 });
      layer.bringToFront();
    });
    layer.on('mouseout', () => {
      layer.setStyle(styleByRisk(feature));
    });

    layer.on('click', () => {
      if (entry.url) window.open(entry.url, '_blank');
    });
  }

  // 5) Simple legend
  function addLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');
      div.innerHTML = `
        <i style="background:#ff0000;width:18px;height:18px;display:inline-block;margin-right:6px;"></i> High<br>
        <i style="background:#ffa500;width:18px;height:18px;display:inline-block;margin-right:6px;"></i> Medium<br>
        <i style="background:#00ff00;width:18px;height:18px;display:inline-block;margin-right:6px;"></i> Low
      `;
      return div;
    };
    legend.addTo(map);
  }
});
