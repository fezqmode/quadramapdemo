// map.js
document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('mapid').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let riskData = {};

  // load the enriched JSON with {risk, score, url, …}
  fetch('riskData_enriched.json')
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load riskData_enriched.json (${res.status})`);
      return res.json();
    })
    .then(json => {
      riskData = json;
      drawCountries();
      addLegend();
    })
    .catch(err => console.error(err));

  function drawCountries() {
    fetch('custom.geo.json')
      .then(res => res.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: styleByScore,
          onEachFeature: bindEvents
        }).addTo(map);
      })
      .catch(err => console.error(err));
  }

  // map a score 0–100 to a HSL hue: 120 = green → 0 = red
  function scoreToColor(score = 0) {
    const hue = Math.max(0, Math.min(120, 120 - (score * 1.2)));
    return `hsl(${hue}, 100%, 50%)`;
  }

  function styleByScore(feature) {
    const iso = feature.properties.ISO_A3 || feature.properties.iso_a3;
    const entry = riskData[iso] || { score: 0 };
    return {
      fillColor:   scoreToColor(entry.score),
      color:       '#444',
      weight:      1,
      fillOpacity: 0.7
    };
  }

  function bindEvents(feature, layer) {
    const name = feature.properties.ADMIN || feature.properties.admin;
    const iso  = feature.properties.ISO_A3 || feature.properties.iso_a3;
    const entry = riskData[iso] || { score: 0, url: '#' };

    layer.bindTooltip(`${name}<br>Score: ${entry.score}`, {
      sticky: true,
      className: 'tooltip-score'
    });

    layer.on('mouseover', () => {
      layer.setStyle({ weight: 3, fillOpacity: 0.9 });
      layer.bringToFront();
    });
    layer.on('mouseout', () => {
      layer.setStyle(styleByScore(feature));
    });

    layer.on('click', () => {
      if (entry.url && entry.url !== '#') {
        window.open(entry.url, '_blank');
      }
    });
  }

  function addLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');
      div.innerHTML = `
        <i style="background:${scoreToColor(100)}"></i> 100 (max)<br>
        <i style="background:${scoreToColor(75)}"></i> 75<br>
        <i style="background:${scoreToColor(50)}"></i> 50<br>
        <i style="background:${scoreToColor(25)}"></i> 25<br>
        <i style="background:${scoreToColor(0)}"></i> 0 (min)
      `;
      return div;
    };
    legend.addTo(map);
  }
});
