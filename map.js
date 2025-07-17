// map.js
document.addEventListener('DOMContentLoaded', () => {
  // Initialize map
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {};

  // Load risk data
  fetch('riskData.json')
    .then(res => res.json())
    .then(data => {
      riskData = data;
      drawCountries();
      addLegend();
    })
    .catch(err => console.error('Failed to load riskData.json', err));

  // Draw the GeoJSON layer
  function drawCountries() {
    fetch('custom.geo.json')
      .then(res => res.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: styleByRisk,
          onEachFeature: bindFeature
        }).addTo(map);
      })
      .catch(err => console.error('Failed to load custom.geo.json', err));
  }

  // Style callback
  function styleByRisk(feature) {
    const iso = feature.properties.iso_a3 || feature.properties.ISO_A3;
    const entry = riskData[iso] || { risk: 'low' };
    const colors = { high: '#ff0000', medium: '#ffa500', low: '#00ff00' };
    return {
      fillColor:   colors[entry.risk] || colors.low,
      color:       '#333',
      weight:      1,
      fillOpacity: 0.6
    };
  }

  // Bind tooltip, hover, click
  function bindFeature(feature, layer) {
    const name = feature.properties.ADMIN || feature.properties.admin || 'Unknown';
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
      const entry = riskData[iso] || {};
      if (entry.url) window.open(entry.url, '_blank');
    });
  }

  // Legend
  function addLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div','legend');
      div.innerHTML =
        '<i style="background:#ff0000"></i> High Risk<br>' +
        '<i style="background:#ffa500"></i> Medium Risk<br>' +
        '<i style="background:#00ff00"></i> Low Risk';
      return div;
    };
    legend.addTo(map);
  }
});
