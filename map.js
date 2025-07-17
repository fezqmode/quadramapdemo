// map.js
document.addEventListener('DOMContentLoaded', () => {
  // 1) Initialize the map
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {};

  // 2) Load enriched data
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
    .catch(err => console.error('Error loading enriched data:', err));

  // 3) Draw GeoJSON
  function drawCountries() {
    fetch('custom.geo.json')
      .then(res => res.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: styleByRisk,
          onEachFeature: bindFeature
        }).addTo(map);
      })
      .catch(err => console.error('Error loading GeoJSON:', err));
  }

  // 4) Style callback
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

  // 5) Bind tooltip, hover, click
  function bindFeature(feature, layer) {
    const iso   = feature.properties.iso_a3 || feature.properties.ISO_A3 || '';
    const name  = feature.properties.admin || feature.properties.ADMIN || iso;
    const entry = riskData[iso] || {};

    const riskLabel = entry.risk
      ? entry.risk.charAt(0).toUpperCase() + entry.risk.slice(1)
      : 'Unknown';
    const score        = entry.score        != null ? entry.score        : '—';
    const eo_count     = entry.eo_count     != null ? entry.eo_count     : '—';
    const det_count    = entry.det_count    != null ? entry.det_count    : '—';
    const license_count= entry.license_count!= null ? entry.license_count: '—';
    const eu_reg_count = entry.eu_reg_count != null ? entry.eu_reg_count : '—';
    const eu_dec_count = entry.eu_dec_count != null ? entry.eu_dec_count : '—';

    const html = `
      <strong>${name}</strong><br>
      Risk: <em>${riskLabel}</em><br>
      Score: <strong>${score}</strong><br>
      Executive Orders: ${eo_count}<br>
      Determinations: ${det_count}<br>
      Licenses: ${license_count}<br>
      EU Regs: ${eu_reg_count}<br>
      EU Decs: ${eu_dec_count}
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
      // opens detail page for this ISO
      window.open(`detail.html?iso=${iso}`, '_blank');
    });
  }

  // 6) Legend
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
