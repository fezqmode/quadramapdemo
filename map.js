// map.js
document.addEventListener('DOMContentLoaded', () => {
  // 1) init map
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {};
  let scoreMin = Infinity, scoreMax = -Infinity;

  // 2) load enriched riskData.json
  fetch('riskData.json')
    .then(r => {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(data => {
      riskData = data;
      // compute min/max scores
      Object.values(riskData).forEach(e => {
        const s = e.score || 0;
        if (s < scoreMin) scoreMin = s;
        if (s > scoreMax) scoreMax = s;
      });
      drawCountries();
      addLegend();
    })
    .catch(err => console.error('Risk data error', err));

  // 3) draw countries
  function drawCountries() {
    fetch('custom.geo.json')
      .then(r => r.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: styleByScore,
          onEachFeature: bindEvents
        }).addTo(map);
      })
      .catch(err => console.error('GeoJSON error', err));
  }

  // color from green (low) → red (high)
  function getColor(score) {
    if (scoreMax === scoreMin) return '#00ff00';
    const t = (score - scoreMin) / (scoreMax - scoreMin);
    const r = Math.round(255 * t);
    const g = Math.round(255 * (1 - t));
    return `rgb(${r},${g},0)`;
  }

  // style callback
  function styleByScore(feature) {
    const iso = feature.properties.iso_a3 || feature.properties.ISO_A3;
    const e   = riskData[iso] || {};
    const col = getColor(e.score || 0);
    return {
      fillColor:   col,
      color:       '#333',
      weight:      1,
      fillOpacity: 0.7
    };
  }

  // bind hover + click
  function bindEvents(feature, layer) {
    const name = feature.properties.admin || feature.properties.ADMIN || '—';
    const iso  = feature.properties.iso_a3 || feature.properties.ISO_A3;
    const e    = riskData[iso] || {};

    layer.bindTooltip(name, {sticky:true});

    layer.on('mouseover', ()=>{
      layer.setStyle({weight:3, fillOpacity:0.9});
      layer.bringToFront();
    });
    layer.on('mouseout', ()=>{
      layer.setStyle(styleByScore(feature));
    });

    // click → popup with metrics
    layer.on('click', () => {
      const eo  = e.eo_count    || 0;
      const de  = e.det_count   || 0;
      const li  = e.license_count || 0;
      const sc  = e.score       || 0;
      const url = e.ofac_url    || e.url || '#';

      layer.bindPopup(`
        <strong>${name} (${iso})</strong><br>
        <em>Score:</em> ${sc}<br>
        <em>EOs:</em> ${eo}, 
        <em>Dets:</em> ${de}, 
        <em>Licenses:</em> ${li}<br>
        <a href="${url}" target="_blank">More→</a>
      `).openPopup();
    });
  }

  // legend
  function addLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div','legend');
      div.innerHTML = `
        <i style="background:${getColor(scoreMax)}"></i> Highest Score<br>
        <i style="background:${getColor((scoreMin+scoreMax)/2)}"></i> Mid Score<br>
        <i style="background:${getColor(scoreMin)}"></i> Lowest Score
      `;
      return div;
    };
    legend.addTo(map);
  }
});
