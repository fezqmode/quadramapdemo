// map.js
document.addEventListener('DOMContentLoaded', () => {
  // 1) initialize map
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {};

  // 2) load riskData.json
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
    .catch(err => console.error('Data load error:', err));

  // 3) draw GeoJSON layer
  function drawCountries() {
    fetch('custom.geo.json')
      .then(res => res.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: styleByFeature,
          onEachFeature: bindFeature
        }).addTo(map);
      })
      .catch(err => console.error('GeoJSON load error:', err));
  }

  // 4) style callback
  function styleByFeature(feature) {
    const iso = (feature.properties.ISO_A3 || feature.properties.iso_a3 || '').toUpperCase();
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

  // 5) interactions per feature
  function bindFeature(feature, layer) {
    const iso  = (feature.properties.ISO_A3 || feature.properties.iso_a3 || '').toUpperCase();
    const name = feature.properties.ADMIN || feature.properties.admin || iso;
    const ent  = riskData[iso] || {};

    // build tooltip html
    const tip = [
      `<strong>${name}</strong>`,
      `Risk: ${ent.risk ? ent.risk.charAt(0).toUpperCase()+ent.risk.slice(1) : '—'}`,
      `Score: ${ent.score != null ? ent.score : '—'}`,
      `EOs: ${ent.eo_count != null ? ent.eo_count : '—'}`,
      `Dets: ${ent.det_count != null ? ent.det_count : '—'}`,
      `Licenses: ${ent.license_count != null ? ent.license_count : '—'}`
    ].join('<br>');

    layer.bindTooltip(tip, { sticky: true });

    layer.on('mouseover', () => {
      layer.setStyle({ weight: 3, fillOpacity: 0.8 });
      layer.bringToFront();
    });
    layer.on('mouseout', () => {
      layer.setStyle(styleByFeature(feature));
    });
    layer.on('click', () => {
      if (ent.ofac_url) window.open(ent.ofac_url, '_blank');
    });
  }

  // 6) legend control
  function addLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');
      div.innerHTML = `
        <i style="background:#ff0000"></i> High<br>
        <i style="background:#ffa500"></i> Medium<br>
        <i style="background:#00ff00"></i> Low
      `;
      return div;
    };
    legend.addTo(map);
  }
});
