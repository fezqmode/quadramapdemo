// map.js
document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('mapid').setView([20,0],2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let countryColors = {};

  // Load your per-country color definitions
  fetch('countryColors.json')
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(json => {
      countryColors = json;
      drawMap();
      addLegend();
    })
    .catch(err => console.error('countryColors.json error:', err));

  function drawMap() {
    fetch('custom.geo.json')
      .then(r => r.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: styleByCountry,
          onEachFeature: bindInteractions
        }).addTo(map);
      })
      .catch(err => console.error('custom.geo.json error:', err));
  }

  function styleByCountry(feature) {
    // match whatever your GeoJSON uses — adjust if needed
    const iso = feature.properties.ISO_A3;   
    const entry = countryColors[iso];

    return {
      fillColor:   entry ? entry.color : '#cccccc',
      color:       '#333333',
      weight:      1,
      fillOpacity: 0.6
    };
  }

  function bindInteractions(feature, layer) {
    const iso = feature.properties.ISO_A3;
    const entry = countryColors[iso] || {};
    const name = feature.properties.ADMIN; 

    layer.bindTooltip(name, { sticky: true });
    layer.on('mouseover', () => {
      layer.setStyle({ weight: 3, fillOpacity: 0.8 });
      layer.bringToFront();
    });
    layer.on('mouseout',  () => {
      layer.setStyle(styleByCountry(feature));
    });
    layer.on('click', () => {
      if (entry.url) window.open(entry.url, '_blank');
    });
  }

  function addLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');
      // You can leave this blank or list a few examples:
      div.innerHTML = `
        <i style="background:#ff0000;"></i> USA, RUS, IRN<br>
        <i style="background:#00ff00;"></i> DEU, FRA<br>
        <i style="background:#cccccc;"></i> All others
      `;
      return div;
    };
    legend.addTo(map);
  }
});
