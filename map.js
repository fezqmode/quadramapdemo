// map.js
document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {};

  // fetch original riskData.json
  fetch('riskData.json')
    .then(r => r.json())
    .then(data => {
      riskData = data;
      loadGeo();
      addLegend();
    })
    .catch(e => console.error('Failed loading riskData.json', e));

  function loadGeo() {
    fetch('custom.geo.json')
      .then(r => r.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: styleByRisk,
          onEachFeature: bindFeature
        }).addTo(map);
      })
      .catch(e => console.error('Failed loading custom.geo.json', e));
  }

  function styleByRisk(feat) {
    const iso = feat.properties.iso_a3 || feat.properties.ISO_A3;
    const entry = riskData[iso] || { risk: 'low' };
    const cols = { high:'#f00', medium:'#fa0', low:'#0f0' };
    return {
      fillColor:   cols[entry.risk] || cols.low,
      color:       '#333', weight:1, fillOpacity:0.6
    };
  }

  function bindFeature(feat, layer) {
    const name = feat.properties.ADMIN || feat.properties.admin || '–';
    layer.bindTooltip(name, { sticky:true });
    layer.on('mouseover', () => {
      layer.setStyle({ weight:3, fillOpacity:0.8 });
      layer.bringToFront();
    });
    layer.on('mouseout', () => layer.setStyle(styleByRisk(feat)));
    layer.on('click', () => {
      const iso = feat.properties.iso_a3 || feat.properties.ISO_A3;
      const url = (riskData[iso] && riskData[iso].url) || '#';
      if (url !== '#') window.open(url, '_blank');
    });
  }

  function addLegend() {
    const legend = L.control({ position:'bottomright' });
    legend.onAdd = () => {
      const d = L.DomUtil.create('div','legend');
      d.innerHTML =
        '<i style="background:#f00"></i> High Risk<br>' +
        '<i style="background:#fa0"></i> Medium Risk<br>' +
        '<i style="background:#0f0"></i> Low Risk';
      return d;
    };
    legend.addTo(map);
  }
});
