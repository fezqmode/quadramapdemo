// map.js
document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {};

  // 1) Load the JSON of risk levels
  fetch('riskData.json')
    .then(r => {
      if (!r.ok) throw new Error('Risk data load failed: ' + r.status);
      return r.json();
    })
    .then(data => {
      riskData = data;
      drawCountries();
      addLegend();
    })
    .catch(err => console.error('Risk data error', err));

  // 2) Draw the GeoJSON layer
  function drawCountries() {
    fetch('custom.geo.json')
      .then(r => r.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: styleByRisk,
          onEachFeature: bindFeatureEvents
        }).addTo(map);
      })
      .catch(err => console.error('GeoJSON load error', err));
  }

  // style callback: fillColor by risk level
  function styleByRisk(feature) {
    // use the iso_a3 field from your GeoJSON
    const iso = feature.properties.iso_a3;
    const entry = riskData[iso] || { risk:'low', url:'#' };

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

  // attach tooltip, hover and click for each country
  function bindFeatureEvents(feature, layer) {
    // Tooltip on hover
    layer.bindTooltip(feature.properties.admin || feature.properties.ADMIN, { sticky: true });

    // Hover highlight
    layer.on('mouseover', () => {
      layer.setStyle({ weight: 3, fillOpacity: 0.8 });
      layer.bringToFront();
    });
    layer.on('mouseout', () => {
      layer.setStyle(styleByRisk(feature));
    });

    // Click → open details URL
    layer.on('click', () => {
      const iso = feature.properties.iso_a3;
      const entry = riskData[iso] || { url: '#' };
      if (entry.url && entry.url !== '#') {
        window.open(entry.url, '_blank');
      }
    });
  }

  // 3) Legend control
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
