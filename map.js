// map.js
document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('mapid').setView([20,0],2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {}, sanData = {};

  // 1) Load both JSON files in parallel
  Promise.all([
    fetch('riskData.json').then(r => r.ok ? r.json() : {}),
    fetch('sandata.json').then(r => r.ok ? r.json() : {})
  ]).then(([rData, sData]) => {
    riskData = rData;
    sanData  = sData;
    drawMap();
    addLegend();
  }).catch(err => console.error('JSON load error:', err));

  // 2) Draw GeoJSON layer
  function drawMap() {
    fetch('custom.geo.json')
      .then(r => r.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: styleByRisk,
          onEachFeature: addInteractions
        }).addTo(map);
      })
      .catch(err => console.error('GeoJSON load error:', err));
  }

  // 3) Determine risk level and return style
  function styleByRisk(feature) {
    const iso = feature.properties.ISO_A3 || feature.properties.iso_a3;
    let level;

    // 3a) If user‐defined riskData.json entry exists, use that
    if (riskData[iso] && riskData[iso].risk) {
      level = riskData[iso].risk;                 // "high", "low", "medium"
    }
    // 3b) Otherwise, check sanctions data
    else if (sanData[iso] === 'full') {
      level = 'high';
    }
    else if (sanData[iso] === 'partial') {
      level = 'medium';
    }
    // 3c) Fallback
    else {
      level = 'low';
    }

    const colors = {
      high:   '#ff0000',
      medium: '#ffa500',
      low:    '#00ff00'
    };

    return {
      fillColor:   colors[level],
      color:       '#333',
      weight:      1,
      fillOpacity: 0.6
    };
  }

  // 4) Tooltip, hover, click behavior
  function addInteractions(feature, layer) {
    const props = feature.properties;
    const iso   = props.ISO_A3 || props.iso_a3;
    const name  = props.ADMIN || props.admin;
    const entry = riskData[iso] || {};

    layer.bindTooltip(name, { sticky: true });

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

  // 5) Legend showing the three buckets
  function addLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div','legend');
      div.innerHTML = `
        <i style="background:#ff0000;"></i> High Risk<br>
        <i style="background:#ffa500;"></i> Medium Risk<br>
        <i style="background:#00ff00;"></i> Low Risk
      `;
      return div;
    };
    legend.addTo(map);
  }
});
