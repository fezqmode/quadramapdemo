// map.js
document.addEventListener('DOMContentLoaded', () => {
  // initialize map
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let sanctionLevels = {};

  // load sanction data first
  fetch('sancData.json')
    .then(res => {
      if (!res.ok) throw new Error('Failed to load sancData.json: ' + res.status);
      return res.json();
    })
    .then(data => {
      sanctionLevels = data;
      drawCountries();
      addLegend();
    })
    .catch(err => console.error(err));

  // draw GeoJSON with styling & popups
  function drawCountries() {
    fetch('custom.geo.json')
      .then(res => res.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: feature => {
            const iso = feature.properties.ISO_A3;
            const lvl = sanctionLevels[iso] || 'none';
            const colors = {
              full:   '#c00',  // red
              partial:'#fc0',  // yellow
              none:   '#0c0'   // green
            };
            return {
              fillColor: colors[lvl],
              color:     '#333',
              weight:    1,
              fillOpacity: 0.6
            };
          },
          onEachFeature: (feature, layer) => {
            layer.bindTooltip(feature.properties.ADMIN, {sticky: true});
            layer.on('click', () => {
              const iso = feature.properties.ISO_A3;
              const name = feature.properties.ADMIN;
              const lvl  = sanctionLevels[iso] || 'none';
              layer.bindPopup(
                `<h4>${name}</h4><b>Embargo level:</b> ${lvl}`
              ).openPopup();
            });
          }
        }).addTo(map);
      })
      .catch(err => console.error('Failed to load GeoJSON:', err));
  }

  // add a legend control
  function addLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');
      div.innerHTML = `
        <i style="background:#c00"></i> Full Embargo<br/>
        <i style="background:#fc0"></i> Partial Embargo<br/>
        <i style="background:#0c0"></i> No Embargo
      `;
      return div;
    };
    legend.addTo(map);
  }
});
