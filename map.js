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
    .catch(err => console.error('Risk data error', err));

  // 3) draw & style countries
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

  // style callback: fills by risk level
  function styleByRisk(feature) {
    // try both common ISO props just in case
    const iso = feature.properties.iso_a3 || feature.properties.ISO_A3;
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

  // hover + click logic per feature
  function bindFeatureEvents(feature, layer) {
    // tooltip on hover
    layer.bindTooltip(feature.properties.admin || feature.properties.ADMIN, { sticky: true });

    // highlight on mouseover
    layer.on('mouseover', () => {
      layer.setStyle({ weight: 3, fillOpacity: 0.8 });
      layer.bringToFront();
    });
    // reset on mouseout
    layer.on('mouseout',  () => {
      layer.setStyle(styleByRisk(feature));
    });

    // click → open detail page
    layer.on('click', () => {
      const iso = feature.properties.iso_a3 || feature.properties.ISO_A3;
      const entry = riskData[iso] || {};
      if (entry.url && entry.url !== '#') {
        window.open(entry.url, '_blank');
      }
    });
  }

  // 4) legend
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
