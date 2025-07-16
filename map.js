// map.js
document.addEventListener('DOMContentLoaded', () => {
  // 1) initialize map
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {};

  // 2) load your riskData.json
  fetch('riskData.json')
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch riskData.json: ' + res.status);
      return res.json();
    })
    .then(data => {
      riskData = data;
      drawCountries();
      addLegend();
    })
    .catch(console.error);

  // 3) fetch and render GeoJSON
  function drawCountries() {
    fetch('custom.geo.json')
      .then(res => res.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: styleByRisk,
          onEachFeature: attachInteractions
        }).addTo(map);
      })
      .catch(console.error);
  }

  // 4) style callback using ISO_A3 / ADMIN
  function styleByRisk(feature) {
    const iso = feature.properties.ISO_A3;   // uppercase key
    const entry = riskData[iso] || { risk: 'low', url: '#' };
    const colors = {
      high:   '#ff0000',
      medium: '#ffa500',
      low:    '#00ff00'
    };
    return {
      fillColor:   colors[entry.risk] || colors.low,
      color:       '#333',
      weight:      1,
      fillOpacity: 0.6
    };
  }

  // 5) tooltip + hover + click → url
  function attachInteractions(feature, layer) {
    const name  = feature.properties.ADMIN;   // uppercase
    const iso   = feature.properties.ISO_A3;
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

  // 6) legend
  function addLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');
      div.innerHTML = `
        <i style="background:#ff0000;"></i> High Risk<br>
        <i style="background:#ffa500;"></i> Medium Risk<br>
        <i style="background:#00ff00;"></i> Low Risk
      `;
      return div;
    };
    legend.addTo(map);
  }
});
