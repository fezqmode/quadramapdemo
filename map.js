// map.js
document.addEventListener('DOMContentLoaded', () => {
  // 1) Initialize the map
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {};

  // 2) Load your riskData.json
  fetch('riskData.json')
    .then(res => {
      if (!res.ok) throw new Error('Failed to load riskData.json: ' + res.status);
      return res.json();
    })
    .then(data => {
      riskData = data;
      drawCountries();
      addLegend();
    })
    .catch(err => console.error('Risk data error', err));

  // 3) Draw & style countries
  function drawCountries() {
    fetch('custom.geo.json')
      .then(res => res.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: styleByRisk,
          onEachFeature: setupFeature
        }).addTo(map);
      })
      .catch(err => console.error('GeoJSON load error', err));
  }

  // 4) Style callback by risk
  function styleByRisk(feature) {
    const iso = feature.properties.iso_a3 || feature.properties.ISO_A3;
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

  // 5) Tooltip, hover and click
  function setupFeature(feature, layer) {
    const name = feature.properties.admin || feature.properties.ADMIN || 'Unknown';
    layer.bindTooltip(name, { sticky: true });

    layer.on('mouseover', () => {
      layer.setStyle({ weight: 3, fillOpacity: 0.8 });
      layer.bringToFront();
    });
    layer.on('mouseout', () => {
      layer.setStyle(styleByRisk(feature));
    });

    layer.on('click', () => {
      const iso = feature.properties.iso_a3 || feature.properties.ISO_A3;
      const entry = riskData[iso] || { url: '#' };
      if (entry.url && entry.url !== '#') {
        window.open(entry.url, '_blank');
      }
    });
  }

  // 6) Legend
  function addLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');
      div.innerHTML =
        '<i style="background:#ff0000"></i> High Risk<br>' +
        '<i style="background:#ffa500"></i> Medium Risk<br>' +
        '<i style="background:#00ff00"></i> Low Risk';
      return div;
    };
    legend.addTo(map);
  }
});
