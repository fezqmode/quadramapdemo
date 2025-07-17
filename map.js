// map.js
document.addEventListener('DOMContentLoaded', () => {
  // 1. initialize map
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {};

  // 2. load original riskData.json
  fetch('riskData_enriched.json')
    .then(res => {
      if (!res.ok) throw new Error('Failed to load riskData.json: ' + res.status);
      return res.json();
    })
    .then(data => {
      riskData = data;
      drawCountries();
      addLegend();
    })
    .catch(err => console.error('Error loading riskData.json:', err));

  // 3. draw GeoJSON layer
  function drawCountries() {
    fetch('custom.geo.json')
      .then(res => res.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: styleByRisk,
          onEachFeature: setupFeature
        }).addTo(map);
      })
      .catch(err => console.error('Error loading custom.geo.json:', err));
  }

  // 4. style by risk field
  function styleByRisk(feature) {
    const iso = feature.properties.iso_a3 || feature.properties.ISO_A3 || '';
    const entry = riskData[iso] || { risk: 'low' };
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

  // 5. attach tooltip, hover & click
  function setupFeature(feature, layer) {
    const iso  = feature.properties.iso_a3 || feature.properties.ISO_A3 || '';
    const name = feature.properties.admin || feature.properties.ADMIN || iso;
    const entry= riskData[iso] || {};

    // simple tooltip with name + risk
    const riskLabel = entry.risk
      ? entry.risk.charAt(0).toUpperCase() + entry.risk.slice(1)
      : 'Unknown';
    layer.bindTooltip(`${name}<br>Risk: ${riskLabel}`, { sticky: true });

    layer.on('mouseover', () => {
      layer.setStyle({ weight:3, fillOpacity:0.8 });
      layer.bringToFront();
    });
    layer.on('mouseout', () => {
      layer.setStyle(styleByRisk(feature));
    });
    layer.on('click', () => {
      if (entry.url) window.open(entry.url, '_blank');
    });
  }

  // 6. add legend
  function addLegend() {
    const legend = L.control({ position:'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div','legend');
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
