// map.js
document.addEventListener('DOMContentLoaded', () => {
  // 1) Initialize map
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {};

  // 2) Load the riskData.json
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

  // 3) Fetch GeoJSON and draw
  function drawMap() {
    fetch('custom.geo.json')
      .then(res => res.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: styleByRisk,
          onEachFeature: addInteractions
        }).addTo(map);
      })
      .catch(err => console.error('custom.geo.json error:', err));
  }

  // 4) Style function: discrete high/medium/low
  function styleByRisk(feature) {
    const iso = feature.properties.ISO_A3;   // match your GeoJSON field
    const entry = riskData[iso] || { risk: 'low', url: '#' };

    const colors = {
      high:   '#ff0000',  // red
      medium: '#ffa500',  // orange
      low:    '#00ff00'   // green
    };

    return {
      fillColor:   colors[entry.risk],
      color:       '#333',
      weight:      1,
      fillOpacity: 0.6
    };
  }

  // 5) Tooltip, hover highlight, click → URL
  function addInteractions(feature, layer) {
    const name = feature.properties.ADMIN;  // match your GeoJSON field
    layer.bindTooltip(name, { sticky: true });

    layer.on('mouseover', () => {
      layer.setStyle({ weight: 3, fillOpacity: 0.8 });
      layer.bringToFront();
    });
    layer.on('mouseout', () => {
      layer.setStyle(styleByRisk(feature));
    });

    layer.on('click', () => {
      const iso   = feature.properties.ISO_A3;
      const entry = riskData[iso] || { url: '#' };
      if (entry.url !== '#') window.open(entry.url, '_blank');
    });
  }

  // 6) Legend for High/Medium/Low
  function addLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');
      div.innerHTML = `
        <i style="background:#ff0000"></i> High Risk<br>
        <i style="background:#ffa500"></i> Medium Risk<br>
        <i style="background:#00ff00"></i> Low Risk
      `;
      return div;
    };
    legend.addTo(map);
  }
});
