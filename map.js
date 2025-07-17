// map.js
document.addEventListener('DOMContentLoaded', () => {
  // 1) initialize the map
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {};

  // 2) load your enriched riskData.json
  fetch('riskData_enriched.json')
    .then(res => {
      if (!res.ok) throw new Error('Failed to load riskData_enriched.json: ' + res.status);
      return res.json();
    })
    .then(data => {
      riskData = data;
      drawCountries();
      addLegend();
    })
    .catch(err => console.error('riskData_enriched.json error:', err));

  // 3) fetch & render GeoJSON
  function drawCountries() {
    fetch('custom.geo.json')
      .then(res => res.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: styleByRisk,
          onEachFeature: bindInteractions
        }).addTo(map);
      })
      .catch(err => console.error('custom.geo.json error:', err));
  }

  // 4) style each country by its risk value
  function styleByRisk(feature) {
    const iso   = feature.properties.iso_a3 || feature.properties.ISO_A3 || '';
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

  // 5) attach tooltip (now with numeric score), hover, click
  function bindInteractions(feature, layer) {
    const iso   = feature.properties.iso_a3 || feature.properties.ISO_A3 || '';
    const name  = feature.properties.admin || feature.properties.ADMIN || iso;
    const entry = riskData[iso] || { risk: 'low', score: 0, url: '#' };

    const riskLabel = entry.risk.charAt(0).toUpperCase() + entry.risk.slice(1);
    const score     = entry.score != null ? entry.score : '—';

    const html = `
      <strong>${name}</strong><br>
      Risk: <em>${riskLabel}</em><br>
      Score: <strong>${score}</strong>
    `;
    layer.bindTooltip(html, { sticky: true });

    layer.on('mouseover', () => {
      layer.setStyle({ weight: 3, fillOpacity: 0.8 });
      layer.bringToFront();
    });
    layer.on('mouseout', () => {
      layer.setStyle(styleByRisk(feature));
    });
    layer.on('click', () => {
      if (entry.url && entry.url !== '#') {
        window.open(entry.url, '_blank');
      }
    });
  }

  // 6) legend for high/medium/low
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
