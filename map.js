// map.js
document.addEventListener('DOMContentLoaded', () => {
  // 1) initialize the map
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

  // 3) draw GeoJSON
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

  // 4) style by risk
  function styleByRisk(feature) {
    const props = feature.properties;
    const iso   = props.iso_a3 || props.ISO_A3 || '';
    const risk  = (riskData[iso] && riskData[iso].risk) ? riskData[iso].risk : 'low';
    const colors = { high:'#ff0000', medium:'#ffa500', low:'#00ff00' };
    return {
      fillColor:   colors[risk] || colors.low,
      color:       '#333',
      weight:      1,
      fillOpacity: 0.6
    };
  }

  // 5) tooltip now shows name + risk, plus hover & click
  function bindInteractions(feature, layer) {
    const props = feature.properties;
    const iso   = props.iso_a3 || props.ISO_A3 || '';
    const name  = props.admin  || props.ADMIN   || iso;
    const entry = riskData[iso] || { risk:'low', url:'#' };
    const risk  = entry.risk || 'low';

    // show name and risk in tooltip
    layer.bindTooltip(
      `<strong>${name}</strong><br>Risk: <em>${risk.charAt(0).toUpperCase() + risk.slice(1)}</em>`,
      { sticky: true }
    );

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
