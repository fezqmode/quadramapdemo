// map.js
document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {};

  // Load your riskData.json
  fetch('riskData.json')
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(json => {
      riskData = json;
      drawCountries();
      addLegend();
    })
    .catch(err => console.error('Error loading riskData.json:', err));

  function drawCountries() {
    fetch('custom.geo.json')
      .then(r => r.json())
      .then(geo => {
        // Log the first feature's property keys so you know which field holds the ISO code
        if (geo.features && geo.features.length) {
          console.log(
            'GeoJSON feature properties keys:',
            Object.keys(geo.features[0].properties)
          );
        }

        L.geoJSON(geo, {
          style: styleByRisk,
          onEachFeature: attachInteractions
        }).addTo(map);
      })
      .catch(err => console.error('Error loading custom.geo.json:', err));
  }

  function styleByRisk(feature) {
    const p = feature.properties;

    // Try the common ISO-A3 fields in order
    const iso = p.ISO_A3 || p.iso_a3 || p.ADM0_A3 || p.ADM0ISO || p.ISO3 || 'UNKNOWN';
    const entry = riskData[iso] || { risk: 'low', url: '#' };

    console.log(`Styling ${p.ADMIN||p.admin} (${iso}) →`, entry);

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

  function attachInteractions(feature, layer) {
    const p = feature.properties;
    const iso = p.ISO_A3 || p.iso_a3 || p.ADM0_A3 || p.ISO3 || 'UNKNOWN';
    const entry = riskData[iso] || {};

    layer.bindTooltip(p.ADMIN || p.admin, { sticky: true });

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
