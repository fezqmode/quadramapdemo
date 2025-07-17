// map.js
document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {};

  // 1) load enriched JSON (must include eo_count, det_count, license_count, score)
  fetch('riskData_enriched.json')
    .then(r => {
      if (!r.ok) throw new Error('Risk data load failed: ' + r.status);
      return r.json();
    })
    .then(data => {
      riskData = data;
      drawCountries();
      addLegend();
    })
    .catch(err => console.error('Risk data error', err));

  // 2) draw GeoJSON
  function drawCountries() {
    fetch('custom.geo.json')
      .then(r => r.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: styleByScore,
          onEachFeature: bindFeatureEvents
        }).addTo(map);
      })
      .catch(err => console.error('GeoJSON load error', err));
  }

  // 3) style: compute a color from score: 0=green,100=red
  function styleByScore(feature) {
    const iso = feature.properties.iso_a3;
    const entry = riskData[iso] || {};
    const score = entry.score ?? 0;  // 0–100
    // linear interpolation between green (0) and red (100):
    const r = Math.round(255 * (score / 100));
    const g = Math.round(255 * (1 - score / 100));
    const fill = `rgb(${r},${g},0)`;

    return {
      fillColor:   fill,
      color:       '#333',
      weight:      1,
      fillOpacity: 0.7
    };
  }

  // 4) tooltip, hover, click
  function bindFeatureEvents(feature, layer) {
    const iso = feature.properties.iso_a3;
    const entry = riskData[iso] || {};
    const name = feature.properties.admin || feature.properties.ADMIN;
    const score = entry.score;

    // show name + score
    let tip = name;
    if (score != null) tip += ` — Score: ${score}`;
    layer.bindTooltip(tip, { sticky: true });

    layer.on('mouseover', () => {
      layer.setStyle({ weight: 3, fillOpacity: 0.9 });
      layer.bringToFront();
    });
    layer.on('mouseout',  () => {
      layer.setStyle(styleByScore(feature));
    });

    layer.on('click', () => {
      const url = entry.url;
      if (url) window.open(url, '_blank');
    });
  }

  // 5) legend (gradient bar)
  function addLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div','legend');
      div.innerHTML = `
        <div style="display:flex;align-items:center;">
          <span style="font-size:11px;">Low</span>
          <div style="
            flex:1;
            height:12px;
            margin: 0 6px;
            background: linear-gradient(to right,#0f0,#ff0,#f00);
            border:1px solid #333;
          "></div>
          <span style="font-size:11px;">High</span>
        </div>
        <small>Score 0 → 100</small>
      `;
      return div;
    };
    legend.addTo(map);
  }
});
