// map.js
document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {};

  // 1) load risk data
  fetch('riskData.json')
    .then(r => { if(!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => {
      riskData = data;
      drawCountries();
      addLegend();
    })
    .catch(err => console.error('Risk data error', err));

  // 2) draw & style countries
  function drawCountries() {
    fetch('custom.geo.json')
      .then(r => r.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: defaultStyle,
          onEachFeature: setupFeature
        }).addTo(map);
      })
      .catch(err => console.error(err));
  }

  // default fill based on risk
  function defaultStyle(feature) {
  const iso = feature.properties.ISO_A3;
  const entry = riskData[iso] || {risk:'low', url:'#'};

  // ← define your exact colors here
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
  function setupFeature(feature, layer) {
    // tooltip on hover
    layer.bindTooltip(feature.properties.ADMIN, {sticky:true});

    // highlight on mouseover
    layer.on('mouseover', () => {
      layer.setStyle({ weight: 3, fillOpacity: 0.8 });
      layer.bringToFront();
    });
    // reset on mouseout
    layer.on('mouseout',  () => {
      layer.setStyle(defaultStyle(feature));
    });

    // click → open detail page
    layer.on('click', () => {
      const iso = feature.properties.ISO_A3;
      const entry = riskData[iso] || {url:'#'};
      window.open(entry.url, '_blank');
    });
  }

  // 3) legend
  function addLegend() {
    const legend = L.control({position:'bottomright'});
    legend.onAdd = () => {
      const div = L.DomUtil.create('div','legend');
      div.innerHTML = `
        <i style="background:#c00"></i> High Risk<br>
        <i style="background:#fc0"></i> Medium Risk<br>
        <i style="background:#0c0"></i> Low Risk
      `;
      return div;
    };
    legend.addTo(map);
  }
});
