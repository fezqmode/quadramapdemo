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

  // 3) Fetch and draw the GeoJSON
  function drawCountries() {
    fetch('custom.geo.json')
      .then(res => res.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: styleByRisk,
          onEachFeature: attachInteractions
        }).addTo(map);
      })
      .catch(err => console.error('GeoJSON load error', err));
  }

  // 4) Style callback: red/orange/green by risk
  function styleByRisk(feature) {
    const iso = feature.properties.iso_a3;   // correct property name
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

  // 5) Tooltip, hover highlight and click → URL
  function attachInteractions(feature, layer) {
    const name = feature.properties.admin;  // correct label property
    layer.bindTooltip(name, { sticky: true });

    layer.on('mouseover', () => {
      layer.setStyle({ weight: 3, fillOpacity: 0.8 });
      layer.bringToFront();
    });
    layer.on('mouseout', () => {
      layer.setStyle(styleByRisk(feature));
    });

    layer.on('click', () => {
      const iso = feature.properties.iso_a3;
      const entry = riskData[iso] || { url: '#' };
      if (entry.url !== '#') window.open(entry.url, '_blank');
    });
  }

  // 6) Legend matching these exact hex‐codes
  function addLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');
      div.innerHTML = `
        <i style="background:#ff0000;width:18px;height:18px;display:inline-block;margin-right:6px;"></i> High Risk<br>
        <i style="background:#ffa500;width:18px;height:18px;display:inline-block;margin-right:6px;"></i> Medium Risk<br>
        <i style="background:#00ff00;width:18px;height:18px;display:inline-block;margin-right:6px;"></i> Low Risk
      `;
      return div;
    };
    legend.addTo(map);
  }
});
