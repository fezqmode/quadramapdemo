// map.js
document.addEventListener('DOMContentLoaded', () => {
  // 1) initialize map
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {};

  // 2) load per-country risk levels
  fetch('riskData.json')
    .then(res => res.ok ? res.json() : Promise.reject(res.status))
    .then(json => {
      riskData = json;
      drawCountries();
      addLegend();
    })
    .catch(err => console.error('Failed to load riskData.json:', err));

  // 3) draw countries layer
  function drawCountries() {
    fetch('custom.geo.json')
      .then(res => res.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: styleByRisk,
          onEachFeature: bindInteractions
        }).addTo(map);
      })
      .catch(err => console.error('Failed to load custom.geo.json:', err));
  }

  // 4) color by risk level
  function styleByRisk(feature) {
    const props = feature.properties;
    const iso = props.iso_a3 || props.ISO_A3 || '';
    const entry = riskData[iso] || 'low';
    const colors = { high: '#ff0000', medium: '#ffa500', low: '#00ff00' };
    const risk = typeof entry === 'string' ? entry : entry.risk;
    return {
      fillColor:   colors[risk] || colors.low,
      color:       '#333',
      weight:      1,
      fillOpacity: 0.6
    };
  }

  // 5) tooltip, highlight, click → landing page
  function bindInteractions(feature, layer) {
    const props = feature.properties;
    const iso   = props.iso_a3 || props.ISO_A3 || '';
    const name  = props.admin || props.ADMIN || iso;

    layer.bindTooltip(name, { sticky: true });

    layer.on('mouseover', () => {
      layer.setStyle({ weight: 3, fillOpacity: 0.8 });
      layer.bringToFront();
    });
    layer.on('mouseout', () => {
      layer.setStyle(styleByRisk(feature));
    });

    layer.on('click', () => {
      if (!iso) return;
      const url = `https://fezqmode.github.io/quadramapdemo/${iso}`;
      window.open(url, '_blank');
    });
  }

  // 6) legend
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
